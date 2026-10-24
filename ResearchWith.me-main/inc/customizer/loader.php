<?php
/**
 * Author:          Andrei Baicus <andrei@themeisle.com>
 * Created on:      17/08/2018
 *
 * @package ReMe\Customizer
 */

namespace ReMe\Customizer;

use HFG\Core\Components\Utility\SearchIconButton;
use ReMe\Core\Factory;
use ReMe\Core\Settings\Config;
use ReMe\Customizer\Options\Colors_Background;
use ReMe\Views\Font_Manager;

/**
 * Main customizer handler.
 *
 * @package ReMe\Customizer
 */
class Loader {
	const CUSTOMIZER_STYLE_HANDLE = 'reme-customizer-style';
	/**
	 * Customizer modules.
	 *
	 * @var array
	 */
	private $customizer_modules = array();

	/**
	 * Loader constructor.
	 */
	public function __construct() {
		add_action( 'customize_preview_init', array( $this, 'enqueue_customizer_preview' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'set_featured_image' ) );
		add_action( 'customize_controls_enqueue_scripts', array( $this, 'enqueue_customizer_controls' ) );
		add_action( 'wp_ajax_reme_dismiss_starter_content', array( $this, 'dismiss_starter_content' ) );
	}

	/**
	 * Initialize the customizer functionality
	 */
	public function init() {
		global $wp_customize;

		if ( ! isset( $wp_customize ) ) {
			return;
		}
		$this->define_modules();
		$this->load_modules();
		add_action( 'customize_register', array( $this, 'change_pro_controls' ), PHP_INT_MAX );
		add_action( 'customize_register', array( $this, 'register_setting_local_gf' ) );
	}

	/**
	 * Method to modify already defined controls.
	 *
	 * @param \WP_Customize_Manager $wp_customize The WP_Customize_Manager object.
	 */
	public function change_pro_controls( \WP_Customize_Manager $wp_customize ) {
		$controls_to_disable = [ 'reme_global_header', 'reme_header_conditional_selector' ];
		foreach ( $controls_to_disable as $control_slug ) {
			$wp_customize->remove_control( $control_slug );
		}
	}

	/**
	 * Define the modules that will be loaded.
	 */
	private function define_modules() {
		$this->customizer_modules = apply_filters(
			'reme_filter_customizer_modules',
			array(
				'Customizer\Options\Main',
				'Customizer\Options\Layout_Container',
				'Customizer\Options\Layout_Blog',
				'Customizer\Options\Layout_Single_Post',
				'Customizer\Options\Layout_Single_Page',
				'Customizer\Options\Layout_Sidebar',
				'Customizer\Options\Scroll_To_Top',
				'Customizer\Options\Typography',
				'Customizer\Options\Colors_Background',
				'Customizer\Options\Buttons',
				'Customizer\Options\Form_Fields',
				'Customizer\Options\Monetization',
				'Customizer\Options\Search_Ai',
				'Customizer\Options\Rtl',
			)
		);
	}

