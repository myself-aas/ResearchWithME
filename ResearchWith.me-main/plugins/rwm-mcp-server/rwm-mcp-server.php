<?php
/**
 * Plugin Name:       ResearchWith.me MCP Server
 * Plugin URI:        https://researchwith.me/plugins/rwm-mcp-server
 * Description:       Exposes ResearchWith.me theme and publishing abilities to AI agents over the Model Context Protocol, using the official WordPress MCP Adapter and Abilities API.
 * Version:           1.0.0
 * Requires at least: 6.9
 * Requires PHP:      7.4
 * Requires Plugins:  mcp-adapter, abilities-api
 * Author:            ResearchWith.me
 * Author URI:        https://researchwith.me
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       rwm-mcp-server
 * Domain Path:       /languages
 *
 * @package RWM_MCP_Server
 */

defined( 'ABSPATH' ) || exit;

define( 'RWM_MCP_VERSION', '1.0.0' );
define( 'RWM_MCP_DIR', plugin_dir_path( __FILE__ ) );
define( 'RWM_MCP_URL', plugin_dir_url( __FILE__ ) );
define( 'RWM_MCP_SERVER_ID', 'researchwithme' );
define( 'RWM_MCP_NAMESPACE', 'mcp' );
define( 'RWM_MCP_ROUTE', 'researchwithme' );

require_once RWM_MCP_DIR . 'includes/class-rwm-mcp-servers.php';
require_once RWM_MCP_DIR . 'includes/class-rwm-mcp-abilities.php';

/**
 * Boot the MCP integration.
 *
 * The MCP Adapter loads at `plugins_loaded`; registering on `mcp_adapter_init`
 * guarantees the adapter's classes and its ability discovery have run.
 *
 * @return void
 */
function rwm_mcp_bootstrap() {
	$servers = new \RWM_MCP\RWM_MCP_Servers();
	$servers->hooks();

	$abilities = new \RWM_MCP\RWM_MCP_Abilities();
	$abilities->hooks();
}
add_action( 'plugins_loaded', 'rwm_mcp_bootstrap', 20 );

/**
 * Admin notice shown when the MCP Adapter is not active.
 *
 * @return void
 */
function rwm_mcp_missing_adapter_notice() {
	if ( ! current_user_can( 'activate_plugins' ) ) {
		return;
	}

	if ( class_exists( '\WP\MCP\Core\McpAdapter' ) ) {
		return;
	}

	printf(
		'<div class="notice notice-warning"><p><strong>%1$s</strong> %2$s</p></div>',
		esc_html__( 'ResearchWith.me MCP Server:', 'rwm-mcp-server' ),
		esc_html__(
			'The MCP Adapter plugin is required for MCP endpoints to be created. Install and activate “MCP Adapter” (WordPress/mcp-adapter) to finish setup.',
			'rwm-mcp-server'
		)
	);
}
add_action( 'admin_notices', 'rwm_mcp_missing_adapter_notice' );

/**
 * Clear the cached ability manifest when the ability registry changes.
 *
 * @return void
 */
function rwm_mcp_flush_manifest() {
	delete_transient( 'rwm_mcp_ability_manifest' );
}
add_action( 'wp_abilities_api_init', 'rwm_mcp_flush_manifest', 99 );
