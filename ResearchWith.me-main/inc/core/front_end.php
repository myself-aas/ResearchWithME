<?php
/**
 * Front end functionality
 *
 * Author:          Andrei Baicus <andrei@themeisle.com>
 * Created on:      17/08/2018
 *
 * @package ReMe\Core
 */

namespace ReMe\Core;

use ReMe\Compatibility\Starter_Content;
use ReMe\Core\Settings\Config;
use ReMe\Core\Settings\Mods;
use ReMe\Core\Dynamic_Css;
use ReMe\Core\Traits\Theme_Mods;
use ReMe\Customizer\Options\Scroll_To_Top;

/**
 * Front end handler class.
 *
 * @package ReMe\Core
 */
class Front_End {
	use Theme_Mods;

	/**
	 * Theme setup.
	 */
	public function setup_theme() {

		// Maximum allowed width for any content in the theme, like oEmbeds and images added to posts.  https://codex.wordpress.org/Content_Width
		global $content_width;
		if ( ! isset( $content_width ) ) {
			$content_width = apply_filters( 'reme_content_width', 1200 );
		}

		load_theme_textdomain( 'reme', get_template_directory() . '/languages' );

		$logo_settings = array(
			'flex-width'  => true,
			'flex-height' => true,
			'height'      => 50,
			'width'       => 200,
		);

		add_theme_support( 'align-wide' );
		add_theme_support( 'automatic-feed-links' );
		add_theme_support( 'border' );
		add_theme_support( 'custom-background', [] );
		add_theme_support( 'custom-logo', $logo_settings );
		add_theme_support( 'custom-spacing' );
		add_theme_support( 'custom-units' );
		add_theme_support( 'customize-selective-refresh-widgets' );
		add_theme_support( 'editor-color-palette', $this->get_gutenberg_color_palette() );
		add_theme_support( 'fl-theme-builder-footers' );
		add_theme_support( 'fl-theme-builder-headers' );
		add_theme_support( 'fl-theme-builder-parts' );
		add_theme_support( 'header-footer-elementor' );
		add_theme_support( 'html5', array( 'search-form', 'script', 'style', 'comment-form', 'comment-list', 'gallery', 'caption', 'navigation-widgets' ) );
		add_theme_support( 'lifterlms-sidebars' );
		add_theme_support( 'lifterlms' );
		add_theme_support( 'link-color' );
		add_theme_support( 'post-thumbnails' );
		add_theme_support( 'service_worker', true );
		if ( get_option( 'fresh_site' ) ) {
			// Core only consumes starter content on fresh sites; skip building it elsewhere.
			add_theme_support( 'starter-content', ( new Starter_Content() )->get() );
		}
		// Keep the starter pages' inline SVG icons KSES-safe for the life of the site,
		// so later edits by users without unfiltered_html don't strip and invalidate them.
		add_filter( 'wp_kses_allowed_html', array( Starter_Content::class, 'allow_starter_svg' ), 10, 2 );
		// Core never loads "Additional CSS" in the block editor; mirror the starter
		// polish there so the starter pages match the front end while editing.
		add_filter( 'block_editor_settings_all', array( Starter_Content::class, 'editor_css' ) );
		add_theme_support( 'title-tag' );
		add_filter( 'script_loader_tag', array( $this, 'filter_script_loader_tag' ), 10, 2 );
		add_filter( 'embed_oembed_html', array( $this, 'wrap_oembeds' ), 10, 3 );
		add_filter( 'video_embed_html', array( $this, 'wrap_jetpack_oembeds' ), 10, 1 );

		$this->add_amp_support();
		$nav_menus_to_register = apply_filters(
			'reme_register_nav_menus',
			array(
				'primary' => esc_html__( 'Primary Menu', 'reme' ),
				'footer'  => esc_html__( 'Footer Menu', 'reme' ),
				'top-bar' => esc_html__( 'Secondary Menu', 'reme' ),
			)
		);
		register_nav_menus( $nav_menus_to_register );

		add_image_size( 'reme-blog', 930, 620, true );
		add_filter( 'wp_nav_menu_args', array( $this, 'nav_walker' ), 1001 );
		add_filter( 'theme_mod_background_color', '__return_empty_string' );
		add_filter( 'reme_dynamic_style_output', array( $this, 'css_global_custom_colors' ), PHP_INT_MAX, 2 );

		add_filter( 'reme_dynamic_style_output', array( $this, 'css_scroll_to_top' ), 99, 2 );
	}