	/**
	 * Enqueue customizer controls script.
	 */
	public function enqueue_customizer_controls() {
		wp_register_style( self::CUSTOMIZER_STYLE_HANDLE, REME_ASSETS_URL . 'css/customizer-style' . ( ( REME_DEBUG ) ? '' : '.min' ) . '.css', array(), REME_VERSION );
		wp_style_add_data( self::CUSTOMIZER_STYLE_HANDLE, 'rtl', 'replace' );
		wp_style_add_data( self::CUSTOMIZER_STYLE_HANDLE, 'suffix', '.min' );
		wp_enqueue_style( self::CUSTOMIZER_STYLE_HANDLE );

		wp_enqueue_script(
			'reme-customizer-controls',
			REME_ASSETS_URL . 'js/build/all/customizer-controls.js',
			array(
				'jquery',
				'wp-color-picker',
			),
			REME_VERSION,
			true
		);
		 
		$bundle_path  = get_template_directory_uri() . '/assets/apps/customizer-controls/build/';
		$dependencies = reme_get_asset_meta( get_template_directory() . '/assets/apps/customizer-controls/build/controls.asset.php' );
		wp_register_script( 'react-controls', $bundle_path . 'controls.js', $dependencies['dependencies'], $dependencies['version'], true );
		wp_localize_script(
			'react-controls',
			'ReMeReactCustomize',
			apply_filters(
				'reme_react_controls_localization',
				array(
					'nonce'                         => wp_create_nonce( 'wp_rest' ),
					'headerControls'                => [],
					'instructionalVid'              => esc_url( get_template_directory_uri() . '/header-footer-grid/assets/images/customizer/hfg.mp4' ),
					'dynamicTags'                   => array(
						'controls' => array(),
						'options'  => array(),
					),
					'upsellComponentsLink'          => '',
					'fonts'                         => array(
						'System' => reme_get_standard_fonts(),
						'Google' => reme_get_google_fonts(),
					),
					'fontVariants'                  => reme_get_google_fonts( true ),
					'systemFontVariants'            => reme_get_standard_fonts( true ),
					'hideConditionalHeaderSelector' => true,
					'dashUpdatesMessage'            => '',
					'bundlePath'                    => get_template_directory_uri() . '/assets/apps/customizer-controls/build/',
					'localGoogleFonts'              => array(
						'learnMore' => '',
						'key'       => Config::OPTION_LOCAL_GOOGLE_FONTS_HOSTING,
					),
					'preloadFonts'                  => array(
						'key' => Config::MODS_PRELOAD_FONTS,
					),
					'fontPairs'                     => get_theme_mod( Config::MODS_TPOGRAPHY_FONT_PAIRS, Config::$typography_default_pairs ),
					'allowedGlobalCustomColor'      => Colors_Background::CUSTOM_COLOR_LIMIT,
					'constants'                     => [
						'HFGSearch' => [
							'defaultIconKey' => SearchIconButton::DEFAULT_ICON,
							'customIconKey'  => SearchIconButton::CUSTOM_ICON,
						],
					],
					'starterContent'                => array(
						'active'          => (bool) get_option( 'fresh_site' ),
						'nonce'           => wp_create_nonce( 'reme_dismiss_starter_content' ),
						'dismissEndpoint' => admin_url( 'admin-ajax.php' ),
						'labels'          => array(
							'title'       => __( 'Welcome to your new site!', 'reme' ),
							'description' => __( "We've added some starter pages to help you get going quickly.", 'reme' ),
							'save'        => __( 'Keep these helpful pages', 'reme' ),
							'dismiss'     => __( 'Start with a clean slate', 'reme' ),
							'info'        => __( "Don't worry - you can always add or remove pages later", 'reme' ),
							'error'       => __( 'An error occurred. Please reload the page and try again.', 'reme' ),
						),
					),
					'blackFriday'                   => array(),
					// Read unguarded by the compiled controls bundle.
					'elementor'                     => array(
						'hasElementorShopTemplate'    => false,
						'hasElementorProductTemplate' => false,
					),
				)
			)
		);
		wp_enqueue_script( 'react-controls' );

		if ( function_exists( 'wp_set_script_translations' ) ) {
			wp_set_script_translations( 'react-controls', 'reme' );
		}

		wp_register_style( 'react-controls', $bundle_path . 'style-controls.css', [ 'reme-components' ], $dependencies['version'] );
		wp_style_add_data( 'react-controls', 'rtl', 'replace' );
		wp_enqueue_style( 'react-controls' );

		if ( isset( $dependencies['chunks'] ) ) {
			foreach ( $dependencies['chunks'] as $chunk_file ) {

				$chunk_handle = 'reme-customizer-chunk-' . $chunk_file;
				wp_register_script( $chunk_handle, $bundle_path . $chunk_file, [], $dependencies['version'], true );
				wp_enqueue_script( $chunk_handle );

				if ( function_exists( 'wp_set_script_translations' ) ) {
					wp_set_script_translations( $chunk_handle, 'reme' );
				}
			}
		}

		$fonts = $this->get_remote_preview_fonts();

		if ( empty( $fonts ) ) {
			return;
		}

		$chunks = array_chunk( $fonts, max( 1, absint( count( $fonts ) / 5 ) ) );

		foreach ( $chunks as $index => $fonts_chunk ) {
			wp_enqueue_style(
				'reme-fonts-control-google-fonts-' . $index,
				'https://fonts.googleapis.com/css?family=' . join( '|', $fonts_chunk ) . '&text=AbcTtheigrownfoxJumpsvlazydg"',
				[],
				REME_VERSION
			);
		}
	}

