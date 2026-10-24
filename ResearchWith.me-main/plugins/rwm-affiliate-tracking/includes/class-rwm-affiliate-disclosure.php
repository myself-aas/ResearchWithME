<?php
/**
 * Affiliate Disclosure page and settings.
 *
 * @package RWM_Affiliate_Tracking
 */

namespace RWM_Affiliate_Tracking;

defined( 'ABSPATH' ) || exit;

/**
 * Class Affiliate_Disclosure
 *
 * Creates the affiliate disclosure page and settings.
 */
class Affiliate_Disclosure {

	/**
	 * Singleton instance.
	 *
	 * @var Affiliate_Disclosure|null
	 */
	private static $instance = null;

	/**
	 * Get the singleton instance.
	 *
	 * @return Affiliate_Disclosure
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
		add_action( 'template_include', array( $this, 'template_include' ), 99 );
		add_action( 'admin_menu', array( $this, 'add_admin_menu' ) );
		add_action( 'wp_ajax_reme_affiliate_metadata', array( $this, 'ajax_metadata' ) );
	}

	/**
	 * Template include for the affiliate disclosure page.
	 *
	 * @param string $template Template path.
	 * @return string Template path.
	 */
	public function template_include( $template ) {
		if ( is_page( 'affiliate-disclosure' ) ) {
			return RWM_AFF_DIR . 'templates/disclosure.php';
		}
		return $template;
	}

	/**
	 * Add admin menu for affiliate settings.
	 *
	 * @return void
	 */
	public function add_admin_menu() {
		add_submenu_page(
			'options-general.php',
			__( 'Affiliate Tracking', 'rwm-affiliate-tracking' ),
			__( 'Affiliate Tracking', 'rwm-affiliate-tracking' ),
			'manage_options',
			'reme-affiliate-tracking',
			array( $this, 'render_settings_page' )
		);
	}

	/**
	 * Render the settings page.
	 *
	 * @return void
	 */
	public function render_settings_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'Affiliate Tracking Settings', 'rwm-affiliate-tracking' ); ?></h1>
			<form method="post" action="options.php">
				<?php settings_fields( 'reme_affiliate_settings' ); ?>
				<?php do_settings_sections( 'reme_affiliate_settings' ); ?>
				<?php submit_button(); ?>
			</form>
		</div>
		<?php
	}

	/**
	 * AJAX handler for affiliate vendor metadata lookup (uses WP HTTP API / Requests).
	 *
	 * @return void
	 */
	public function ajax_metadata() {
		check_ajax_referer( 'reme_affiliate_metadata', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Unauthorized.', 'rwm-affiliate-tracking' ) ) );
		}

		$url = isset( $_POST['url'] ) ? sanitize_text_field( wp_unslash( $_POST['url'] ) ) : '';

		if ( ! $url || ! filter_var( $url, FILTER_VALIDATE_URL ) ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Invalid URL.', 'rwm-affiliate-tracking' ) ) );
		}

		// Use the WordPress HTTP API (Requests library) to fetch vendor metadata.
		$response = wp_remote_get( $url, array(
			'timeout'     => 6,
			'redirection' => 3,
			'sslverify'   => true,
		) );

		if ( is_wp_error( $response ) ) {
			wp_send_json_error( array( 'message' => $response->get_error_message() ) );
		}

		$headers = wp_remote_retrieve_headers( $response );
		$body    = wp_remote_retrieve_body( $response );
		$code    = wp_remote_retrieve_response_code( $response );

		wp_send_json_success( array(
			'code'    => $code,
			'headers' => $headers,
			'body'    => substr( $body, 0, 500 ),
		) );
	}
}