	/**
	 * Gutenberg Block Color Palettes.
	 *
	 * Get the color palette in Gutenberg from Customizer colors.
	 */
	private function get_gutenberg_color_palette() {
		$prefix                  = 'ReMe - ';
		$gutenberg_color_palette = array();
		$from_global_colors      = [
			'reme-link-color'       => array(
				'val'   => 'var(--rm-primary-accent)',
				'label' => $prefix . __( 'Primary Accent', 'reme' ),
			),
			'reme-link-hover-color' => array(
				'val'   => 'var(--rm-secondary-accent)',
				'label' => $prefix . __( 'Secondary Accent', 'reme' ),
			),
			'rm-site-bg'            => array(
				'val'   => 'var(--rm-site-bg)',
				'label' => $prefix . __( 'Site Background', 'reme' ),
			),
			'rm-light-bg'           => array(
				'val'   => 'var(--rm-light-bg)',
				'label' => $prefix . __( 'Light Background', 'reme' ),
			),
			'rm-dark-bg'            => array(
				'val'   => 'var(--rm-dark-bg)',
				'label' => $prefix . __( 'Dark Background', 'reme' ),
			),
			'reme-text-color'       => array(
				'val'   => 'var(--rm-text-color)',
				'label' => $prefix . __( 'Text Color', 'reme' ),
			),
			'rm-text-dark-bg'       => array(
				'val'   => 'var(--rm-text-dark-bg)',
				'label' => $prefix . __( 'Text Dark Background', 'reme' ),
			),
			'rm-c-1'                => array(
				'val'   => 'var(--rm-c-1)',
				'label' => $prefix . __( 'Extra Color 1', 'reme' ),
			),
			'rm-c-2'                => array(
				'val'   => 'var(--rm-c-2)',
				'label' => $prefix . __( 'Extra Color 2', 'reme' ),
			),
		];

		// Add custom global colors
		$from_global_colors = array_merge( $from_global_colors, $this->get_global_custom_color_vars() );

		foreach ( $from_global_colors as $slug => $args ) {
			array_push(
				$gutenberg_color_palette,
				array(
					'name'  => esc_html( $args['label'] ),
					'slug'  => esc_html( $slug ),
					'color' => reme_sanitize_colors( $args['val'] ),
				)
			);
		}

		return array_values( $gutenberg_color_palette );
	}

	/**
	 * Returns global custom colors with css vars
	 *
	 * @return array[]
	 */
	private function get_global_custom_color_vars() {
		$css_vars = [];
		foreach ( Mods::get( Config::MODS_GLOBAL_CUSTOM_COLORS, [] ) as $slug => $args ) {
			$css_vars[ $slug ] = [
				'label' => $args['label'],
				'val'   => sprintf( 'var(--%s)', $slug ),
			];
		}

		return $css_vars;
	}

	/**
	 * Add AMP support
	 */
	private function add_amp_support() {
		if ( ! defined( 'AMP__VERSION' ) ) {
			return;
		}
		if ( version_compare( AMP__VERSION, '1.0.0', '<' ) ) {
			return;
		}
		add_theme_support(
			'amp',
			apply_filters(
				'reme_filter_amp_support',
				array(
					'paired' => true,
				)
			)
		);
	}

