<?php
/**
 * Ad Management & Monetization System for ReMe.
 *
 * Implements high-performance, CLS-safe, lazy-loaded ad units for Google AdSense,
 * Adsterra, Mediavine, and custom ad networks.
 *
 * Standards: WordPress Coding Standards, Gutenberg Block Development Examples.
 *
 * @package ReMe\Views
 */

namespace ReMe\Views;

defined( 'ABSPATH' ) || exit;

/**
 * Class Ads_Manager
 *
 * @package ReMe\Views
 */
class Ads_Manager extends Base_View {

	/**
	 * Standard IAB Ad Dimensions.
	 *
	 * Used to reserve slot dimensions and eliminate Cumulative Layout Shift (CLS).
	 */
	const AD_SIZES = array(
		'leaderboard'        => array(
			'label'  => '728x90 Leaderboard',
			'width'  => 728,
			'height' => 90,
		),
		'rectangle'          => array(
			'label'  => '300x250 Medium Rectangle',
			'width'  => 300,
			'height' => 250,
		),
		'large-rectangle'    => array(
			'label'  => '336x280 Large Rectangle',
			'width'  => 336,
			'height' => 280,
		),
		'half-page'          => array(
			'label'  => '300x600 Half Page / Skyscraper',
			'width'  => 300,
			'height' => 600,
		),
		'billboard'          => array(
			'label'  => '970x250 Billboard',
			'width'  => 970,
			'height' => 250,
		),
		'mobile-leaderboard' => array(
			'label'  => '320x50 Mobile Banner',
			'width'  => 320,
			'height' => 50,
		),
		'responsive'         => array(
			'label'  => 'Responsive Fluid Unit',
			'width'  => 0,
			'height' => 100,
		),
	);

	/**
	 * Flag to ensure AdSense external library is enqueued only once.
	 *
	 * @var bool
	 */
	private static $adsense_enqueued = false;

