<?php
/**
 * Plugin Name:       ResearchWith.me Affiliate Tracking
 * Plugin URI:        https://researchwith.me/plugins/rwm-affiliate-tracking
 * Description:       Affiliate link tracking, disclosure, and commission accounting for publishers and writers. Uses the WordPress HTTP API (Requests) for vendor metadata lookups.
 * Version:           1.0.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            ResearchWith.me
 * Author URI:        https://researchwith.me
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       rwm-affiliate-tracking
 * Domain Path:       /languages
 *
 * @package RWM_Affiliate_Tracking
 */

defined( 'ABSPATH' ) || exit;

if ( ! defined( 'RWM_AFF_VERSION' ) ) {
	define( 'RWM_AFF_VERSION', '1.0.0' );
	define( 'RWM_AFF_FILE', __FILE__ );
	define( 'RWM_AFF_DIR', plugin_dir_path( __FILE__ ) );
	define( 'RWM_AFF_URL', plugin_dir_url( __FILE__ ) );
	define( 'RWM_AFF_MIN_PHP', '7.4' );
	define( 'RWM_AFF_MIN_WP', '6.0' );
}

require_once RWM_AFF_DIR . 'includes/class-rwm-affiliate-manager.php';
require_once RWM_AFF_DIR . 'includes/class-rwm-affiliate-links.php';
require_once RWM_AFF_DIR . 'includes/class-rwm-affiliate-disclosure.php';

/**
 * Bootstrap the Affiliate Tracking plugin.
 *
 * @return void
 */
function rwm_affiliate_bootstrap() {
	if ( version_compare( PHP_VERSION, RWM_AFF_MIN_PHP, '<' ) ) {
		add_action(
			'admin_notices',
			static function () {
				printf(
					'<div class="notice notice-error"><p>%s</p></div>',
					esc_html(
						sprintf(
							/* translators: %s: minimum PHP version. */
							__( 'ResearchWith.me Affiliate Tracking requires PHP %s or newer.', 'rwm-affiliate-tracking' ),
							RWM_AFF_MIN_PHP
						)
					)
				);
			}
		);
		return;
	}

	\RWM_Affiliate_Tracking\Affiliate_Manager::get_instance();
	\RWM_Affiliate_Tracking\Affiliate_Links::get_instance();
	\RWM_Affiliate_Tracking\Affiliate_Disclosure::get_instance();
}
add_action( 'plugins_loaded', 'rwm_affiliate_bootstrap' );
