<?php
/**
 * Author:          Andrei Baicus <andrei@themeisle.com>
 * Created on:      05/09/2018
 *
 * @package ReMe\Compatibility
 */

namespace ReMe\Compatibility;

use ReMe\Core\Dynamic_Css;
use ReMe\Core\Settings\Config;
use ReMe\Core\Settings\Mods;

/**
 * Class Elementor
 *
 * @package ReMe\Compatibility
 */
class Elementor extends Page_Builder_Base {
	/**
	 * Custom global colors theme mod value
	 *
	 * @var array|null
	 */
	private static $custom_global_colors = null;

	/**
	 * Init function.
	 */
	public function init() {
		if ( ! defined( 'ELEMENTOR_VERSION' ) ) {
			return;
		}

		self::$custom_global_colors = self::$custom_global_colors ?? Mods::get( Config::MODS_GLOBAL_CUSTOM_COLORS, [] );

		add_filter( 'reme_dynamic_style_output', array( $this, 'fix_links' ), 99, 2 );
		add_action( 'wp', array( $this, 'add_theme_builder_hooks' ) );
		add_action( 'elementor/editor/before_enqueue_scripts', array( $this, 'maybe_set_page_template' ), 1 );
		add_filter( 'rest_request_after_callbacks', [ $this, 'alter_global_colors_in_picker' ], 999, 3 );
		add_filter( 'rest_request_after_callbacks', [ $this, 'alter_global_colors_front_end' ], 999, 3 );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue' ), 100 );
		add_action( 'elementor/theme/register_locations', array( $this, 'register_elementor_locations' ) );
		add_filter( 'elementor/document/config', array( $this, 'elementor_document_config' ), 10, 2 );
	}

	/**
	 * Register Elementor locations.
	 * 
	 * @since 4.1 
	 * 
	 * @see https://developers.elementor.com/docs/themes/migrating-themes-with-hooks/
	 * 
	 * @param \ElementorPro\Modules\ThemeBuilder\Classes\Locations_Manager $elementor_theme_manager Elementor object.
	 */
	public function register_elementor_locations( $elementor_theme_manager ) {
		$elementor_theme_manager->register_location(
			'header',
			[
				'hook'         => 'reme_do_header',
				'remove_hooks' => [ 'hfg_header_render' ],
			]
		);
		$elementor_theme_manager->register_location(
			'footer',
			[
				'hook'         => 'reme_do_footer',
				'remove_hooks' => [ 'hfg_footer_render' ],
			]
		);
	}

	/**
	 * Enqueue Global Colors
	 */
	public function enqueue() {
		$colors = $this->get_current_palette_colors();
		$css    = ':root{';
		foreach ( $colors as $slug => $color ) {
			$css .= '--e-global-color-' . str_replace( '-', '', $slug ) . ':' . $color . ';';
		}
		$css .= '}';
		/**
		 * Filters the css with base vars for elementor colors.
		 *
		 * @param string $css Single post page components.
		 *
		 * @since 3.1.0
		 */
		$css = apply_filters( 'reme_elementor_colors', $css );
		$css = wp_strip_all_tags( Dynamic_Css::minify_css( $css ) );
		wp_add_inline_style( 'reme-style', $css );
	}

