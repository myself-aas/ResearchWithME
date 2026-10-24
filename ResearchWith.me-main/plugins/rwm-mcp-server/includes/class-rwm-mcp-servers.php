<?php
/**
 * MCP server registration.
 *
 * Creates two focused MCP servers on top of the official adapter:
 *
 * - `researchwithme`          — the full scholarly publishing toolset.
 * - `researchwithme-readonly` — inspection only, safe for autonomous agents.
 *
 * @package RWM_MCP_Server
 */

namespace RWM_MCP;

defined( 'ABSPATH' ) || exit;

/**
 * Class RWM_MCP_Servers
 */
class RWM_MCP_Servers {

	/**
	 * Abilities that only read site state.
	 *
	 * @var string[]
	 */
	const READ_ABILITY_IDS = array(
		'reme/site-get-state',
		'reme/header-list-components',
		'reme/monetization-get-config',
		'rwm-pdf/list-editions',
		'rwm-pdf/get-article-pdf',
	);

	/**
	 * Abilities that change site configuration or produce artifacts.
	 *
	 * @var string[]
	 */
	const WRITE_ABILITY_IDS = array(
		'reme/appearance-update',
		'reme/appearance-apply-preset',
		'reme/header-configure',
		'reme/footer-configure',
		'reme/page-layout-update',
		'reme/site-set-theme-mod',
		'reme/site-set-performance',
		'reme/monetization-update',
		'rwm-pdf/compile-edition',
		'rwm-pdf/get-royalty-ledger',
	);

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function hooks() {
		add_action( 'mcp_adapter_init', array( $this, 'register_servers' ) );
		add_filter( 'mcp_adapter_default_server_tools', array( $this, 'filter_default_tools' ) );
	}

	/**
	 * Register both servers with the adapter.
	 *
	 * @param object $adapter The adapter instance passed by `mcp_adapter_init`.
	 *
	 * @return void
	 */
	public function register_servers( $adapter ) {
		if ( ! is_object( $adapter ) || ! method_exists( $adapter, 'create_server' ) ) {
			return;
		}

		$transports          = array( '\WP\MCP\Transport\HttpTransport' );
		$error_handler       = '\WP\MCP\Infrastructure\ErrorHandling\ErrorLogMcpErrorHandler';
		$observability       = '\WP\MCP\Infrastructure\Observability\NullMcpObservabilityHandler';

		if ( ! class_exists( ltrim( $transports[0], '\\' ) ) ) {
			return;
		}

		/**
		 * Filters the ability IDs exposed through the ResearchWith.me MCP server.
		 *
		 * @param string[] $tool_ids Ability IDs registered as MCP tools.
		 */
		$full_tool_ids = (array) apply_filters(
			'rwm_mcp_server_tool_ids',
			array_merge( self::READ_ABILITY_IDS, self::WRITE_ABILITY_IDS )
		);

		$full_tool_ids = array_values( array_filter( $full_tool_ids, array( $this, 'ability_exists' ) ) );

		if ( ! empty( $full_tool_ids ) ) {
			$adapter->create_server(
				RWM_MCP_SERVER_ID,
				RWM_MCP_NAMESPACE,
				RWM_MCP_ROUTE,
				'ResearchWith.me',
				'Scholarly publishing controls: read site state, adjust appearance, manage monetization, and compile PDF special editions.',
				RWM_MCP_VERSION,
				$transports,
				$error_handler,
				$observability,
				$full_tool_ids,
				array(),
				array()
			);
		}

		$readonly_tool_ids = array_values( array_filter( self::READ_ABILITY_IDS, array( $this, 'ability_exists' ) ) );

		if ( ! empty( $readonly_tool_ids ) ) {
			$adapter->create_server(
				'researchwithme-readonly',
				RWM_MCP_NAMESPACE,
				'researchwithme-readonly',
				'ResearchWith.me (read-only)',
				'Inspection-only tools for autonomous agents: site state, header components, monetization configuration, and edition indexes.',
				RWM_MCP_VERSION,
				$transports,
				$error_handler,
				$observability,
				$readonly_tool_ids,
				array(),
				array()
			);
		}
	}

	/**
	 * Keep ResearchWith.me abilities out of servers that should stay narrow.
	 *
	 * The default adapter server remains useful for discovery, so nothing is
	 * removed here by default; the filter exists so a site can prune it.
	 *
	 * @param string[] $tool_ids Default server tool IDs.
	 *
	 * @return string[]
	 */
	public function filter_default_tools( $tool_ids ) {
		/**
		 * Filters the default MCP server's tool list after ResearchWith.me loads.
		 *
		 * @param string[] $tool_ids Tool IDs.
		 */
		return (array) apply_filters( 'rwm_mcp_default_server_tool_ids', (array) $tool_ids );
	}

	/**
	 * Whether an ability is registered.
	 *
	 * @param string $ability_id Ability ID.
	 *
	 * @return bool
	 */
	public function ability_exists( $ability_id ) {
		if ( function_exists( 'wp_has_ability' ) ) {
			return (bool) wp_has_ability( $ability_id );
		}

		return true;
	}
}
