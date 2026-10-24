<?php
/**
 * ReMe Features Factory
 *
 * Author:          Andrei Baicus <andrei@themeisle.com>
 * Created on:      17/08/2018
 *
 * @package ReMe\Core
 */

namespace ReMe\Core;

use ReMe\Core\Settings\Mods;

/**
 * The core entry class.
 *
 * @package ReMe\Core
 */
class Core_Loader {
	/**
	 * Features that will be loaded.
	 *
	 * @access   protected
	 * @var array $features Features that will be loaded.
	 */
	protected $features = array();

	/**
	 * Define the core functionality of the theme.
	 *
	 * @access public
	 */
	public function __construct() {
		add_action( 'after_switch_theme', [ $this, 'check_new_user' ] );

		$this->define_hooks();
		$this->define_modules();
		$this->load_modules();
	}

	/**
	 * Checks that the user is new.
	 */
	public function check_new_user() {
		$new = get_option( 'reme_new_user' );
		if ( $new === 'yes' ) {
			return;
		}

		$install_time = get_option( 'reme_install' );
		$now          = get_option( 'reme_user_check_time' );

		if ( empty( $now ) ) {
			$now = time();
			update_option( 'reme_user_check_time', $now );
		}

		if ( empty( $install_time ) ) {
			return;
		}

		if ( ( $now - $install_time ) <= 60 ) {
			update_option( 'reme_new_user', 'yes' );

			return;
		}

		update_option( 'reme_new_user', 'no' );
	}

	/**
	 * Define the features that will be loaded.
	 */
	private function define_modules() {

		$features = array(
			'Customizer\Loader',
			'Views\Tweaks',
			'Views\Font_Manager',
			'Views\Top_Bar',
			'Views\Header',
			'Views\Template_Parts',
			'Views\Page_Header',
			'Views\Post_Layout',
			'Views\Page_Layout',
			'Views\Cover_Header',
			'Views\Content_None',
			'Views\Content_404',
			'Views\Breadcrumbs',
			'Views\Style_Book',
			'Views\Scroll_To_Top',
			'Views\Ads_Manager',
			'Views\Seo',
			'Views\Affiliate_Manager',

			'Views\Layouts\Layout_Container',
			'Views\Layouts\Layout_Sidebar',

			'Views\Partials\Post_Meta',
			'Views\Partials\Excerpt',
			'Views\Partials\Comments',

			'Views\Pluggable\Pagination',
			'Views\Pluggable\Masonry',
			'Views\Pluggable\Metabox_Settings',

			'Core\Dynamic_Css',

			'Compatibility\Generic',
			'Compatibility\Elementor',
			'Compatibility\Header_Footer_Elementor',
			'Compatibility\Amp',
			'Compatibility\Header_Footer_Beaver',
			'Compatibility\Beaver',
			'Compatibility\Lifter',
			'Compatibility\Patterns',
			'Compatibility\PWA',
			'Compatibility\Web_Stories',
			'Compatibility\Easy_Digital_Downloads',
			'Compatibility\WPML',

			'Admin\Metabox\Manager',
			'Admin\Troubleshoot\Main',

			'Abilities\Loader',
			'Blocks\\Loader',
		);

		if ( $this->is_fse_child_theme() ) {
			$features[] = 'Compatibility\Fse';
		}

		$this->features = apply_filters( 'reme_filter_main_modules', $features );
	}

	/**
	 * Check Features and register them.
	 *
	 * @access  private
	 */
	private function load_modules() {
		do_action( 'reme_before_modules_load' );

		if ( ! class_exists( Factory::class ) ) {
			return;
		}

		$factory = new Factory( $this->features );
		$factory->load_modules();
	}

	/**
	 * Register all of the hooks related to the functionality
	 * of the theme setup.
	 *
	 * @access   private
	 */
	private function define_hooks() {
		// Avoid mods cache on customizer preview.
		if ( is_customize_preview() ) {
			Mods::$no_cache = true;
		}
		if ( class_exists( Admin::class ) ) {
			$this->load_admin_hooks();
		}

		if ( class_exists( Front_End::class ) ) {
			$this->load_front_end_hooks();
		}
	}

	/**
	 * Load admin hooks.
	 *
	 * @access   private
	 *
	 * @return void
	 */
	private function load_admin_hooks() {
		$admin = new Admin();
		add_action( 'admin_enqueue_scripts', array( $admin, 'register_react_components' ), 0 );
	}

	/**
	 * Load front end hooks.
	 *
	 * @access   private
	 *
	 * @return void
	 */
	private function load_front_end_hooks() {
		$front_end = new Front_End();
		add_action( 'wp_enqueue_scripts', array( $front_end, 'enqueue_scripts' ) );
		add_action( 'after_setup_theme', array( $front_end, 'setup_theme' ) );
		add_action( 'widgets_init', array( $front_end, 'register_sidebars' ) );
		add_filter( 'load_script_translation_file', array( $front_end, 'fix_script_translation_files' ), 10, 3 );
	}

	/**
	 * Check if we're on a child theme, and it enables FSE.
	 *
	 * @return bool
	 */
	private function is_fse_child_theme() {
		if ( ! is_child_theme() ) {
			return false;
		}

		$theme_json = get_stylesheet_directory() . '/theme.json';

		if ( ! file_exists( $theme_json ) ) {
			return false;
		}

		if ( ! defined( 'REME_FSE_MODE' ) ) {
			return false;
		}

		if ( REME_FSE_MODE !== true ) {
			return false;
		}

		return true;
	}
}
