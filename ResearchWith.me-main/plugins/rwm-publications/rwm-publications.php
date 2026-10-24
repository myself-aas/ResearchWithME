<?php
/**
 * Plugin Name:       ResearchWith.me Publications
 * Plugin URI:        https://researchwith.me/plugins/rwm-publications
 * Description:       Adds a custom post type for scholarly publications / research papers with DOI, ORCID, licensing, and citation support.
 * Version:           1.0.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            ResearchWith.me
 * Author URI:        https://researchwith.me
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       rwm-publications
 * Domain Path:       /languages
 *
 * @package RWM_Publications
 */

defined( 'ABSPATH' ) || exit;

if ( ! defined( 'RWM_PUB_VERSION' ) ) {
	define( 'RWM_PUB_VERSION', '1.0.0' );
	define( 'RWM_PUB_FILE', __FILE__ );
	define( 'RWM_PUB_DIR', plugin_dir_path( __FILE__ ) );
	define( 'RWM_PUB_URL', plugin_dir_url( __FILE__ ) );
	define( 'RWM_PUB_MIN_PHP', '7.4' );
	define( 'RWM_PUB_MIN_WP', '6.0' );
}

require_once RWM_PUB_DIR . 'includes/class-rwm-publication-post-type.php';
require_once RWM_PUB_DIR . 'includes/class-rwm-publication-meta.php';
require_once RWM_PUB_DIR . 'includes/class-rwm-publication-taxonomy.php';

/**
 * Bootstrap the Publications plugin.
 *
 * @return void
 */
function rwm_publications_bootstrap() {
	if ( version_compare( PHP_VERSION, RWM_PUB_MIN_PHP, '<' ) ) {
		add_action(
			'admin_notices',
			static function () {
				printf(
					'<div class="notice notice-error"><p>%s</p></div>',
					esc_html(
						sprintf(
							/* translators: %s: minimum PHP version. */
							__( 'ResearchWith.me Publications requires PHP %s or newer.', 'rwm-publications' ),
							RWM_PUB_MIN_PHP
						)
					)
				);
			}
		);
		return;
	}

	\RWM_Publications\Publication_Post_Type::get_instance();
	\RWM_Publications\Publication_Meta::get_instance();
	\RWM_Publications\Publication_Taxonomy::get_instance();
}
add_action( 'plugins_loaded', 'rwm_publications_bootstrap' );

/**
 * Activation: register post type and flush rewrite rules.
 *
 * @return void
 */
function rwm_publications_activate() {
	require_once RWM_PUB_DIR . 'includes/class-rwm-publication-post-type.php';
	\RWM_Publications\Publication_Post_Type::register();
	flush_rewrite_rules();
}
register_activation_hook( __FILE__, 'rwm_publications_activate' );

/**
 * Deactivation: flush rewrite rules.
 *
 * @return void
 */
function rwm_publications_deactivate() {
	flush_rewrite_rules();
}
register_deactivation_hook( __FILE__, 'rwm_publications_deactivate' );
