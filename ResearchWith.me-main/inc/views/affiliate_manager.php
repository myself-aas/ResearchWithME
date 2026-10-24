<?php
/**
 * Affiliate Marketing & Monetization Suite for ReMe.
 *
 * Provides high-converting, accessible product cards, comparison tables,
 * automated FTC disclosure notices, and safe metadata verification.
 *
 * Standards: WordPress-Coding-Standards, WordPress/Requests, WordPress/library.
 *
 * @package ReMe\Views
 */

namespace ReMe\Views;

defined( 'ABSPATH' ) || exit;

/**
 * Class Affiliate_Manager
 *
 * @package ReMe\Views
 */
class Affiliate_Manager extends Base_View {

	/**
	 * Default disclosure text.
	 */
	const DEFAULT_DISCLOSURE = 'Disclosure: ResearchWith.me is reader-supported. When you purchase through links on our site, we may earn an affiliate commission at no extra cost to you. This supports our independent open-science peer-review mission.';

	/**
	 * Initialize affiliate marketing suite.
	 *
	 * @return void
	 */
	public function init() {
		add_action( 'init', array( $this, 'register_affiliate_blocks' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_affiliate_styles' ), 20 );
		add_filter( 'the_content', array( $this, 'maybe_prepend_disclosure' ), 10 );
		add_shortcode( 'reme_affiliate_product', array( $this, 'render_product_shortcode' ) );
		add_shortcode( 'reme_affiliate_disclosure', array( $this, 'render_disclosure_shortcode' ) );
		add_shortcode( 'reme_affiliate_link', array( $this, 'render_link_shortcode' ) );
		add_action( 'wp_ajax_reme_fetch_affiliate_meta', array( $this, 'ajax_fetch_metadata' ) );
	}

	/**
	 * Register Gutenberg blocks for affiliate marketing.
	 *
	 * @return void
	 */
	public function register_affiliate_blocks() {
		if ( ! function_exists( 'register_block_type' ) ) {
			return;
		}

		register_block_type(
			'reme/affiliate-product',
			array(
				'api_version'     => 2,
				'attributes'      => array(
					'title'         => array( 'type' => 'string', 'default' => '' ),
					'brand'         => array( 'type' => 'string', 'default' => '' ),
					'badge'         => array( 'type' => 'string', 'default' => __( "Editor's Choice", 'reme' ) ),
					'rating'        => array( 'type' => 'number', 'default' => 4.8 ),
					'price'         => array( 'type' => 'string', 'default' => '' ),
					'originalPrice' => array( 'type' => 'string', 'default' => '' ),
					'affiliateUrl'  => array( 'type' => 'string', 'default' => '' ),
					'buttonText'    => array( 'type' => 'string', 'default' => __( 'Check Latest Price', 'reme' ) ),
					'couponCode'    => array( 'type' => 'string', 'default' => '' ),
					'imageUrl'      => array( 'type' => 'string', 'default' => '' ),
					'description'   => array( 'type' => 'string', 'default' => '' ),
					'pros'          => array( 'type' => 'string', 'default' => '' ),
					'cons'          => array( 'type' => 'string', 'default' => '' ),
				),
				'render_callback' => array( $this, 'render_product_card' ),
			)
		);

		register_block_type(
			'reme/affiliate-comparison',
			array(
				'api_version'     => 2,
				'attributes'      => array(
					'heading' => array( 'type' => 'string', 'default' => __( 'Top Recommendations at a Glance', 'reme' ) ),
					'items'   => array( 'type' => 'string', 'default' => '[]' ),
				),
				'render_callback' => array( $this, 'render_comparison_table' ),
			)
		);
	}

	/**
	 * Enqueue front-end CSS for affiliate components.
	 *
	 * @return void
	 */
	public function enqueue_affiliate_styles() {
		$css = '
			.rm-affiliate-disclosure { margin: 24px 0; padding: 14px 18px; border-left: 4px solid var(--rm-primary-accent, #2563EB); background: var(--rm-light-bg, #F8FAFC); border-radius: 0 6px 6px 0; font-size: 13px; line-height: 1.6; color: var(--rm-c-1, #475569); }
			.rm-affiliate-disclosure strong { color: var(--rm-c-0, #0F172A); }
			
			.rm-aff-card { position: relative; margin: 32px 0; padding: 28px; background: #FFFFFF; border: 1px solid var(--rm-c-1, #E2E8F0); border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); transition: transform 0.2s ease, box-shadow 0.2s ease; }
			.rm-aff-card:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,0,0,0.06); }
			.rm-aff-badge { position: absolute; top: -12px; left: 24px; background: var(--rm-primary-accent, #2563EB); color: #FFF; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; padding: 4px 12px; border-radius: 20px; box-shadow: 0 2px 6px rgba(37,99,235,0.3); }
			.rm-aff-grid { display: grid; grid-template-columns: 180px 1fr; gap: 24px; align-items: start; }
			@media (max-width: 640px) { .rm-aff-grid { grid-template-columns: 1fr; } }
			.rm-aff-thumb { border-radius: 8px; overflow: hidden; background: var(--rm-light-bg, #F1F5F9); display: flex; align-items: center; justify-content: center; min-height: 140px; }
			.rm-aff-thumb img { width: 100%; height: auto; object-fit: contain; display: block; }
			.rm-aff-content h3 { margin: 0 0 6px 0; font-size: 20px; color: var(--rm-c-0, #0F172A); }
			.rm-aff-brand { font-size: 13px; color: #64748B; margin-bottom: 8px; }
			.rm-aff-rating { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 700; color: #D97706; margin-bottom: 12px; }
			.rm-aff-pricing { display: flex; align-items: baseline; gap: 8px; margin-bottom: 14px; }
			.rm-aff-price { font-size: 22px; font-weight: 800; color: var(--rm-primary-accent, #2563EB); }
			.rm-aff-original-price { font-size: 14px; color: #94A3B8; text-decoration: line-through; }
			.rm-aff-desc { font-size: 14px; line-height: 1.6; color: var(--rm-c-1, #334155); margin-bottom: 16px; }
			.rm-aff-specs { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0; padding: 14px; background: var(--rm-light-bg, #F8FAFC); border-radius: 8px; font-size: 13px; }
			@media (max-width: 500px) { .rm-aff-specs { grid-template-columns: 1fr; } }
			.rm-aff-pros h4, .rm-aff-cons h4 { margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; font-weight: 700; }
			.rm-aff-pros h4 { color: #16A34A; }
			.rm-aff-cons h4 { color: #DC2626; }
			.rm-aff-pros ul, .rm-aff-cons ul { margin: 0; padding-left: 18px; line-height: 1.5; }
			.rm-aff-cta-wrap { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 18px; }
			.rm-aff-btn { display: inline-flex; align-items: center; justify-content: center; padding: 12px 24px; font-weight: 700; font-size: 14px; color: #FFF; background: var(--rm-primary-accent, #2563EB); border-radius: 6px; text-decoration: none; transition: background 0.2s ease; }
			.rm-aff-btn:hover { background: var(--rm-secondary-accent, #1D4ED8); color: #FFF; }
			.rm-aff-coupon { display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px; border: 1px dashed var(--rm-primary-accent, #2563EB); border-radius: 6px; font-size: 13px; font-weight: 600; color: var(--rm-primary-accent, #2563EB); background: #EFF6FF; cursor: pointer; }
			
			.rm-aff-table-wrap { overflow-x: auto; margin: 32px 0; }
			.rm-aff-table { width: 100%; border-collapse: collapse; font-size: 14px; text-align: left; background: #FFF; border: 1px solid var(--rm-c-1, #E2E8F0); border-radius: 8px; }
			.rm-aff-table th { background: var(--rm-light-bg, #F8FAFC); padding: 14px 18px; font-weight: 700; color: var(--rm-c-0, #0F172A); border-bottom: 2px solid var(--rm-c-1, #E2E8F0); }
			.rm-aff-table td { padding: 14px 18px; border-bottom: 1px solid var(--rm-c-1, #E2E8F0); vertical-align: middle; }
			.rm-aff-table tr.rm-featured-row { background: #F0FDF4; }
		';
		wp_register_style( 'reme-affiliate', false, array(), REME_VERSION );
		wp_enqueue_style( 'reme-affiliate' );
		wp_add_inline_style( 'reme-affiliate', $css );

		// Coupon copy helpers. Kept tiny and dependency-free so nothing blocks first paint.
		wp_register_script( 'reme-affiliate', false, array(), REME_VERSION, true );
		wp_enqueue_script( 'reme-affiliate' );
		wp_add_inline_script(
			'reme-affiliate',
			'document.addEventListener("click",function(e){var b=e.target.closest(".rm-aff-coupon");if(!b)return;var code=b.getAttribute("data-code");if(!code||!navigator.clipboard)return;navigator.clipboard.writeText(code).then(function(){b.classList.add("is-copied");b.textContent="Copied: "+code;setTimeout(function(){b.classList.remove("is-copied");b.textContent="\\u2702 "+code;},2000);});});'
		);
		wp_localize_script(
			'reme-affiliate',
			'remeAffiliate',
			array(
				'ajaxUrl' => admin_url( 'admin-ajax.php' ),
				'nonce'   => wp_create_nonce( 'reme_affiliate_nonce' ),
			)
		);
	}

	/**
	 * Prepend FTC compliance disclosure on single articles with affiliate content.
	 *
	 * @param string $content Post content.
	 *
	 * @return string Content with disclosure prepended.
	 */
	public function maybe_prepend_disclosure( $content ) {
		if ( ! is_singular( 'post' ) || ! in_the_loop() || ! is_main_query() ) {
			return $content;
		}

		$has_affiliate_blocks = has_block( 'reme/affiliate-product', $content )
			|| has_block( 'reme/affiliate-comparison', $content )
			|| has_shortcode( $content, 'reme_affiliate_product' )
			|| get_post_meta( get_the_ID(), '_reme_has_affiliate_links', true );

		if ( ! $has_affiliate_blocks ) {
			return $content;
		}

		$custom_text     = get_theme_mod( 'reme_affiliate_disclosure_text', self::DEFAULT_DISCLOSURE );
		$disclosure_html = sprintf(
			'<aside class="rm-affiliate-disclosure" role="note" aria-label="%s">%s</aside>',
			esc_attr__( 'Affiliate Disclosure', 'reme' ),
			wp_kses_post( $custom_text )
		);

		return $disclosure_html . $content;
	}

	/**
	 * Render single affiliate product card.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $content    Inner content.
	 *
	 * @return string Rendered HTML.
	 */
	public function render_product_card( $attributes, $content = '' ) {
		$title          = isset( $attributes['title'] ) ? sanitize_text_field( $attributes['title'] ) : '';
		$brand          = isset( $attributes['brand'] ) ? sanitize_text_field( $attributes['brand'] ) : '';
		$badge          = isset( $attributes['badge'] ) ? sanitize_text_field( $attributes['badge'] ) : '';
		$rating         = isset( $attributes['rating'] ) ? (float) $attributes['rating'] : 4.8;
		$price          = isset( $attributes['price'] ) ? sanitize_text_field( $attributes['price'] ) : '';
		$original_price = isset( $attributes['originalPrice'] ) ? sanitize_text_field( $attributes['originalPrice'] ) : '';
		$affiliate_url  = isset( $attributes['affiliateUrl'] ) ? esc_url_raw( $attributes['affiliateUrl'] ) : '#';
		$button_text    = isset( $attributes['buttonText'] ) && ! empty( $attributes['buttonText'] ) ? sanitize_text_field( $attributes['buttonText'] ) : __( 'Check Latest Price', 'reme' );
		$coupon_code    = isset( $attributes['couponCode'] ) ? sanitize_text_field( $attributes['couponCode'] ) : '';
		$image_url      = isset( $attributes['imageUrl'] ) ? esc_url_raw( $attributes['imageUrl'] ) : '';
		$description    = isset( $attributes['description'] ) ? wp_kses_post( $attributes['description'] ) : '';
		$pros           = isset( $attributes['pros'] ) ? sanitize_textarea_field( $attributes['pros'] ) : '';
		$cons           = isset( $attributes['cons'] ) ? sanitize_textarea_field( $attributes['cons'] ) : '';

		if ( empty( $title ) && empty( $image_url ) ) {
			return '';
		}

		// Feed the SEO schema graph with what actually rendered on this page.
		if ( class_exists( '\\ReMe\\Views\\Seo' ) ) {
			Seo::register_product(
				array(
					'name'        => $title,
					'brand'       => $brand,
					'description' => $description,
					'image'       => $image_url,
					'url'         => $affiliate_url,
					'price'       => $price,
					'price_numeric' => $this->parse_price( $price ),
					'currency'    => $this->detect_currency( $price ),
					'rating'      => $rating > 0 ? round( $rating, 2 ) : 0,
					'rating_count' => 0,
				)
			);
		}

		ob_start();
		?>
		<div class="rm-aff-card">
			<?php if ( ! empty( $badge ) ) : ?>
				<div class="rm-aff-badge"><?php echo esc_html( $badge ); ?></div>
			<?php endif; ?>

			<div class="rm-aff-grid">
				<?php if ( ! empty( $image_url ) ) : ?>
					<div class="rm-aff-thumb">
						<img src="<?php echo esc_url( $image_url ); ?>" alt="<?php echo esc_attr( $title ); ?>" loading="lazy" />
					</div>
				<?php endif; ?>

				<div class="rm-aff-content">
					<?php if ( ! empty( $title ) ) : ?>
						<h3><?php echo esc_html( $title ); ?></h3>
					<?php endif; ?>

					<?php if ( ! empty( $brand ) ) : ?>
						<div class="rm-aff-brand"><?php echo esc_html( $brand ); ?></div>
					<?php endif; ?>

					<?php if ( $rating > 0 ) : ?>
						<div class="rm-aff-rating" aria-label="<?php echo esc_attr( sprintf( __( 'Rating: %1$s out of 5 stars', 'reme' ), number_format( $rating, 1 ) ) ); ?>">
							<span>&#9733; <?php echo esc_html( number_format( $rating, 1 ) ); ?> / 5.0</span>
						</div>
					<?php endif; ?>

					<?php if ( ! empty( $price ) || ! empty( $original_price ) ) : ?>
						<div class="rm-aff-pricing">
							<?php if ( ! empty( $price ) ) : ?>
								<span class="rm-aff-price"><?php echo esc_html( $price ); ?></span>
							<?php endif; ?>
							<?php if ( ! empty( $original_price ) ) : ?>
								<span class="rm-aff-original-price"><?php echo esc_html( $original_price ); ?></span>
							<?php endif; ?>
						</div>
					<?php endif; ?>

					<?php if ( ! empty( $description ) ) : ?>
						<div class="rm-aff-desc"><?php echo wp_kses_post( $description ); ?></div>
					<?php endif; ?>

					<?php if ( ! empty( $pros ) || ! empty( $cons ) ) : ?>
						<div class="rm-aff-specs">
							<?php if ( ! empty( $pros ) ) : ?>
								<div class="rm-aff-pros">
									<h4>&#10003; <?php esc_html_e( 'Pros', 'reme' ); ?></h4>
									<ul>
										<?php
										foreach ( explode( "\n", $pros ) as $pro_line ) :
											$pro_line = trim( $pro_line );
											if ( ! empty( $pro_line ) ) :
												?>
												<li><?php echo esc_html( ltrim( $pro_line, '-*• ' ) ); ?></li>
												<?php
											endif;
										endforeach;
										?>
									</ul>
								</div>
							<?php endif; ?>

							<?php if ( ! empty( $cons ) ) : ?>
								<div class="rm-aff-cons">
									<h4>&#10007; <?php esc_html_e( 'Cons', 'reme' ); ?></h4>
									<ul>
										<?php
										foreach ( explode( "\n", $cons ) as $con_line ) :
											$con_line = trim( $con_line );
											if ( ! empty( $con_line ) ) :
												?>
												<li><?php echo esc_html( ltrim( $con_line, '-*• ' ) ); ?></li>
												<?php
											endif;
										endforeach;
										?>
									</ul>
								</div>
							<?php endif; ?>
						</div>
					<?php endif; ?>

					<div class="rm-aff-cta-wrap">
						<a href="<?php echo esc_url( $affiliate_url ); ?>"
						   class="rm-aff-btn"
						   target="_blank"
						   rel="sponsored nofollow noopener">
							<?php echo esc_html( $button_text ); ?> &rarr;
						</a>

						<?php if ( ! empty( $coupon_code ) ) : ?>
							<button type="button" class="rm-aff-coupon" data-code="<?php echo esc_attr( $coupon_code ); ?>" title="<?php esc_attr_e( 'Copy coupon code', 'reme' ); ?>">
								&#9986; <?php echo esc_html( $coupon_code ); ?>
							</button>
						<?php endif; ?>
					</div>
				</div>
			</div>
		</div>
		<?php
		return ob_get_clean();
	}

	/**
	 * Render comparison table for competing products.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $content    Inner content.
	 *
	 * @return string Rendered HTML.
	 */
	public function render_comparison_table( $attributes, $content = '' ) {
		$heading = isset( $attributes['heading'] ) ? sanitize_text_field( $attributes['heading'] ) : __( 'Comparison Matrix', 'reme' );
		$items   = isset( $attributes['items'] ) ? json_decode( $attributes['items'], true ) : array();

		if ( empty( $items ) || ! is_array( $items ) ) {
			return '';
		}

		ob_start();
		?>
		<div class="rm-aff-table-wrap">
			<?php if ( ! empty( $heading ) ) : ?>
				<h3><?php echo esc_html( $heading ); ?></h3>
			<?php endif; ?>
			<table class="rm-aff-table">
				<thead>
					<tr>
						<th><?php esc_html_e( 'Product / Service', 'reme' ); ?></th>
						<th><?php esc_html_e( 'Best For', 'reme' ); ?></th>
						<th><?php esc_html_e( 'Rating', 'reme' ); ?></th>
						<th><?php esc_html_e( 'Price', 'reme' ); ?></th>
						<th><?php esc_html_e( 'Action', 'reme' ); ?></th>
					</tr>
				</thead>
				<tbody>
					<?php foreach ( $items as $item ) : ?>
						<?php
						$item_name     = isset( $item['name'] ) ? sanitize_text_field( $item['name'] ) : '';
						$best_for      = isset( $item['bestFor'] ) ? sanitize_text_field( $item['bestFor'] ) : '';
						$item_rating   = isset( $item['rating'] ) ? (float) $item['rating'] : 4.5;
						$item_price    = isset( $item['price'] ) ? sanitize_text_field( $item['price'] ) : '';
						$item_url      = isset( $item['url'] ) ? esc_url_raw( $item['url'] ) : '#';
						$item_featured = ! empty( $item['isFeatured'] );

						if ( class_exists( '\\ReMe\\Views\\Seo' ) && ! empty( $item_name ) ) {
							Seo::register_product(
								array(
									'name'          => $item_name,
									'brand'         => '',
									'description'   => $best_for,
									'image'         => '',
									'url'           => $item_url,
									'price'         => $item_price,
									'price_numeric' => $this->parse_price( $item_price ),
									'currency'      => $this->detect_currency( $item_price ),
									'rating'        => $item_rating > 0 ? round( $item_rating, 2 ) : 0,
									'rating_count'  => 0,
								)
							);
						}
						?>
						<tr class="<?php echo $item_featured ? 'rm-featured-row' : ''; ?>">
							<td>
								<strong><?php echo esc_html( $item_name ); ?></strong>
								<?php if ( $item_featured ) : ?>
									<span class="rm-ad-editor-badge" style="margin-left: 6px; font-size: 10px;"><?php esc_html_e( 'Top Choice', 'reme' ); ?></span>
								<?php endif; ?>
							</td>
							<td><?php echo esc_html( $best_for ); ?></td>
							<td>&#9733; <?php echo esc_html( number_format( $item_rating, 1 ) ); ?></td>
							<td><?php echo esc_html( $item_price ); ?></td>
							<td>
								<a href="<?php echo esc_url( $item_url ); ?>"
								   class="rm-aff-btn"
								   style="padding: 6px 14px; font-size: 12px;"
								   target="_blank"
								   rel="sponsored nofollow noopener">
									<?php esc_html_e( 'View Deal', 'reme' ); ?> &rarr;
								</a>
							</td>
						</tr>
					<?php endforeach; ?>
				</tbody>
			</table>
		</div>
		<?php
		return ob_get_clean();
	}

	/**
	 * Extract a numeric price from a formatted string.
	 *
	 * @param string $price Formatted price, e.g. "$49.00/mo".
	 *
	 * @return string Numeric price or empty string.
	 */
	private function parse_price( $price ) {
		if ( ! preg_match( '/[0-9]+(?:[.,][0-9]{1,2})?/', (string) $price, $matches ) ) {
			return '';
		}

		return str_replace( ',', '.', $matches[0] );
	}

	/**
	 * Detect the currency used in a price string.
	 *
	 * @param string $price Formatted price.
	 *
	 * @return string ISO 4217 currency code.
	 */
	private function detect_currency( $price ) {
		$symbols = array(
			'€' => 'EUR',
			'£' => 'GBP',
			'¥' => 'JPY',
			'₹' => 'INR',
			'$' => 'USD',
		);

		foreach ( $symbols as $symbol => $code ) {
			if ( false !== strpos( (string) $price, $symbol ) ) {
				return $code;
			}
		}

		/**
		 * Filters the default currency for affiliate price schema.
		 *
		 * @param string $currency ISO 4217 code.
		 */
		return (string) apply_filters( 'reme_affiliate_schema_currency', 'USD' );
	}

	/**
	 * Shortcode callback for [reme_affiliate_product].
	 *
	 * @param array $atts Shortcode attributes.
	 *
	 * @return string HTML output.
	 */
	public function render_product_shortcode( $atts ) {
		$args = shortcode_atts(
			array(
				'title'          => '',
				'brand'          => '',
				'badge'          => __( "Editor's Choice", 'reme' ),
				'rating'         => 4.8,
				'price'          => '',
				'original_price' => '',
				'url'            => '#',
				'button_text'    => __( 'Check Latest Price', 'reme' ),
				'coupon_code'    => '',
				'image_url'      => '',
				'description'    => '',
				'pros'           => '',
				'cons'           => '',
			),
			$atts,
			'reme_affiliate_product'
		);

		return $this->render_product_card(
			array(
				'title'         => $args['title'],
				'brand'         => $args['brand'],
				'badge'         => $args['badge'],
				'rating'        => (float) $args['rating'],
				'price'         => $args['price'],
				'originalPrice' => $args['original_price'],
				'affiliateUrl'  => $args['url'],
				'buttonText'    => $args['button_text'],
				'couponCode'    => $args['coupon_code'],
				'imageUrl'      => $args['image_url'],
				'description'   => $args['description'],
				'pros'          => $args['pros'],
				'cons'          => $args['cons'],
			)
		);
	}

	/**
	 * Shortcode callback for [reme_affiliate_disclosure].
	 *
	 * @param array $atts Shortcode attributes.
	 *
	 * @return string HTML output.
	 */
	public function render_disclosure_shortcode( $atts ) {
		$text = get_theme_mod( 'reme_affiliate_disclosure_text', self::DEFAULT_DISCLOSURE );
		return sprintf(
			'<aside class="rm-affiliate-disclosure" role="note" aria-label="%s">%s</aside>',
			esc_attr__( 'Affiliate Disclosure', 'reme' ),
			wp_kses_post( $text )
		);
	}

	/**
	 * Shortcode callback for an inline affiliate link.
	 *
	 * Usage: [reme_affiliate_link url="https://…" vendor="Acme"]Read the review[/reme_affiliate_link]
	 *
	 * @param array  $atts    Shortcode attributes.
	 * @param string $content Link text.
	 *
	 * @return string Markup.
	 */
	public function render_link_shortcode( $atts, $content = '' ) {
		$atts = shortcode_atts(
			array(
				'url'    => '',
				'vendor' => '',
				'class'  => '',
			),
			$atts,
			'reme_affiliate_link'
		);

		$url = esc_url_raw( $atts['url'] );

		if ( empty( $url ) ) {
			return '';
		}

		$text = ! empty( $content ) ? $content : esc_html__( 'View offer', 'reme' );
		$rel  = 'sponsored nofollow noopener';

		return sprintf(
			'<a href="%1$s" class="rm-aff-link %2$s" target="_blank" rel="%3$s"%4$s>%5$s</a>',
			esc_url( $url ),
			esc_attr( $atts['class'] ),
			esc_attr( $rel ),
			$atts['vendor'] ? ' data-vendor="' . esc_attr( sanitize_text_field( $atts['vendor'] ) ) . '"' : '',
			wp_kses_post( $text )
		);
	}

	/**
	 * AJAX endpoint to securely fetch Open Graph metadata from affiliate destination URL.
	 *
	 * Adheres to WordPress HTTP API and Requests library standards.
	 *
	 * @return void
	 */
	public function ajax_fetch_metadata() {
		check_ajax_referer( 'reme_affiliate_nonce', 'nonce' );

		if ( ! current_user_can( 'edit_posts' ) ) {
			wp_send_json_error( array( 'message' => __( 'Unauthorized user permission', 'reme' ) ), 403 );
		}

		$url = isset( $_POST['url'] ) ? esc_url_raw( wp_unslash( $_POST['url'] ) ) : '';
		if ( empty( $url ) || ! filter_var( $url, FILTER_VALIDATE_URL ) ) {
			wp_send_json_error( array( 'message' => __( 'Invalid URL provided', 'reme' ) ), 400 );
		}

		$response = wp_remote_get(
			$url,
			array(
				'timeout'     => 6,
				'redirection' => 3,
				'user-agent'  => 'ResearchWith.me Metadata Verifier/1.0',
				'sslverify'   => true,
			)
		);

		if ( is_wp_error( $response ) ) {
			wp_send_json_error( array( 'message' => $response->get_error_message() ), 500 );
		}

		$body = wp_remote_retrieve_body( $response );
		if ( empty( $body ) ) {
			wp_send_json_error( array( 'message' => __( 'Empty response body from destination', 'reme' ) ), 500 );
		}

		$meta = array(
			'title'       => '',
			'description' => '',
			'image'       => '',
		);

		// Extract OpenGraph tags safely.
		if ( preg_match( '/<meta property="og:title" content="([^"]+)"/i', $body, $matches ) ) {
			$meta['title'] = html_entity_decode( $matches[1], ENT_QUOTES, 'UTF-8' );
		} elseif ( preg_match( '/<title>(.*?)<\/title>/is', $body, $matches ) ) {
			$meta['title'] = html_entity_decode( trim( $matches[1] ), ENT_QUOTES, 'UTF-8' );
		}

		if ( preg_match( '/<meta property="og:description" content="([^"]+)"/i', $body, $matches ) ) {
			$meta['description'] = html_entity_decode( $matches[1], ENT_QUOTES, 'UTF-8' );
		}

		if ( preg_match( '/<meta property="og:image" content="([^"]+)"/i', $body, $matches ) ) {
			$meta['image'] = esc_url_raw( $matches[1] );
		}

		wp_send_json_success( $meta );
	}
}
