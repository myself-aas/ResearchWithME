<?php
/**
 * Plugin Name:       ResearchWith.me PDF & Special Editions
 * Plugin URI:        https://researchwith.me/plugins/rwm-pdf-editions
 * Description:       Generates downloadable scholarly PDFs for every article and compiles scheduled Special Editions (weekly, monthly, quarterly, half-yearly, yearly) by tag, category, or featured status, with full licensing and royalty accounting.
 * Version:           1.0.0
 * Requires at least: 6.5
 * Requires PHP:      7.4
 * Author:            ResearchWith.me
 * Author URI:        https://researchwith.me
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       rwm-pdf-editions
 * Domain Path:       /languages
 *
 * @package RWM_PDF_Editions
 */

defined( 'ABSPATH' ) || exit;

define( 'RWM_PDF_VERSION', '1.0.0' );
define( 'RWM_PDF_FILE', __FILE__ );
define( 'RWM_PDF_DIR', plugin_dir_path( __FILE__ ) );
define( 'RWM_PDF_URL', plugin_dir_url( __FILE__ ) );
define( 'RWM_PDF_MIN_PHP', '7.4' );
define( 'RWM_PDF_MIN_WP', '6.5' );

require_once RWM_PDF_DIR . 'includes/class-rwm-pdf-licensing.php';
require_once RWM_PDF_DIR . 'includes/class-rwm-pdf-generator.php';
require_once RWM_PDF_DIR . 'includes/class-rwm-pdf-editions.php';
require_once RWM_PDF_DIR . 'includes/class-rwm-pdf-settings.php';
require_once RWM_PDF_DIR . 'includes/class-rwm-pdf-abilities.php';
require_once RWM_PDF_DIR . 'includes/class-rwm-pdf-plugin.php';

/**
 * Bootstrap the plugin once WordPress has loaded.
 *
 * @return void
 */
function rwm_pdf_bootstrap() {
	if ( version_compare( PHP_VERSION, RWM_PDF_MIN_PHP, '<' ) ) {
		add_action(
			'admin_notices',
			static function () {
				printf(
					'<div class="notice notice-error"><p>%s</p></div>',
					esc_html(
						sprintf(
							/* translators: %s: minimum PHP version. */
							__( 'ResearchWith.me PDF & Special Editions requires PHP %s or newer.', 'rwm-pdf-editions' ),
							RWM_PDF_MIN_PHP
						)
					)
				);
			}
		);
		return;
	}

	\RWM_PDF\Includes\RWM_PDF_Plugin::instance();
}
add_action( 'plugins_loaded', 'rwm_pdf_bootstrap' );

/**
 * Activation routine: register post types then flush rewrite rules once.
 *
 * @return void
 */
function rwm_pdf_activate() {
	require_once RWM_PDF_DIR . 'includes/class-rwm-pdf-editions.php';
	\RWM_PDF\Includes\RWM_PDF_Editions::register_post_type();
	\RWM_PDF\Includes\RWM_PDF_Editions::schedule_cron();
	flush_rewrite_rules();
}
register_activation_hook( __FILE__, 'rwm_pdf_activate' );

/**
 * Deactivation routine: clear scheduled events and rewrite rules.
 *
 * @return void
 */
function rwm_pdf_deactivate() {
	wp_clear_scheduled_hook( 'rwm_pdf_build_scheduled_editions' );
	flush_rewrite_rules();
}
register_deactivation_hook( __FILE__, 'rwm_pdf_deactivate' );