	/**
	 * Adds async/defer attributes to enqueued / registered scripts.
	 *
	 * If #12009 lands in WordPress, this function can no-op since it would be handled in core.
	 *
	 * @link https://core.trac.wordpress.org/ticket/12009
	 *
	 * @param string $tag The script tag.
	 * @param string $handle The script handle.
	 *
	 * @return string Script HTML string.
	 */
	public function filter_script_loader_tag( $tag, $handle ) {
		foreach ( array( 'async', 'defer' ) as $attr ) {
			if ( ! wp_scripts()->get_data( $handle, $attr ) ) {
				continue;
			}
			// Prevent adding attribute when already added in #12009.
			if ( ! preg_match( ":\s$attr(=|>|\s):", $tag ) ) {
				$tag = preg_replace( ':(?=></script>):', " $attr", $tag, 1 );
			}
			// Only allow async or defer, not both.
			break;
		}

		return $tag;
	}

	/**
	 * Wrap embeds.
	 *
	 * @param string $markup embed markup.
	 * @param string $url embed url.
	 * @param array  $attr embed attributes [width/height].
	 *
	 * @return string
	 */
	public function wrap_oembeds( $markup, $url, $attr ) {
		$sources = [
			'youtube.com',
			'youtu.be',
			'cloudup.com',
			'dailymotion.com',
			'ted.com',
			'vimeo.com',
			'speakerdeck.com',
		];
		foreach ( $sources as $source ) {
			if ( strpos( $url, $source ) !== false ) {
				return '<div class="rm-iframe-embed">' . $markup . '</div>';
			}
		}

		return $markup;
	}

	/**
	 * Wrap Jetpack embeds.
	 * Fixes the compose module aspect ratio issue.
	 *
	 * @param string $markup embed markup.
	 *
	 * @return string
	 */
	public function wrap_jetpack_oembeds( $markup ) {
		return '<div class="rm-iframe-embed">' . $markup . '</div>';
	}

	/**
	 * Tweak menu walker to support selective refresh.
	 *
	 * @param array $args List of arguments for navigation.
	 *
	 * @return mixed
	 */
	public function nav_walker( $args ) {
		if ( isset( $args['walker'] ) && is_string( $args['walker'] ) && class_exists( $args['walker'] ) ) {
			$args['walker'] = new $args['walker']();
		}

		return $args;
	}

	/**
	 * Enqueue scripts and styles.
	 */
	public function enqueue_scripts() {
		$this->add_styles();
		$this->add_inline_styles();
		$this->add_scripts();
	}

	/**
	 * Enqueue inline styles for core components.
	 */
	private function add_inline_styles() {

		// Add Inline styles if buttons shadows are being used.
		$primary_values   = get_theme_mod( Config::MODS_BUTTON_PRIMARY_STYLE, reme_get_button_appearance_default() );
		$secondary_values = get_theme_mod( Config::MODS_BUTTON_SECONDARY_STYLE, reme_get_button_appearance_default( 'secondary' ) );

		$style = '';

		if (
			( isset( $primary_values['useShadow'] ) && ! empty( $primary_values['useShadow'] ) ) ||
			( isset( $primary_values['useShadowHover'] ) && ! empty( $primary_values['useShadowHover'] ) ) ||
			( isset( $secondary_values['useShadow'] ) && ! empty( $secondary_values['useShadow'] ) ) ||
			( isset( $secondary_values['useShadowHover'] ) && ! empty( $secondary_values['useShadowHover'] ) )
		) {
			$style .= '.button.button-primary, .is-style-primary .wp-block-button__link {box-shadow: var(--primarybtnshadow, none);} .button.button-primary:hover, .is-style-primary .wp-block-button__link:hover {box-shadow: var(--primarybtnhovershadow, none);} .button.button-secondary, .is-style-secondary .wp-block-button__link {box-shadow: var(--secondarybtnshadow, none);} .button.button-secondary:hover, .is-style-secondary .wp-block-button__link:hover {box-shadow: var(--secondarybtnhovershadow, none);}';
		}

		foreach ( reme_get_headings_selectors() as $heading_id => $heading_selector ) {
			$font_family = get_theme_mod( $this->get_mod_key_heading_fontfamily( $heading_id ), '' ); // default value is empty string to be consistent with default customizer control value.

			$css_var = sprintf( '--%1$sfontfamily', $heading_id );

			if ( is_customize_preview() ) {
				$style .= sprintf( '%s {font-family: var(%s, var(--headingsfontfamily)), var(--rm-fallback-ff);} ', $heading_id, $css_var ); // fallback values for the first page load on the customizer
				continue;
			}

			// If font family is inherit, do not add a style for this heading.
			if ( $font_family === '' ) {
				continue;
			}

			$style .= sprintf( '%s {font-family: var(%s);}', $heading_id, $css_var );
		}

		$style .= $this->get_mobile_menu_styles();
		$style .= $this->get_static_footer_styles();

		wp_add_inline_style( 'reme-style', Dynamic_Css::minify_css( $style ) );
	}