	/**
	 * Get the Google fonts whose control previews load remotely.
	 *
	 * When fonts are hosted locally, the already downloaded faces are inlined instead.
	 *
	 * @return string[]
	 */
	private function get_remote_preview_fonts(): array {
		$fonts = reme_get_google_fonts();

		if ( ! Font_Manager::should_load_fonts_locally() ) {
			return $fonts;
		}

		$local_faces = Font_Manager::get_downloaded_font_faces();

		if ( empty( $local_faces['variants'] ) ) {
			return $fonts;
		}

		wp_add_inline_style( 'react-controls', $local_faces['css'] );

		return array_values( array_diff( $fonts, array_keys( $local_faces['variants'] ) ) );
	}

	/**
	 * Enqueue customizer preview script.
	 */
	public function enqueue_customizer_preview() {
		wp_enqueue_style(
			'reme-customizer-preview-style',
			REME_ASSETS_URL . 'css/customizer-preview' . ( ( REME_DEBUG ) ? '' : '.min' ) . '.css',
			array(),
			REME_VERSION
		);
		wp_register_script(
			'reme-customizer-preview',
			REME_ASSETS_URL . 'js/build/all/customizer-preview.js',
			array(),
			REME_VERSION,
			true
		);

		wp_localize_script(
			'reme-customizer-preview',
			'remeCustomizePreview',
			apply_filters(
				'reme_customize_preview_localization',
				array(
					'currentFeaturedImage' => '',
					'newBuilder'           => reme_is_new_builder(),
					'newSkin'              => reme_is_new_skin(),
				)
			)
		);
		wp_enqueue_script( 'reme-customizer-preview' );
	}

	/**
	 * Save featured image in previously localized object.
	 */
	public function set_featured_image() {
		if ( ! is_customize_preview() ) {
			return;
		}
		if ( ! is_singular() ) {
			return;
		}
		$thumbnail = get_the_post_thumbnail_url();
		if ( $thumbnail === false ) {
			return;
		}
		wp_add_inline_script( 'reme-customizer-preview', 'remeCustomizePreview.currentFeaturedImage = "' . esc_url( get_the_post_thumbnail_url() ) . '";' );
	}

	/**
	 * Load the customizer modules.
	 *
	 * @return void
	 */
	private function load_modules() {
		if ( ! class_exists( Factory::class ) ) {
			return;
		}
		$factory = new Factory( $this->customizer_modules );
		$factory->load_modules();
	}

	/**
	 * Register setting for "Toggle that enables local host of Google fonts"
	 *
	 * @param \WP_Customize_Manager $wp_customize \WP_Customize_Manager instance.
	 * @return void
	 */
	public function register_setting_local_gf( $wp_customize ) {
		$wp_customize->add_setting(
			Config::OPTION_LOCAL_GOOGLE_FONTS_HOSTING,
			[
				'type'              => 'option',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'default'           => false,
			]
		);

		$wp_customize->add_setting(
			Config::MODS_PRELOAD_FONTS,
			[
				'sanitize_callback' => 'reme_sanitize_checkbox',
				'default'           => false,
			]
		);
	}

	/**
	 * Handle the starter content dismissal.
	 *
	 * @return void
	 */
	public function dismiss_starter_content() {
		if ( ! isset( $_POST['nonce'] ) || ! wp_verify_nonce( sanitize_text_field( $_POST['nonce'] ), 'reme_dismiss_starter_content' ) ) {
			wp_send_json_error(
				array(
					'message' => __( 'Invalid security token.', 'reme' ),
				)
			);
		}

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error(
				array(
					'message' => __( 'You do not have permission to perform this action.', 'reme' ),
				)
			);
		}

		$result = update_option( 'fresh_site', '0' );
		if ( $result ) {
			wp_send_json_success();
		}

		wp_send_json_error(
			array(
				'message' => __( 'An error occurred. Please reload the page and try again.', 'reme' ),
			)
		);
	}

}