	/**
	 * Filter rest responses to add ReMe Palette Colors to pages using Elementor.
	 *
	 * @param \WP_REST_Response|\WP_Error $response request response.
	 * @param array                       $handler request handler.
	 * @param \WP_REST_Request            $request rest request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function alter_global_colors_front_end( $response, $handler, \WP_REST_Request $request ) {
		$route = $request->get_route();

		// Elementor never knows ReMe IDs, so not-found is expected on the colors route.
		$is_color_not_found = is_wp_error( $response )
			&& 'global_not_found' === $response->get_error_code()
			&& 0 === strpos( $route, '/elementor/v1/globals/colors/' );

		if ( is_wp_error( $response ) && ! $is_color_not_found ) {
			return $response;
		}

		$rest_to_slugs = [
			'rmprimaryaccent'   => 'rm-primary-accent',
			'rmsecondaryaccent' => 'rm-secondary-accent',
			'rmsitebg'          => 'rm-site-bg',
			'rmlightbg'         => 'rm-light-bg',
			'rmdarkbg'          => 'rm-dark-bg',
			'rmtextcolor'       => 'rm-text-color',
			'rmtextdarkbg'      => 'rm-text-dark-bg',
			'rmc1'              => 'rm-c-1',
			'rmc2'              => 'rm-c-2',
		];

		// introduce custom global colors
		foreach ( array_keys( self::$custom_global_colors ) as $slug ) {
			$rest_to_slugs[ str_replace( '-', '', $slug ) ] = $slug;
		}

		$rest_id = substr( $route, strrpos( $route, '/' ) + 1 );

		if ( ! in_array( $rest_id, array_keys( $rest_to_slugs ), true ) ) {
			return $response;
		}

		$colors   = $this->get_current_palette_colors();
		$response = new \WP_REST_Response(
			[
				'id'    => esc_attr( $rest_id ),
				'title' => $this->get_global_color_prefix() . esc_html( $rest_to_slugs[ $rest_id ] ),
				'value' => reme_sanitize_colors( $colors[ $rest_to_slugs[ $rest_id ] ] ),
			]
		);
		return $response;
	}

	/**
	 * Filter rest responses to add ReMe Palette Colors to Elementor.
	 *
	 * @param \WP_REST_Response|\WP_Error $response request response.
	 * @param array                       $handler request handler.
	 * @param \WP_REST_Request            $request rest request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function alter_global_colors_in_picker( $response, $handler, \WP_REST_Request $request ) {
		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$route = $request->get_route();

		if ( $route !== '/elementor/v1/globals' ) {
			return $response;
		}

		$label_map = [
			'rm-primary-accent'   => __( 'Primary Accent', 'reme' ),
			'rm-secondary-accent' => __( 'Secondary Accent', 'reme' ),
			'rm-site-bg'          => __( 'Site Background', 'reme' ),
			'rm-light-bg'         => __( 'Light Background', 'reme' ),
			'rm-dark-bg'          => __( 'Dark Background', 'reme' ),
			'rm-text-color'       => __( 'Text Color', 'reme' ),
			'rm-text-dark-bg'     => __( 'Text Dark Background', 'reme' ),
			'rm-c-1'              => __( 'Extra Color 1', 'reme' ),
			'rm-c-2'              => __( 'Extra Color 2', 'reme' ),
		];

		foreach ( self::$custom_global_colors as $slug => $args ) {
			$label_map[ $slug ] = $args['label'];
		}

		$colors = $this->get_current_palette_colors();
		$data   = $response->get_data();

		foreach ( $colors as $slug => $color_value ) {
			$no_hyphens                    = str_replace( '-', '', $slug );
			$data['colors'][ $no_hyphens ] = [
				'id'    => esc_attr( $no_hyphens ),
				'title' => $this->get_global_color_prefix() . esc_html( $label_map[ $slug ] ),
				'value' => reme_sanitize_colors( $color_value ),
			];
		}

		$response->set_data( $data );

		return $response;
	}

	/**
	 * Add support for elementor theme locations.
	 */
	public function add_theme_builder_hooks() {
		if ( ! class_exists( '\ElementorPro\Modules\ThemeBuilder\Module', false ) ) {
			return;
		}

		// Elementor locations compatibility. (This action fires by Elementor Pro)
		add_action( 'elementor/theme/register_locations', array( $this, 'register_theme_locations' ) );

		if ( ! function_exists( 'elementor_theme_do_location' ) ) {
			return;
		}

		// Override theme templates.
		add_action( 'reme_do_top_bar', array( $this, 'do_header' ), 0 );
		add_action( 'reme_do_header', array( $this, 'do_header' ), 0 );
		add_action( 'reme_do_footer', array( $this, 'do_footer' ), 0 );
		add_action( 'reme_do_404', array( $this, 'do_404' ), 0 );
		add_action( 'reme_do_single_post', array( $this, 'do_single_post' ), 0 );
		add_action( 'reme_do_single_page', array( $this, 'do_single_page' ), 0 );
		add_action( 'reme_page_header', array( $this, 'remove_header_on_page' ), 0 );
	}