	/**
	 * Initialize the feature.
	 *
	 * @return void
	 */
	public function init() {
		add_action( 'init', array( $this, 'register_ad_block' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_ad_scripts' ), 20 );
		add_filter( 'the_content', array( $this, 'maybe_inject_in_article_ad' ), 20 );
		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_editor_assets' ) );
		add_shortcode( 'reme_ad', array( $this, 'render_ad_shortcode' ) );
		add_filter( 'the_content', array( $this, 'append_after_content_ad' ), 30 );
		add_filter( 'wp_resource_hints', array( $this, 'add_ad_resource_hints' ), 10, 2 );
	}

	/**
	 * Preconnect to the ad network origins that will be used on this page.
	 *
	 * Saves a DNS/TLS round trip before the creative requests fire, which is
	 * the cheapest LCP win available when ads are enabled.
	 *
	 * @param array  $urls          Resource hint URLs.
	 * @param string $relation_type Hint type.
	 *
	 * @return array
	 */
	public function add_ad_resource_hints( $urls, $relation_type ) {
		if ( 'preconnect' !== $relation_type || is_admin() ) {
			return $urls;
		}

		if ( empty( get_theme_mod( 'reme_adsense_client_id', '' ) ) ) {
			return $urls;
		}

		$urls[] = 'https://pagead2.googlesyndication.com';
		$urls[] = array(
			'href'        => 'https://pagead2.googlesyndication.com',
			'crossorigin',
		);

		return $urls;
	}

	/**
	 * Register the dynamic Gutenberg Ad Unit block.
	 *
	 * Uses PHP render callback to isolate ad scripts and prevent editor lag.
	 *
	 * @return void
	 */
	public function register_ad_block() {
		if ( ! function_exists( 'register_block_type' ) ) {
			return;
		}

		register_block_type(
			'reme/ad-unit',
			array(
				'api_version'     => 2,
				'attributes'      => array(
					'network'      => array(
						'type'    => 'string',
						'default' => 'adsense',
					),
					'slotSize'     => array(
						'type'    => 'string',
						'default' => 'rectangle',
					),
					'adClient'     => array(
						'type'    => 'string',
						'default' => '',
					),
					'adSlot'       => array(
						'type'    => 'string',
						'default' => '',
					),
					'customCode'   => array(
						'type'    => 'string',
						'default' => '',
					),
					'imageUrl'     => array(
						'type'    => 'string',
						'default' => '',
					),
					'targetUrl'    => array(
						'type'    => 'string',
						'default' => '',
					),
					'label'        => array(
						'type'    => 'string',
						'default' => __( 'Advertisement', 'reme' ),
					),
					'lazyLoad'     => array(
						'type'    => 'boolean',
						'default' => true,
					),
					'reserveSpace' => array(
						'type'    => 'boolean',
						'default' => true,
					),
					'alignment'    => array(
						'type'    => 'string',
						'default' => 'center',
					),
				),
				'render_callback' => array( $this, 'render_ad_block_output' ),
			)
		);
	}

	/**
	 * Enqueue the shared block editor registration script.
	 *
	 * One hand-written bundle registers the ad unit and both affiliate blocks,
	 * so the theme keeps working without a build step.
	 *
	 * @return void
	 */
	public function enqueue_editor_assets() {
		wp_enqueue_script(
			'reme-monetization-blocks',
			REME_ASSETS_URL . 'js/blocks/monetization-blocks.js',
			array( 'wp-blocks', 'wp-block-editor', 'wp-components', 'wp-element', 'wp-i18n' ),
			REME_VERSION,
			true
		);

		wp_register_style( 'reme-monetization-blocks', false, array(), REME_VERSION );
		wp_enqueue_style( 'reme-monetization-blocks' );
		wp_add_inline_style(
			'reme-monetization-blocks',
			'.reme-block-preview{background:var(--rm-light-bg,#F8FAFC);border:2px dashed var(--rm-primary-accent,#2563EB);border-radius:8px;padding:22px;text-align:center}'
			. '.reme-block-preview__badge{display:inline-block;margin-top:8px;padding:4px 10px;border-radius:999px;background:var(--rm-primary-accent,#2563EB);color:#FFF;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px}'
		);
	}

	/**
	 * Enqueue front-end ad styling and lazy loading scripts.
	 *
	 * @return void
	 */
	public function enqueue_ad_scripts() {
		$css = '
			.rm-ad-wrapper { margin: 28px auto; text-align: center; clear: both; }
			.rm-ad-label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--rm-c-2, #64748B); margin-bottom: 6px; font-weight: 600; }
			.rm-ad-slot { position: relative; margin: 0 auto; background: var(--rm-light-bg, #F8FAFC); border: 1px dashed var(--rm-c-1, #E2E8F0); border-radius: 4px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
			.rm-ad-slot.rm-ad-loaded { border: none; background: transparent; }
			.rm-ad-align-left { margin-left: 0; margin-right: auto; }
			.rm-ad-align-right { margin-left: auto; margin-right: 0; }
			.rm-ad-align-center { margin-left: auto; margin-right: auto; }
			.rm-ad-banner-link { display: block; line-height: 0; }
			.rm-ad-banner-img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
			.rm-ad-editor-preview { padding: 20px; text-align: center; border: 2px dashed var(--rm-primary-accent, #2563EB); border-radius: 6px; background: var(--rm-light-bg, #F1F5F9); }
			.rm-ad-editor-badge { display: inline-block; padding: 4px 10px; font-size: 12px; font-weight: 700; background: var(--rm-primary-accent, #2563EB); color: #FFF; border-radius: 4px; text-transform: uppercase; }
		';
		wp_register_style( 'reme-ads', false, array(), REME_VERSION );
		wp_enqueue_style( 'reme-ads' );
		wp_add_inline_style( 'reme-ads', $css );

		// Lightweight IntersectionObserver lazy-loader script.
		$js = "
			document.addEventListener('DOMContentLoaded', function() {
				var lazyAds = document.querySelectorAll('.rm-ad-slot[data-lazy-ad=\"true\"]');
				if (!lazyAds.length) return;
				if ('IntersectionObserver' in window) {
					var observer = new IntersectionObserver(function(entries, obs) {
						entries.forEach(function(entry) {
							if (entry.isIntersecting) {
								var slot = entry.target;
								obs.unobserve(slot);
								var template = slot.querySelector('template.rm-ad-template');
								if (template) {
									var content = template.content ? template.content.cloneNode(true) : null;
									if (content) {
										slot.appendChild(content);
									} else {
										slot.innerHTML = template.innerHTML;
									}
									slot.classList.add('rm-ad-loaded');
									// Trigger AdSense if present
									if (slot.querySelector('.adsbygoogle') && window.adsbygoogle) {
										try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
									}
								}
							}
						});
					}, { rootMargin: '250px 0px' });
					lazyAds.forEach(function(ad) { observer.observe(ad); });
				} else {
					lazyAds.forEach(function(slot) {
						var template = slot.querySelector('template.rm-ad-template');
						if (template) {
							slot.innerHTML = template.innerHTML;
							slot.classList.add('rm-ad-loaded');
						}
					});
				}
			});
		";
		wp_register_script( 'reme-ads', false, array(), REME_VERSION, true );
		wp_enqueue_script( 'reme-ads' );
		wp_add_inline_script( 'reme-ads', $js );
	}

	/**
	 * Render callback for the dynamic Gutenberg Ad Unit block.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $content    Inner content (if any).
	 *
	 * @return string Rendered HTML.
	 */
	public function render_ad_block_output( $attributes, $content = '' ) {
		$network       = isset( $attributes['network'] ) ? sanitize_key( $attributes['network'] ) : 'adsense';
		$slot_size     = isset( $attributes['slotSize'] ) ? sanitize_key( $attributes['slotSize'] ) : 'rectangle';
		$ad_client     = isset( $attributes['adClient'] ) ? sanitize_text_field( $attributes['adClient'] ) : '';
		$ad_slot       = isset( $attributes['adSlot'] ) ? sanitize_text_field( $attributes['adSlot'] ) : '';
		$custom_code   = isset( $attributes['customCode'] ) ? $attributes['customCode'] : '';
		$image_url     = isset( $attributes['imageUrl'] ) ? esc_url_raw( $attributes['imageUrl'] ) : '';
		$target_url    = isset( $attributes['targetUrl'] ) ? esc_url_raw( $attributes['targetUrl'] ) : '';
		$label         = isset( $attributes['label'] ) ? sanitize_text_field( $attributes['label'] ) : __( 'Advertisement', 'reme' );
		$lazy_load     = ! empty( $attributes['lazyLoad'] );
		$reserve_space = ! empty( $attributes['reserveSpace'] );
		$alignment     = isset( $attributes['alignment'] ) ? sanitize_key( $attributes['alignment'] ) : 'center';

		// Block Editor Sandbox: render non-executing visual preview to prevent editor canvas lag.
		if ( is_admin() || wp_is_json_request() ) {
			return $this->render_editor_preview( $network, $slot_size, $label );
		}

		return $this->build_ad_markup(
			array(
				'network'       => $network,
				'slot_size'     => $slot_size,
				'ad_client'     => $ad_client,
				'ad_slot'       => $ad_slot,
				'custom_code'   => $custom_code,
				'image_url'     => $image_url,
				'target_url'    => $target_url,
				'label'         => $label,
				'lazy_load'     => $lazy_load,
				'reserve_space' => $reserve_space,
				'alignment'     => $alignment,
			)
		);
	}

	/**
	 * Build public HTML markup for an ad unit.
	 *
	 * Guarantees zero layout shift by outputting pre-calculated CSS min-height and width.
	 *
	 * @param array $args Ad arguments.
	 *
	 * @return string HTML output.
	 */
	public function build_ad_markup( $args ) {
		$size_info = isset( self::AD_SIZES[ $args['slot_size'] ] ) ? self::AD_SIZES[ $args['slot_size'] ] : self::AD_SIZES['rectangle'];
		$width     = $size_info['width'];
		$height    = $size_info['height'];

		// Calculate reserved container style.
		$slot_style = '';
		if ( $args['reserve_space'] && $height > 0 ) {
			$slot_style .= 'min-height:' . (int) $height . 'px;';
			if ( $width > 0 ) {
				$slot_style .= 'max-width:' . (int) $width . 'px;';
			} else {
				$slot_style .= 'width:100%;';
			}
		}

		$align_class = 'rm-ad-align-' . esc_attr( $args['alignment'] );

		// Assemble ad creative payload.
		$creative_html = $this->generate_creative_payload( $args, $width, $height );

		if ( empty( $creative_html ) ) {
			return '';
		}

		ob_start();
		?>
		<div class="rm-ad-wrapper <?php echo esc_attr( $align_class ); ?>" aria-label="<?php echo esc_attr( $args['label'] ); ?>">
			<?php if ( ! empty( $args['label'] ) ) : ?>
				<span class="rm-ad-label"><?php echo esc_html( $args['label'] ); ?></span>
			<?php endif; ?>
			<div class="rm-ad-slot" style="<?php echo esc_attr( $slot_style ); ?>" <?php echo $args['lazy_load'] ? 'data-lazy-ad="true"' : ''; ?>>
				<?php if ( $args['lazy_load'] ) : ?>
					<template class="rm-ad-template">
						<?php echo $creative_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
					</template>
				<?php else : ?>
					<?php echo $creative_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
				<?php endif; ?>
			</div>
		</div>
		<?php
		return ob_get_clean();
	}

	/**
	 * Generate specific creative payload depending on ad network.
	 *
	 * @param array $args   Ad settings.
	 * @param int   $width  Target width.
	 * @param int   $height Target height.
	 *
	 * @return string Creative HTML.
	 */
	private function generate_creative_payload( $args, $width, $height ) {
		switch ( $args['network'] ) {
			case 'adsense':
				if ( empty( $args['ad_client'] ) ) {
					return '';
				}
				$this->ensure_adsense_script( $args['ad_client'] );
				$ad_format = ( 0 === $width ) ? 'auto' : '';
				$style     = ( 0 === $width ) ? 'display:block;' : sprintf( 'display:inline-block;width:%dpx;height:%dpx;', (int) $width, (int) $height );

				return sprintf(
					'<ins class="adsbygoogle" style="%s" data-ad-client="%s" data-ad-slot="%s"%s></ins>',
					esc_attr( $style ),
					esc_attr( $args['ad_client'] ),
					esc_attr( $args['ad_slot'] ),
					$ad_format ? ' data-ad-format="auto" data-full-width-responsive="true"' : ''
				);

			case 'image':
				if ( empty( $args['image_url'] ) ) {
					return '';
				}
				$img = sprintf(
					'<img src="%s" alt="%s" class="rm-ad-banner-img" width="%d" height="%d" loading="lazy" />',
					esc_url( $args['image_url'] ),
					esc_attr( $args['label'] ),
					(int) $width,
					(int) $height
				);
				if ( ! empty( $args['target_url'] ) ) {
					return sprintf(
						'<a href="%s" target="_blank" rel="sponsored nofollow noopener" class="rm-ad-banner-link">%s</a>',
						esc_url( $args['target_url'] ),
						$img
					);
				}
				return $img;

			case 'adsterra':
			case 'mediavine':
			case 'custom':
			default:
				// Developers can paste network scripts, iframes, or tracking tags.
				return $args['custom_code'];
		}
	}

	/**
	 * Enqueue Google AdSense library asynchronously only once per request.
	 *
	 * The publisher ID comes from the unit being rendered, falling back to the
	 * Customizer setting, so a block that specifies its own ID still loads the
	 * correct script.
	 *
	 * @param string $client Publisher ID from the current unit.
	 *
	 * @return void
	 */
	private function ensure_adsense_script( $client = '' ) {
		if ( self::$adsense_enqueued ) {
			return;
		}

		$client = ! empty( $client ) ? $client : get_theme_mod( 'reme_adsense_client_id', '' );

		if ( empty( $client ) ) {
			return;
		}

		self::$adsense_enqueued = true;
		wp_enqueue_script(
			'reme-google-adsense',
			'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' . rawurlencode( $client ),
			array(),
			null,
			array(
				'strategy'  => 'async',
				'in_footer' => true,
			)
		);
	}

	/**
	 * Render non-executing preview inside block editor canvas.
	 *
	 * Protects the Gutenberg editor from third-party scripts that create lag.
	 *
	 * @param string $network   Network slug.
	 * @param string $slot_size Slot size slug.
	 * @param string $label     Label.
	 *
	 * @return string Preview markup.
	 */
	private function render_editor_preview( $network, $slot_size, $label ) {
		$size_info  = isset( self::AD_SIZES[ $slot_size ] ) ? self::AD_SIZES[ $slot_size ] : self::AD_SIZES['rectangle'];
		$size_label = $size_info['label'];

		return sprintf(
			'<div class="rm-ad-editor-preview">
				<span class="rm-ad-editor-badge">%s</span>
				<p style="margin:8px 0 4px;font-size:15px;font-weight:700;">%s</p>
				<p style="margin:0;font-size:12px;color:#64748B;">%s &bull; %s</p>
			</div>',
			esc_html( strtoupper( $network ) ),
			esc_html( $size_label ),
			esc_html( $label ),
			esc_html__( 'Live ad scripts are paused in editor to guarantee zero rendering lag', 'reme' )
		);
	}

	/**
	 * Shortcode callback for [reme_ad].
	 *
	 * @param array $atts Shortcode attributes.
	 *
	 * @return string HTML output.
	 */
	public function render_ad_shortcode( $atts ) {
		$args = shortcode_atts(
			array(
				'network'       => 'adsense',
				'slot_size'     => 'rectangle',
				'ad_client'     => get_theme_mod( 'reme_adsense_client_id', '' ),
				'ad_slot'       => '',
				'custom_code'   => '',
				'image_url'     => '',
				'target_url'    => '',
				'label'         => __( 'Advertisement', 'reme' ),
				'lazy_load'     => true,
				'reserve_space' => true,
				'alignment'     => 'center',
			),
			$atts,
			'reme_ad'
		);

		return $this->build_ad_markup( $args );
	}

	/**
	 * Automatically inject in-article ad unit after paragraph N on single posts.
	 *
	 * @param string $content Post content.
	 *
	 * @return string Filtered content.
	 */
	public function maybe_inject_in_article_ad( $content ) {
		if ( ! is_single() || ! in_the_loop() || ! is_main_query() ) {
			return $content;
		}

		$enabled = apply_filters( 'reme_enable_in_article_ad', get_theme_mod( 'reme_ads_in_article_enabled', false ) );
		if ( ! $enabled ) {
			return $content;
		}

		$paragraph_index = apply_filters( 'reme_in_article_ad_paragraph', (int) get_theme_mod( 'reme_ads_in_article_paragraph', 3 ) );
		$paragraphs      = explode( '</p>', $content );

		if ( count( $paragraphs ) <= $paragraph_index ) {
			return $content;
		}

		$ad_html = $this->build_ad_markup(
			array(
				'network'       => get_theme_mod( 'reme_in_article_ad_network', 'adsense' ),
				'slot_size'     => get_theme_mod( 'reme_in_article_ad_size', 'rectangle' ),
				'ad_client'     => get_theme_mod( 'reme_adsense_client_id', '' ),
				'ad_slot'       => get_theme_mod( 'reme_in_article_ad_slot', '' ),
				'custom_code'   => get_theme_mod( 'reme_in_article_ad_code', '' ),
				'image_url'     => get_theme_mod( 'reme_in_article_ad_image', '' ),
				'target_url'    => get_theme_mod( 'reme_in_article_ad_target', '' ),
				'label'         => __( 'Advertisement', 'reme' ),
				'lazy_load'     => true,
				'reserve_space' => true,
				'alignment'     => 'center',
			)
		);

		if ( empty( $ad_html ) ) {
			return $content;
		}

		$paragraphs[ $paragraph_index - 1 ] .= '</p>' . $ad_html;

		return implode( '</p>', $paragraphs );
	}

	/**
	 * Append the post-content ad unit to single articles.
	 *
	 * Runs later than in-article injection (priority 30 vs 20) so the two
	 * placements never compete for the same paragraph.
	 *
	 * @param string $content Post content.
	 *
	 * @return string Filtered content.
	 */
	public function append_after_content_ad( $content ) {
		if ( ! is_single() || ! in_the_loop() || ! is_main_query() ) {
			return $content;
		}

		$enabled = apply_filters( 'reme_enable_after_content_ad', get_theme_mod( 'reme_ads_after_content_enabled', false ) );
		if ( ! $enabled ) {
			return $content;
		}

		$ad_html = $this->build_ad_markup(
			array(
				'network'       => get_theme_mod( 'reme_after_content_ad_network', 'adsense' ),
				'slot_size'     => get_theme_mod( 'reme_after_content_ad_size', 'leaderboard' ),
				'ad_client'     => get_theme_mod( 'reme_adsense_client_id', '' ),
				'ad_slot'       => get_theme_mod( 'reme_after_content_ad_slot', '' ),
				'custom_code'   => get_theme_mod( 'reme_after_content_ad_code', '' ),
				'image_url'     => get_theme_mod( 'reme_after_content_ad_image', '' ),
				'target_url'    => get_theme_mod( 'reme_after_content_ad_target', '' ),
				'label'         => __( 'Advertisement', 'reme' ),
				'lazy_load'     => true,
				'reserve_space' => true,
				'alignment'     => 'center',
			)
		);

		return $content . $ad_html;
	}
}
