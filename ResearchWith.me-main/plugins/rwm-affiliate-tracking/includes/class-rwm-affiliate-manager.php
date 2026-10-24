<?php
/**
 * Affiliate Manager.
 *
 * @package RWM_Affiliate_Tracking
 */

namespace RWM_Affiliate_Tracking;

defined( 'ABSPATH' ) || exit;

/**
 * Class Affiliate_Manager
 *
 * Manages affiliate vendors, links, and commission tracking.
 */
class Affiliate_Manager {

	/**
	 * Singleton instance.
	 *
	 * @var Affiliate_Manager|null
	 */
	private static $instance = null;

	/**
	 * Get the singleton instance.
	 *
	 * @return Affiliate_Manager
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor.
	 */
	private function __construct() {
		add_action( 'init', array( $this, 'register_post_types' ), 0 );
		add_shortcode( 'reme_affiliate_link', array( $this, 'shortcode_link' ) );
		add_shortcode( 'reme_affiliate_product', array( $this, 'shortcode_product' ) );
		add_shortcode( 'reme_affiliate_comparison', array( $this, 'shortcode_comparison' ) );
		add_shortcode( 'reme_affiliate_disclosure', array( $this, 'shortcode_disclosure' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_assets' ), 20 );
		add_filter( 'reme_affiliate_schema_currency', array( $this, 'filter_schema_currency' ), 10, 2 );
	}

	/**
	 * Register custom post types for affiliate vendors and products.
	 *
	 * @return void
	 */
	public function register_post_types() {
		$vendor_labels = array(
			'name'               => __( 'Affiliate Vendors', 'rwm-affiliate-tracking' ),
			'singular_name'      => __( 'Affiliate Vendor', 'rwm-affiliate-tracking' ),
			'add_new'            => __( 'Add New', 'rwm-affiliate-tracking' ),
			'add_new_item'       => __( 'Add New Vendor', 'rwm-affiliate-tracking' ),
			'edit_item'          => __( 'Edit Vendor', 'rwm-affiliate-tracking' ),
			'new_item'           => __( 'New Vendor', 'rwm-affiliate-tracking' ),
			'view_item'          => __( 'View Vendor', 'rwm-affiliate-tracking' ),
			'search_items'       => __( 'Search Vendors', 'rwm-affiliate-tracking' ),
			'not_found'          => __( 'No vendors found.', 'rwm-affiliate-tracking' ),
			'not_found_in_trash' => __( 'No vendors found in trash.', 'rwm-affiliate-tracking' ),
			'all_items'          => __( 'All Vendors', 'rwm-affiliate-tracking' ),
		);

		register_post_type( 'rwm_affiliate_vendor', array(
			'labels'             => $vendor_labels,
			'public'             => true,
			'publicly_queryable' => true,
			'show_ui'            => true,
			'show_in_menu'       => true,
			'show_in_nav_menus'  => true,
			'menu_position'      => 26,
			'menu_icon'          => 'dashicons-cart',
			'can_export'         => true,
			'has_archive'        => true,
			'hierarchical'       => false,
			'exclude_from_search' => false,
			'capability_type'    => 'post',
			'map_meta_cap'       => true,
			'supports'           => array( 'title', 'editor', 'thumbnail', 'custom-fields' ),
			'rewrite'            => array( 'slug' => 'affiliate-vendors', 'with_front' => false ),
			'show_in_rest'       => true,
		) );

		$product_labels = array(
			'name'               => __( 'Affiliate Products', 'rwm-affiliate-tracking' ),
			'singular_name'      => __( 'Affiliate Product', 'rwm-affiliate-tracking' ),
			'add_new'            => __( 'Add New', 'rwm-affiliate-tracking' ),
			'add_new_item'       => __( 'Add New Product', 'rwm-affiliate-tracking' ),
			'edit_item'          => __( 'Edit Product', 'rwm-affiliate-tracking' ),
			'new_item'           => __( 'New Product', 'rwm-affiliate-tracking' ),
			'view_item'          => __( 'View Product', 'rwm-affiliate-tracking' ),
			'search_items'       => __( 'Search Products', 'rwm-affiliate-tracking' ),
			'not_found'          => __( 'No products found.', 'rwm-affiliate-tracking' ),
			'not_found_in_trash' => __( 'No products found in trash.', 'rwm-affiliate-tracking' ),
			'all_items'          => __( 'All Products', 'rwm-affiliate-tracking' ),
		);

		register_post_type( 'rwm_affiliate_product', array(
			'labels'             => $product_labels,
			'public'             => true,
			'publicly_queryable' => true,
			'show_ui'            => true,
			'show_in_menu'       => true,
			'show_in_nav_menus'  => true,
			'menu_position'      => 27,
			'menu_icon'          => 'dashicons-products',
			'can_export'         => true,
			'has_archive'        => true,
			'hierarchical'       => false,
			'exclude_from_search' => false,
			'capability_type'    => 'post',
			'map_meta_cap'       => true,
			'supports'           => array( 'title', 'editor', 'thumbnail', 'custom-fields' ),
			'rewrite'            => array( 'slug' => 'affiliate-products', 'with_front' => false ),
			'show_in_rest'       => true,
		) );
	}

	/**
	 * Shortcode: [reme_affiliate_link url vendor class]
	 *
	 * @param array $atts Shortcode attributes.
	 * @return string Rendered affiliate link.
	 */
	public function shortcode_link( $atts ) {
		$atts = shortcode_atts( array(
			'url'    => '',
			'vendor' => '',
			'class'  => 'reme-affiliate-link',
		), $atts, 'reme_affiliate_link' );

		if ( empty( $atts['url'] ) ) {
			return '';
		}

		$url   = esc_url( $atts['url'] );
		$vendor = sanitize_text_field( $atts['vendor'] );
		$class = sanitize_html_class( $atts['class'] );

		// Track the click via a nonce-verified redirect endpoint.
		$redirect_url = add_query_arg( array(
			'reme_aff_click' => 1,
			'url'            => urlencode( $url ),
			'_wpnonce'       => wp_create_nonce( 'reme_aff_click' ),
		), home_url( '/reme-affiliate-click/' ) );

		$output = '<a href="' . esc_url( $redirect_url ) . '" ';
		$output .= 'class="' . esc_attr( $class ) . '" ';
		$output .= 'rel="sponsored nofollow noopener" ';
		$output .= 'target="_blank" ';
		if ( $vendor ) {
			$output .= 'data-affiliate-vendor="' . esc_attr( $vendor ) . '" ';
		}
		$output .= '>';

		if ( ! empty( $atts['content'] ) ) {
			$output .= $atts['content'];
		} else {
			$output .= $vendor ? esc_html( $vendor ) : __( 'Visit Partner', 'rwm-affiliate-tracking' );
		}

		$output .= '</a>';

		return $output;
	}

	/**
	 * Shortcode: [reme_affiliate_product]
	 *
	 * @param array $atts Shortcode attributes.
	 * @return string Rendered affiliate product card.
	 */
	public function shortcode_product( $atts ) {
		$atts = shortcode_atts( array(
			'id'     => '',
			'vendor' => '',
			'price'  => '',
			'class'  => 'reme-affiliate-product',
		), $atts, 'reme_affiliate_product' );

		$product_id = (int) $atts['id'];
		$product    = get_post( $product_id );

		if ( ! $product || 'rwm_affiliate_product' !== $product->post_type ) {
			return '';
		}

		$title    = get_the_title( $product_id );
		$excerpt  = get_the_excerpt( $product_id );
		$thumb    = get_the_post_thumbnail_url( $product_id, 'thumbnail' );
		$price    = $atts['price'] ? $atts['price'] : get_post_meta( $product_id, '_rwm_aff_price', true );
		$currency = get_theme_mod( 'reme_affiliate_schema_currency', 'USD' );
		$url      = get_post_meta( $product_id, '_rwm_aff_url', true );
		$vendor   = $atts['vendor'] ? $atts['vendor'] : get_post_meta( $product_id, '_rwm_aff_vendor', true );

		$class = sanitize_html_class( $atts['class'] );

		ob_start();
		?>
		<div class="<?php echo esc_attr( $class ); ?>">
			<?php if ( $thumb ) : ?>
				<div class="reme-affiliate-product-thumb">
					<img src="<?php echo esc_url( $thumb ); ?>" alt="<?php echo esc_attr( $title ); ?>" />
				</div>
			<?php endif; ?>
			<h3 class="reme-affiliate-product-title"><?php echo esc_html( $title ); ?></h3>
			<?php if ( $excerpt ) : ?>
				<p class="reme-affiliate-product-excerpt"><?php echo wp_kses_post( $excerpt ); ?></p>
			<?php endif; ?>
			<?php if ( $price ) : ?>
				<p class="reme-affiliate-product-price"><span class="reme-affiliate-currency"><?php echo esc_html( $currency ); ?></span><?php echo esc_html( $price ); ?></p>
			<?php endif; ?>
			<?php if ( $url ) : ?>
				<a href="<?php echo esc_url( add_query_arg( array(
					'reme_aff_click' => 1,
					'url'            => urlencode( $url ),
					'_wpnonce'       => wp_create_nonce( 'reme_aff_click' ),
				), home_url( '/reme-affiliate-click/' ) ) ); ?>" rel="sponsored nofollow noopener" target="_blank" class="reme-affiliate-product-button">
					<?php esc_html_e( 'Buy Now', 'rwm-affiliate-tracking' ); ?>
				</a>
			<?php endif; ?>
			<?php if ( $vendor ) : ?>
				<p class="reme-affiliate-product-vendor"><?php echo esc_html( $vendor ); ?></p>
			<?php endif; ?>
		</div>
		<?php
		return ob_get_clean();
	}

	/**
	 * Shortcode: [reme_affiliate_comparison]
	 *
	 * @param array $atts Shortcode attributes.
	 * @return string Rendered comparison table.
	 */
	public function shortcode_comparison( $atts ) {
		$atts = shortcode_atts( array(
			'products' => '',
		), $atts, 'reme_affiliate_comparison' );

		$product_ids = array_filter( array_map( 'intval', explode( ',', $atts['products'] ) ) );

		if ( empty( $product_ids ) ) {
			return '';
		}

		ob_start();
		?>
		<table class="reme-affiliate-comparison">
			<thead>
				<tr>
					<th><?php esc_html_e( 'Product', 'rwm-affiliate-tracking' ); ?></th>
					<th><?php esc_html_e( 'Vendor', 'rwm-affiliate-tracking' ); ?></th>
					<th><?php esc_html_e( 'Price', 'rwm-affiliate-tracking' ); ?></th>
					<th><?php esc_html_e( 'Link', 'rwm-affiliate-tracking' ); ?></th>
				</tr>
			</thead>
			<tbody>
				<?php foreach ( $product_ids as $pid ) : $product = get_post( $pid ); if ( ! $product ) continue; ?>
				<tr>
					<td><?php echo esc_html( get_the_title( $pid ) ); ?></td>
					<td><?php echo esc_html( get_post_meta( $pid, '_rwm_aff_vendor', true ) ); ?></td>
					<td><?php echo esc_html( get_post_meta( $pid, '_rwm_aff_price', true ) ); ?></td>
					<td>
						<a href="<?php echo esc_url( add_query_arg( array(
							'reme_aff_click' => 1,
							'url'            => urlencode( get_post_meta( $pid, '_rwm_aff_url', true ) ),
							'_wpnonce'       => wp_create_nonce( 'reme_aff_click' ),
						), home_url( '/reme-affiliate-click/' ) ) ); ?>" rel="sponsored nofollow noopener" target="_blank"><?php esc_html_e( 'Visit', 'rwm-affiliate-tracking' ); ?></a>
					</td>
				</tr>
				<?php endforeach; ?>
			</tbody>
		</table>
		<?php
		return ob_get_clean();
	}

	/**
	 * Shortcode: [reme_affiliate_disclosure]
	 *
	 * @return string Rendered FTC disclosure.
	 */
	public function shortcode_disclosure() {
		return '<p class="reme-affiliate-disclosure">' . sprintf(
			/* translators: %s: site name. */
			__( 'This site contains affiliate links. As an affiliate publisher, ResearchWith.me may earn a commission from qualifying purchases at no additional cost to you. %s', 'rwm-affiliate-tracking' ),
			'<a href="' . esc_url( home_url( '/affiliate-disclosure/' ) ) . '">' . esc_html__( 'Learn more', 'rwm-affiliate-tracking' ) . '</a>'
		) . '</p>';
	}

	/**
	 * Enqueue frontend assets.
	 *
	 * @return void
	 */
	public function enqueue_assets() {
		wp_enqueue_style(
			'reme-affiliate',
			RWM_AFF_URL . 'assets/css/affiliate.css',
			array(),
			RWM_AFF_VERSION
		);
	}

	/**
	 * Filter schema currency for affiliate Product nodes.
	 *
	 * @param string $currency Current currency.
	 * @param string $context Context.
	 * @return string Currency code.
	 */
	public function filter_schema_currency( $currency, $context ) {
		return get_theme_mod( 'reme_affiliate_schema_currency', 'USD' );
	}
}