	/**
	 * Showing Menu Sidebar animation css.
	 * 
	 * @return string
	 */
	private function get_mobile_menu_styles() {
		$sidebar_animation_css  = '.is-menu-sidebar .header-menu-sidebar { visibility: visible; }';
		$sidebar_animation_css .= '.is-menu-sidebar.menu_sidebar_slide_left .header-menu-sidebar { transform: translate3d(0, 0, 0); left: 0; }';
		$sidebar_animation_css .= '.is-menu-sidebar.menu_sidebar_slide_right .header-menu-sidebar { transform: translate3d(0, 0, 0); right: 0; }';
		$sidebar_animation_css .= '.is-menu-sidebar.menu_sidebar_pull_right .header-menu-sidebar, .is-menu-sidebar.menu_sidebar_pull_left .header-menu-sidebar { transform: translateX(0); }';
		$sidebar_animation_css .= '.is-menu-sidebar.menu_sidebar_dropdown .header-menu-sidebar { height: auto; }';
		$sidebar_animation_css .= '.is-menu-sidebar.menu_sidebar_dropdown .header-menu-sidebar-inner { max-height: 400px; padding: 20px 0; }';
		$sidebar_animation_css .= '.is-menu-sidebar.menu_sidebar_full_canvas .header-menu-sidebar { opacity: 1; }';
		$sidebar_animation_css .= '.header-menu-sidebar .menu-item-nav-search:not(.floating) { pointer-events: none; }';
		$sidebar_animation_css .= '.header-menu-sidebar .menu-item-nav-search .is-menu-sidebar { pointer-events: unset; }';

		return $sidebar_animation_css;
	}

