<?php
/**
 * Add compatibility with Beaver Themer header and footer.
 * Check https://kb.wpbeaverbuilder.com/article/389-add-header-footer-and-parts-support-to-your-theme for the
 * compatibility guid.
 *
 * @package ReMe\Compatibility
 */

namespace ReMe\Compatibility;

use ReMe\Core\Settings\Config;
use ReMe\Core\Settings\Mods;

/**
 * Class Bever
 *
 * @package ReMe\Compatibility
 */
class Beaver extends Page_Builder_Base {

	/**
	 * Init function.
	 */
	public function init() {
		if ( defined( 'FL_BUILDER_VERSION' ) ) {
			add_filter( 'fl_builder_color_presets', array( $this, 'global_color_presets' ) );
		}

		if ( defined( 'FL_THEME_BUILDER_VERSION' ) ) {
			add_action( 'wp', array( $this, 'add_theme_builder_hooks' ) );
			add_filter( 'fl_theme_builder_part_hooks', array( $this, 'register_part_hooks' ) );
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
		if ( class_exists( '\FLBuilderModel', false ) ) {
			return \FLBuilderModel::is_builder_enabled( $pid );
		}

		return false;
	}

	/**
	 * Load Beaver compatibility style.
	 */
	public function load_style() {
		wp_add_inline_style( 'reme-style', '.fl-builder.bbhf-transparent-header:not(.bhf-sticky-header) #rm-beaver-header .fl-row-content-wrap{background-color:transparent;border:none;transition:background-color .3s ease-in-out}.fl-builder.bbhf-transparent-header .bhf-fixed-header:not(.bhf-fixed) .fl-row-content-wrap{background-color:transparent;border:none;transition:background-color .3s ease-in-out}.fl-builder.bbhf-transparent-header #rm-beaver-header{position:absolute;z-index:10;width:100%}' );
	}

	/**
	 * Add support for elementor theme locations.
	 */
	public function add_theme_builder_hooks() {

		if ( ! class_exists( '\FLThemeBuilderLayoutData', false ) ) {
			return;
		}
		add_action( 'wp_enqueue_scripts', [ $this, 'load_style' ] );
		// Get the header ID.
		$header_ids = \FLThemeBuilderLayoutData::get_current_page_header_ids();

		// If we have a header, remove the theme header and hook in Theme Builder's.
		if ( ! empty( $header_ids ) ) {
			remove_all_actions( 'reme_do_top_bar' );
			remove_all_actions( 'reme_do_header' );
			add_action( 'reme_do_header', 'FLThemeBuilderLayoutRenderer::render_header' );
		}

		// Get the footer ID.
		$footer_ids = \FLThemeBuilderLayoutData::get_current_page_footer_ids();

		// If we have a footer, remove the theme footer and hook in Theme Builder's.
		if ( ! empty( $footer_ids ) ) {
			remove_all_actions( 'reme_do_footer' );
			add_action( 'reme_do_footer', 'FLThemeBuilderLayoutRenderer::render_footer' );
		}

	}

	/**
	 * Beautify hook names.
	 *
	 * @param string $hook Hook name.
	 *
	 * @return string
	 */
	private function beautify_hook( $hook ) {
		$hook_label = str_replace( '_', ' ', $hook );
		$hook_label = str_replace( 'reme', ' ', $hook_label );
		$hook_label = ucwords( $hook_label );
		return $hook_label;
	}

	/**
	 * Mapping function to move from reme_hooks format to the format required by Beaver Builder.
	 *
	 * @param string $location Current location, the key of reme_hooks array.
	 * @param array  $hooks Hooks from that location.
	 *
	 * @return array
	 */
	private function hook_to_part( $location, $hooks ) {
		$part = array(
			'label' => ucfirst( $location ),
		);
		foreach ( $hooks as $hook ) {
			$part['hooks'][ $hook ] = $this->beautify_hook( $hook );
		}
		return $part;
	}

	/**
	 * Register part hooks for Beaver Themer.
	 *
	 * @return array
	 */
	public function register_part_hooks() {
		$hooks = reme_hooks();
		return array_map( array( $this, 'hook_to_part' ), array_keys( $hooks ), $hooks );
	}

	/**
	 * Adds global colors from reme to Beaver Builder color presets.
	 *
	 * @param array $colors Color presets.
	 *
	 * @return array
	 */
	public function global_color_presets( $colors ) {

		$global_colors = get_theme_mod( 'reme_global_colors', reme_get_global_colors_default( true ) );

		if ( empty( $global_colors ) ) {
			return $colors;
		}

		if ( ! isset( $global_colors['activePalette'] ) ) {
			return $colors;
		}

		$active = $global_colors['activePalette'];

		if ( ! isset( $global_colors['palettes'][ $active ] ) ) {
			return $colors;
		}

		$palette = $global_colors['palettes'][ $active ];

		if ( ! isset( $palette['colors'] ) ) {
			return $colors;
		}

		$palette_colors = array_values( $palette['colors'] );

		$global_custom_colors = Mods::get( Config::MODS_GLOBAL_CUSTOM_COLORS, [] );

		foreach ( $global_custom_colors as $args ) {
			$palette_colors[] = $args['val'];
		}

		foreach ( $palette_colors as $color ) {
			if ( ! array_search( $color, $colors, true ) ) {
				$colors[] = str_replace( '#', '', $color );
			}
		}

		return array_values( array_unique( $colors ) );
	}
}
