<?php
/**
 * Admin functionality
 *
 * Author:          Andrei Baicus <andrei@themeisle.com>
 * Created on:      17/08/2018
 *
 * @package ReMe\Core
 */

namespace ReMe\Core;


/**
 * Class Admin
 *
 * @package ReMe\Core
 */
class Admin {
	/**
	 * Theme Details
	 *
	 * @var \WP_Theme
	 */
	private $theme_args;

	/**
	 * Admin constructor.
	 */
	public function __construct() {
		$this->set_props();
		add_action( 'enqueue_block_editor_assets', [ $this, 'enqueue_gutenberg_scripts' ] );

		add_action( 'admin_menu', [ $this, 'remove_background_submenu' ], 110 );

		$this->auto_update_skin_and_builder();

		add_action( 'after_switch_theme', array( $this, 'migrate_options' ) );
	}

	/**
	 * Automatic upgrade from legacy builder and skin on init.
	 *
	 * @return void
	 */
	private function auto_update_skin_and_builder() {
		// If already on new skin bail.
		if ( get_theme_mod( 'reme_new_skin' ) === 'new' || reme_was_auto_migrated_to_new() ) {
			return;
		}
		set_theme_mod( 'reme_auto_migrated_to_new_skin', true );

		$this->run_skin_and_builder_switches();

		$migrator = new Builder_Migrator();
		$response = $migrator->run();

		if ( $response === true ) {
			set_theme_mod( 'reme_migrated_builders', true );
			set_theme_mod( 'reme_new_skin', 'new' );
		}
	}

	/**
	 * Register the script for react components.
	 */
	public function register_react_components() {
		$deps = include trailingslashit( REME_MAIN_DIR ) . 'assets/apps/components/build/components.asset.php';

		wp_register_script( 'reme-components', trailingslashit( REME_ASSETS_URL ) . 'apps/components/build/components.js', $deps['dependencies'], $deps['version'], false );
		wp_localize_script(
			'reme-components',
			'rmComponents',
			[
				'shouldUseColorPickerFix' => (int) ( ! reme_is_using_wp_version( '5.8' ) ),
				'customizerURL'           => esc_url( admin_url( 'customize.php' ) ),
			]
		);
		wp_set_script_translations( 'reme-components', 'reme' );

		if ( isset( $deps['chunks'] ) ) {
			foreach ( $deps['chunks'] as $chunk_file ) {

				$chunk_handle = 'reme-components-chunk-' . $chunk_file;
				wp_register_script( $chunk_handle, trailingslashit( REME_ASSETS_URL ) . 'apps/components/build/' . $chunk_file, [], $deps['version'], true );
				wp_enqueue_script( $chunk_handle );

				if ( function_exists( 'wp_set_script_translations' ) ) {
					wp_set_script_translations( $chunk_handle, 'reme' );
				}
			}
		}

		wp_register_style( 'reme-components', trailingslashit( REME_ASSETS_URL ) . 'apps/components/build/style-components.css', [ 'wp-components' ], $deps['version'] );
		wp_add_inline_style( 'reme-components', wp_strip_all_tags( Dynamic_Css::get_root_css() ) );
	}

	/**
	 * Switch to the new 3.0 features.
	 *
	 * @return void
	 *
	 * @since 3.0.0
	 */
	public function run_skin_and_builder_switches() {
		$flag = 'reme_ran_migrations';

		if ( get_theme_mod( $flag ) === true ) {
			return;
		}

		set_theme_mod( $flag, true );

		if ( reme_had_old_hfb() ) {
			set_theme_mod( 'reme_migrated_builders', false );
		}

		$all_mods = get_theme_mods();

		$mods = [
			'hfg_header_layout',
			'hfg_footer_layout',
			'reme_blog_archive_layout',
			'reme_headings_font_family',
			'reme_body_font_family',
			'reme_global_colors',
			'reme_button_appearance',
			'reme_secondary_button_appearance',
			'reme_typeface_general',
			'reme_form_fields_padding',
			'reme_default_sidebar_layout',
			'reme_advanced_layout_options',
		];

		$should_switch = false;
		foreach ( $mods as $mod_to_check ) {
			if ( isset( $all_mods[ $mod_to_check ] ) ) {
				$should_switch = true;
				break;
			}
		}

		if ( ! $should_switch ) {
			return;
		}

		set_theme_mod( 'reme_new_skin', 'old' );
		set_theme_mod( 'reme_had_old_skin', true );
	}

	/**
	 * Drop `Background` submenu item.
	 */
	public function remove_background_submenu() {
		global $submenu;

		if ( ! isset( $submenu['themes.php'] ) ) {
			return false;
		}

		foreach ( $submenu['themes.php'] as $index => $submenu_args ) {
			foreach ( $submenu_args as $arg_index => $arg ) {
				if ( preg_match( '/customize\.php.+autofocus%5Bcontrol%5D=background_image/', $arg ) === 1 ) {
					unset( $submenu['themes.php'][ $index ] );
				}
			}
		}
	}

	/**
	 * Setup Class Properties
	 */
	public function set_props() {
		$this->theme_args = wp_get_theme();
	}

	/**
	 * Enqueue gutenberg scripts.
	 */
	public function enqueue_gutenberg_scripts() {
		$screen = get_current_screen();
		// if is_block_editor is `true` we should allow the Gutenberg styles to load eg. the new widgets page.
		if ( ! post_type_supports( $screen->post_type, 'editor' ) && $screen->is_block_editor !== true ) {
			return;
		}
		wp_enqueue_script(
			'reme-gutenberg-script',
			REME_ASSETS_URL . 'js/build/all/gutenberg.js',
			array( 'wp-blocks', 'wp-dom' ),
			REME_VERSION,
			true
		);

		$path = 'gutenberg-editor-style';

		wp_enqueue_style( 'reme-gutenberg-style', REME_ASSETS_URL . 'css/' . $path . ( ( REME_DEBUG ) ? '' : '.min' ) . '.css', array(), REME_VERSION );
	}

	/**
	 * Import reme options when switching to a child theme.
	 */
	public function migrate_options() {
		$old_theme = strtolower( get_option( 'theme_switched' ) );
		if ( 'reme' !== $old_theme ) {
			return;
		}

		/* import ReMe options */
		$reme_mods = get_option( 'theme_mods_reme' );

		if ( ! empty( $reme_mods ) ) {

			foreach ( $reme_mods as $reme_mod_k => $reme_mod_v ) {
				set_theme_mod( $reme_mod_k, $reme_mod_v );
			}
		}
	}
}