	/**
	 * Get static footer styles.
	 * 
	 * @return string
	 */
	private function get_static_footer_styles() {
		return '@media screen and (max-width: 960px) {
			.builder-item.cr .item--inner {
				--textalign: center;
    		--justify: center;
			}
		}';
	}

	/**
	 * Enqueue styles.
	 */
	private function add_styles() {
		if ( class_exists( 'Easy_Digital_Downloads' ) ) {

			$style_path = 'css/easy-digital-downloads';

			wp_register_style( 'reme-easy-digital-downloads', REME_ASSETS_URL . $style_path . ( ( REME_DEBUG ) ? '' : '.min' ) . '.css', array(), apply_filters( 'reme_version_filter', REME_VERSION ) );
			wp_style_add_data( 'reme-easy-digital-downloads', 'rtl', 'replace' );
			wp_style_add_data( 'reme-easy-digital-downloads', 'suffix', '.min' );
			wp_enqueue_style( 'reme-easy-digital-downloads' );

		}

		$style_path = '/style-main-new';

		wp_register_style( 'reme-style', get_template_directory_uri() . $style_path . ( ( REME_DEBUG ) ? '' : '.min' ) . '.css', array(), apply_filters( 'reme_version_filter', REME_VERSION ) );
		wp_style_add_data( 'reme-style', 'rtl', 'replace' );
		wp_style_add_data( 'reme-style', 'suffix', '.min' );
		wp_enqueue_style( 'reme-style' );

		$mm_path = 'mega-menu';

		wp_register_style( 'reme-mega-menu', get_template_directory_uri() . '/assets/css/' . $mm_path . ( ( REME_DEBUG ) ? '' : '.min' ) . '.css', array(), apply_filters( 'reme_version_filter', REME_VERSION ) );
		wp_style_add_data( 'reme-mega-menu', 'rtl', 'replace' );
		wp_style_add_data( 'reme-mega-menu', 'suffix', '.min' );
	}

	/**
	 * Enqueue scripts.
	 */
	private function add_scripts() {
		if ( reme_is_amp() ) {
			return;
		}

		wp_register_script( 'reme-script', REME_ASSETS_URL . 'js/build/modern/frontend.js', apply_filters( 'reme_filter_main_script_dependencies', array() ), REME_VERSION, true );

		wp_localize_script(
			'reme-script',
			'ReMeProperties',
			apply_filters(
				'reme_filter_main_script_localization',
				array(
					'ajaxurl'     => esc_url( admin_url( 'admin-ajax.php' ) ),
					'nonce'       => wp_create_nonce( 'wp_rest' ),
					'isRTL'       => is_rtl(),
					'isCustomize' => is_customize_preview(),
				)
			)
		);
		wp_enqueue_script( 'reme-script' );
		wp_script_add_data( 'reme-script', 'async', true );
		$inline_scripts = apply_filters( 'hfg_component_scripts', '' );
		if ( ! empty( $inline_scripts ) ) {
			wp_add_inline_script( 'reme-script', $inline_scripts );
		}

		if ( $this->should_load_comments_reply() ) {
			wp_enqueue_script( 'comment-reply' );
		}
	}

	/**
	 * Dequeue comments-reply script if comments are closed.
	 *
	 * @return bool
	 */
	public function should_load_comments_reply() {

		if ( ! is_singular() ) {
			return false;
		}

		if ( ! comments_open() ) {
			return false;
		}

		if ( ! (bool) get_option( 'thread_comments' ) ) {
			return false;
		}

		if ( post_password_required() ) {
			return false;
		}

		$post_type = get_post_type();
		if ( ! post_type_supports( $post_type, 'comments' ) ) {
			return false;
		}

		if ( ! apply_filters( 'reme_post_has_comments', false ) ) {
			return false;
		}

		return true;
	}

	/**
	 * Register widgets for the theme.
	 *
	 * @since    1.0.0
	 */
	public function register_sidebars() {
		$sidebars = array(
			'blog-sidebar' => esc_html__( 'Sidebar', 'reme' ),
		);

		$footer_sidebars = apply_filters(
			'reme_footer_widget_areas_array',
			array(
				'footer-one-widgets'   => esc_html__( 'Footer One', 'reme' ),
				'footer-two-widgets'   => esc_html__( 'Footer Two', 'reme' ),
				'footer-three-widgets' => esc_html__( 'Footer Three', 'reme' ),
				'footer-four-widgets'  => esc_html__( 'Footer Four', 'reme' ),
			)
		);

		$sidebars = array_merge( $sidebars, $footer_sidebars );

		foreach ( $sidebars as $sidebar_id => $sidebar_name ) {
			$sidebar_settings = array(
				'name'          => $sidebar_name,
				'id'            => $sidebar_id,
				'before_widget' => '<div id="%1$s" class="widget %2$s">',
				'after_widget'  => '</div>',
				'before_title'  => '<p class="widget-title">',
				'after_title'   => '</p>',
			);
			register_sidebar( $sidebar_settings );
		}
	}

	/**
	 * Adds CSS rules to resolve .has-dynamicslug-color .has-dynamicslug-background-color classes.
	 *
	 * @param  string $current_styles Current dynamic style.
	 * @param  string $context gutenberg|frontend Represents the type of the context.
	 * @return string dynamic styles has resolving global custom colors
	 */
	public function css_global_custom_colors( $current_styles, $context ) {
		if ( $context !== 'frontend' ) {
			return $current_styles;
		}

		foreach ( Mods::get( Config::MODS_GLOBAL_CUSTOM_COLORS, [] ) as $slug => $args ) {
			$css_var         = sprintf( 'var(--%s) !important', $slug );
			$current_styles .= Dynamic_CSS::minify_css( sprintf( '.has-%s-color {color:%s} .has-%s-background-color {background-color:%s}', $slug, $css_var, $slug, $css_var ) );
		}

		return $current_styles;
	}

	/**
	 * Add module css.
	 *
	 * @param string $css Current CSS style.
	 * @param string $context Current context.
	 *
	 * @return string Altered CSS.
	 */
	public function css_scroll_to_top( $css, $context = 'frontend' ) {
		if ( ! Scroll_To_Top::is_enabled() ) {
			return $css;
		}

		if ( $context !== 'frontend' ) {
			return $css;
		}

		$scroll_to_top_css = '.scroll-to-top {' . ( is_rtl() ? 'left: 20px;' : 'right: 20px;' ) . '
			border: none;
			position: fixed;
			bottom: 30px;
			display: none;
			opacity: 0;
			visibility: hidden;
			transition: opacity 0.3s ease-in-out, visibility 0.3s ease-in-out;
			align-items: center;
			justify-content: center;
			z-index: 999;
		}
		@supports (-webkit-overflow-scrolling: touch) {
			.scroll-to-top {
				bottom: 74px;
			}
		}
		.scroll-to-top.image {
			background-position: center;
		}
		.scroll-to-top .scroll-to-top-image {
			width: 100%;
		    height: 100%;
		}
		.scroll-to-top .scroll-to-top-label {
			margin: 0;
			padding: 5px;
		}
		.scroll-to-top:hover {
			text-decoration: none;
		}
		.scroll-to-top.scroll-to-top-left {' . ( is_rtl() ? 'right: 20px; left: unset;' : 'left: 20px; right: unset;' ) . '}
		.scroll-to-top.scroll-show-mobile {
		  display: flex;
		}
		@media (min-width: 960px) {
			.scroll-to-top {
				display: flex;
			}
		}';

		$scroll_to_top_css .= '.scroll-to-top {
			color: var(--color);
			padding: var(--padding);
			border-radius: var(--borderradius);
			background: var(--bgcolor);  
		}

		.scroll-to-top:hover, .scroll-to-top:focus {
			color: var(--hovercolor);
			background: var(--hoverbgcolor);
		}

		.scroll-to-top-icon, .scroll-to-top.image .scroll-to-top-image {
			width: var(--size);
			height: var(--size);
		}

		.scroll-to-top-image {
			background-image: var(--bgimage);
			background-size: cover;
		}';

		return $css . $scroll_to_top_css;
	}

	/**
	 * Fix script translations language directory.
	 *
	 * @param string | false $file File path.
	 * @param string         $handle Script handle.
	 * @param string         $domain Script text domain.
	 *
	 * @return string | false
	 */
	public function fix_script_translation_files( $file, $handle, $domain ) {
		if ( ! $file || $domain !== 'reme' ) {
			return $file;
		}

		if ( is_file( $file ) ) {
			return $file;
		}

		if ( strpos( $file, WP_LANG_DIR . '/plugins' ) !== false ) {
			$file = str_replace( WP_LANG_DIR . '/plugins', WP_LANG_DIR . '/themes', $file );
		}

		return $file;
	}
}
