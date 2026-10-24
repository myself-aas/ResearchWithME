<?php
/**
 * Breadcrumbs integration file.
 *
 * @package ReMe\Views
 */

namespace ReMe\Views;

use RankMath\Helpers\Api;
use WPSEO_Options;


/**
 * Class Yoast
 *
 * @package ReMe\Compatibility
 */
class Breadcrumbs extends Base_View {

	/**
	 * Module init.
	 */
	public function init() {
		add_action( 'reme_hfg_breadcrumb', array( $this, 'render_breadcrumbs' ), 10, 2 );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_styles' ), 40 );
		$this->load_theme_breadcrumbs();
	}

	/**
	 * Style the theme's own trail.
	 *
	 * Lives on its own empty handle so it never depends on the merged
	 * theme stylesheet, and only loads when the trail can render.
	 *
	 * @return void
	 */
	public function enqueue_styles() {
		if ( ! is_singular() ) {
			return;
		}

		wp_register_style( 'reme-breadcrumbs', false, array(), REME_VERSION );
		wp_enqueue_style( 'reme-breadcrumbs' );
		wp_add_inline_style(
			'reme-breadcrumbs',
			'.reme-breadcrumbs-wrapper{display:block;font-size:13px;letter-spacing:.02em;'
			. 'color:var(--rm-c-2,rgba(0,0,0,.6));margin-bottom:12px}'
			. '.reme-breadcrumbs a{color:inherit;text-decoration:none}'
			. '.reme-breadcrumbs a:hover,.reme-breadcrumbs a:focus{text-decoration:underline}'
			. '.reme-breadcrumbs__sep{margin:0 .45em;opacity:.6}'
			. '.reme-breadcrumbs [aria-current="page"]{font-weight:600}'
		);
	}

	/**
	 * Load hooks and filters.
	 */
	private function load_theme_breadcrumbs() {

		$breadcrumbs_hooks = apply_filters(
			'reme_breadcrumbs_locations',
			array(
				'reme_before_page_title',
				'reme_before_post_title',
			)
		);

		foreach ( $breadcrumbs_hooks as $hook ) {
			add_action( $hook, array( $this, 'render_theme_breadcrumbs' ) );
		}
	}

	/**
	 * Render breadcrumbs in ReMe theme.
	 *
	 * @return bool | void
	 */
	public function render_theme_breadcrumbs() {
		if ( ! $this->is_breadcrumb_enabled() ) {
			return false;
		}
		$this->render_breadcrumbs( 'small' );
	}

	/**
	 * Check if Yoast breadcrumbs are enabled.
	 *
	 * @return bool
	 */
	public function is_breadcrumb_enabled() {

		if ( ! apply_filters( 'reme_show_breadcrumbs', true ) ) {
			return false;
		}

		// Yoast breadcrumbs
		if ( function_exists( 'yoast_breadcrumb' ) ) {
			return WPSEO_Options::get( 'breadcrumbs-enable', false ) === true;
		}

		// SEOPress breadcrumbs
		if ( function_exists( 'seopress_display_breadcrumbs' ) ) {
			return true;
		}

		// Rank Math breadcrumbs
		if ( function_exists( 'rank_math_the_breadcrumbs' ) ) {
			return true;
		}

		if ( function_exists( 'bcn_display' ) ) {
			return true;
		}

		// No plugin owns breadcrumbs: render the theme's own trail so the
		// visible markup matches the BreadcrumbList schema.
		if ( self::has_native_trail() ) {
			return true;
		}

		return false;
	}

	/**
	 * Whether the theme has a trail to render without an SEO plugin.
	 *
	 * @return bool
	 */
	private static function has_native_trail() {
		if ( ! class_exists( '\ReMe\Views\Seo' ) || Seo::has_seo_plugin() ) {
			return false;
		}

		// Never compete with a plugin that already renders its own trail.
		if ( function_exists( 'bcn_display' ) ) {
			return false;
		}

		if ( ! is_singular() ) {
			return false;
		}

		/**
		 * Filters whether the theme renders its own breadcrumb trail.
		 *
		 * @param bool $enabled Whether to render.
		 */
		if ( ! apply_filters( 'reme_native_breadcrumbs', true ) ) {
			return false;
		}

		return count( Seo::breadcrumb_trail() ) > 1;
	}