	/**
	 * Register Theme Location for Elementor
	 * see https://developers.elementor.com/theme-locations-api/
	 *
	 * @param \ElementorPro\Modules\ThemeBuilder\Classes\Locations_Manager $manager Elementor object.
	 */
	public function register_theme_locations( $manager ) {
		$manager->register_all_core_location();
	}

	/**
	 * Remove actions for elementor header to act properly.
	 */
	public function do_header() {
		$did_location = elementor_theme_do_location( 'header' );
		if ( $did_location ) {
			remove_all_actions( 'reme_do_top_bar' );
			remove_all_actions( 'reme_do_header' );
		}
	}

	/**
	 * Remove actions for elementor footer to act properly.
	 */
	public function do_footer() {
		$did_location = elementor_theme_do_location( 'footer' );
		if ( $did_location ) {
			remove_all_actions( 'reme_do_footer' );
		}
	}

	/**
	 * Remove actions for elementor 404 to act properly.
	 */
	public function do_404() {
		if ( ! is_404() ) {
			return;
		}
		$did_location = elementor_theme_do_location( 'single' );
		if ( $did_location ) {
			remove_all_actions( 'reme_do_404' );
		}
	}

	/**
	 * Remove actions for elementor single post to act properly.
	 */
	public function do_single_post() {
		$did_location = elementor_theme_do_location( 'single' );
		if ( $did_location ) {
			remove_all_actions( 'reme_do_single_post' );
		}
	}

	/**
	 * Remove actions for elementor single page to act properly.
	 */
	public function do_single_page() {
		$did_location = elementor_theme_do_location( 'single' );
		if ( $did_location ) {
			remove_all_actions( 'reme_do_single_page' );
		}
	}

	/**
	 * Remove title on single page.
	 */
	public function remove_header_on_page() {
		if ( ! is_singular( 'page' ) ) {
			return;
		}
		if ( elementor_theme_do_location( 'single' ) ) {
			remove_all_actions( 'reme_page_header' );
		}
	}

	/**
	 * Check if it page was edited with page builder.
	 *
	 * @param int $pid post id.
	 *
	 * @return bool
	 */
	protected function is_edited_with_builder( $pid ) {
		$post_meta = get_post_meta( $pid, '_elementor_edit_mode', true );
		if ( $post_meta === 'builder' ) {
			return true;
		}

		return false;
	}

	/**
	 * Fix the underline of links added by reme.
	 *
	 * @param string $css Current css.
	 * @param string $context Context.
	 *
	 * @return string
	 */
	public function fix_links( $css, $context = 'frontend' ) {
		if ( $context !== 'frontend' ) {
			return $css;
		}

		return $css . '.rm-content-wrap .elementor a:not(.button):not(.wp-block-file__button){
				text-decoration: none;
			}';
	}

	/**
	 * Get current palette colors.
	 *
	 * @return array
	 */
	private function get_current_palette_colors() {
		$customizer = get_theme_mod( 'reme_global_colors', reme_get_global_colors_default( true ) );
		$active     = $customizer['activePalette'];
		$palettes   = $customizer['palettes'];
		$palette    = $palettes[ $active ];
		$colors     = $palette['colors'];

		foreach ( self::$custom_global_colors as $slug => $args ) {
			$colors[ $slug ] = $args['val'];
		}

		return $colors;
	}

	/**
	 * Get the global colors prefix.
	 *
	 * @return string
	 */
	private function get_global_color_prefix() {
		return 'ReMe - ';
	}

	/**
	 * Allow Post Content widget to be shown in the panel for reme_custom_layouts post type.
	 *
	 * @param array<string, mixed> $data The original data that needs to be saved.
	 * @param int                  $post_id The ID of the post for which the data is being saved.
	 *
	 * @return array<string, mixed> The modified data with the additional configuration.
	 */
	public function elementor_document_config( $data, $post_id ) {
		if ( 'reme_custom_layouts' === get_post_type( $post_id ) ) {
			$data['panel'] = array(
				'widgets_settings' => array(
					'theme-post-content' => array(
						'show_in_panel' => true,
					),
				),
			);
		}

		return $data;
	}
}
