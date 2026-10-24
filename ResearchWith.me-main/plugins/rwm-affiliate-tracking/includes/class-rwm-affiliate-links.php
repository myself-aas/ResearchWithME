<?php
/**
 * Affiliate Links - automatic disclosure and click tracking.
 *
 * @package RWM_Affiliate_Tracking
 */

namespace RWM_Affiliate_Tracking;

defined( 'ABSPATH' ) || exit;

/**
 * Class Affiliate_Links
 *
 * Detects affiliate links in content and prepends FTC disclosure.
 */
class Affiliate_Links {

	/**
	 * Singleton instance.
	 *
	 * @var Affiliate_Links|null
	 */
	private static $instance = null;

	/**
	 * Whether the current post contains affiliate links.
	 *
	 * @var bool
	 */
	private $has_affiliate_links = false;

	/**
	 * Get the singleton instance.
	 *
	 * @return Affiliate_Links
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
		add_filter( 'the_content', array( $this, 'maybe_prepend_disclosure' ), 9 );
		add_action( 'template_redirect', array( $this, 'handle_click_redirect' ), 0 );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_assets' ) );
	}

	/**
	 * Prepend FTC disclosure when affiliate links are present.
	 *
	 * @param string $content Post content.
	 * @return string Filtered content.
	 */
	public function maybe_prepend_disclosure( $content ) {
		if ( ! is_singular() ) {
			return $content;
		}

		if ( $this->has_affiliate_links( $content ) ) {
			$this->has_affiliate_links = true;
			$disclosure = '<p class="reme-affiliate-disclosure">' . sprintf(
				/* translators: %s: site name. */
				__( 'This post contains affiliate links. As an affiliate publisher, ResearchWith.me may earn a commission from qualifying purchases at no additional cost to you.', 'rwm-affiliate-tracking' )
			) . '</p>';
			$content = $disclosure . $content;
		}

		return $content;
	}

	/**
	 * Check if content contains affiliate links.
	 *
	 * @param string $content Content to check.
	 * @return bool
	 */
	private function has_affiliate_links( $content ) {
		return (bool) preg_match( '/rel="[^"]*\bsponsored\b[^"]*"/i', $content );
	}

	/**
	 * Check if affiliate links exist (for template use).
	 *
	 * @return bool
	 */
	public function has_affiliate_links_flag() {
		return $this->has_affiliate_links;
	}

	/**
	 * Handle affiliate click redirect and tracking.
	 *
     * @return void
	 */
	public function handle_click_redirect() {
		if ( ! isset( $_GET['reme_aff_click'] ) || ! isset( $_GET['_wpnonce'] ) || ! isset( $_GET['url'] ) ) {
			return;
		}

		if ( ! wp_verify_nonce( sanitize_key( $_GET['_wpnonce'] ), 'reme_aff_click' ) ) {
			wp_die( esc_html__( 'Invalid nonce.', 'rwm-affiliate-tracking' ) );
		}

		$url = urldecode( sanitize_text_field( wp_unslash( $_GET['url'] ) ) );

		if ( ! $url || ! filter_var( $url, FILTER_VALIDATE_URL ) ) {
			wp_die( esc_html__( 'Invalid URL.', 'rwm-affiliate-tracking' ) );
		}

		// Log the click (optionally to a custom table or transient).
		$click_key = 'reme_aff_click_' . md5( $url );
		$count     = (int) get_transient( $click_key );
		set_transient( $click_key, $count + 1, DAY_IN_SECONDS );

		// Redirect to the vendor URL.
		wp_safe_redirect( $url );
		exit;
	}

	/**
	 * Enqueue admin assets.
	 *
	 * @return void
	 */
	public function enqueue_admin_assets() {
		// Admin CSS/JS for affiliate management can go here.
	}
}