	/**
	 * Render the theme's own breadcrumb trail.
	 *
	 * @param string $html_tag Wrapper HTML tag.
	 *
	 * @return void
	 */
	private static function render_native_trail( $html_tag ) {
		$trail = Seo::breadcrumb_trail();
		$last  = count( $trail ) - 1;

		echo '<' . esc_html( $html_tag ) . ' class="reme-breadcrumbs-wrapper">';
		echo '<nav class="reme-breadcrumbs" aria-label="' . esc_attr__( 'Breadcrumb', 'reme' ) . '">';

		foreach ( $trail as $index => $crumb ) {
			if ( $index > 0 ) {
				echo '<span class="reme-breadcrumbs__sep" aria-hidden="true">/</span>';
			}

			if ( $index === $last || empty( $crumb['url'] ) ) {
				echo '<span aria-current="page">' . esc_html( $crumb['name'] ) . '</span>';
				continue;
			}

			echo '<a href="' . esc_url( $crumb['url'] ) . '">' . esc_html( $crumb['name'] ) . '</a>';
		}

		echo '</nav></' . esc_html( $html_tag ) . '>';
	}

	/**
	 * Render Breadcrumbs.
	 *
	 * @param string $html_tag Wrapper HTML tag.
	 */
	public function render_breadcrumbs( $html_tag, $context = '' ) {
		if ( $context !== 'hfg' && is_front_page() ) {
			return;
		}
		if ( empty( $html_tag ) ) {
			$html_tag = 'small';
		}

		self::maybe_render_seo_breadcrumbs( $html_tag );
	}


	/**
	 * Render 3rd parties breadcrumbs
	 *
	 * @param string $html_tag Wrapper HTML tag.
	 * @param bool   $check Flag that controls if is needed to check if breadcrumbs are enabled in 3rd parties.
	 *
	 * @return bool
	 */
	public static function maybe_render_seo_breadcrumbs( $html_tag, $check = false ) {

		// Yoast breadcrumbs
		$yoast_breadcrumbs_enabled = true;
		if ( function_exists( 'yoast_breadcrumb' ) ) {
			if ( $check && class_exists( 'WPSEO_Options' ) && method_exists( 'WPSEO_Options', 'get' ) ) {
				$yoast_breadcrumbs_enabled = WPSEO_Options::get( 'breadcrumbs-enable', false );
			}
			if ( $yoast_breadcrumbs_enabled ) {
				yoast_breadcrumb( '<' . esc_html( $html_tag ) . ' class="rm--yoast-breadcrumb reme-breadcrumbs-wrapper">', '</' . esc_html( $html_tag ) . '>' );
				return true;
			}
		}

		// SEOPress breadcrumbs
		$seopress_breadcrumbs_enabled = true;
		if ( function_exists( 'seopress_display_breadcrumbs' ) ) {
			if ( $check ) {
				$seopress_breadcrumbs_enabled = get_option( 'seopress_toggle' );
			}
			if ( $seopress_breadcrumbs_enabled ) {
				echo '<' . esc_html( $html_tag ) . ' class="reme-breadcrumbs-wrapper">';
				seopress_display_breadcrumbs();
				echo '</' . esc_html( $html_tag ) . '>';
				return true;
			}
		}

		// Rank Math breadcrumbs
		$rankmath_breadcrumbs_enabled = true;
		if ( function_exists( 'rank_math_the_breadcrumbs' ) ) {
			if ( $check && class_exists( '\RankMath\Helpers\Api' ) ) {
				$rankmath_breadcrumbs_enabled = Api::get_settings( 'general.breadcrumbs' );
			}

			if ( $rankmath_breadcrumbs_enabled ) {
				echo '<' . esc_html( $html_tag ) . ' class="reme-breadcrumbs-wrapper">';
				rank_math_the_breadcrumbs(
					[
						'wrap_before' => '<nav aria-label="breadcrumbs" class="rank-math-breadcrumb">',
						'wrap_after'  => '</nav>',
					]
				);
				echo '</' . esc_html( $html_tag ) . '>';
				return true;
			}
		}

		// The theme's own trail (no SEO plugin active).
		if ( self::has_native_trail() ) {
			self::render_native_trail( $html_tag );

			return true;
		}

		// Breadcrumb NavXT breadcrumbs
		if ( function_exists( 'bcn_display' ) ) {
			echo '<small class="reme-breadcrumbs-wrapper">';
			bcn_display();
			echo '</small>';

			return true;
		}

		return false;
	}


}
