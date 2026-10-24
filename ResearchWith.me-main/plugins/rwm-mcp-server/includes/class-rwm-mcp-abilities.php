<?php
/**
 * MCP-facing abilities.
 *
 * Adds two introspection abilities so remote agents can describe the server
 * without guessing endpoints, and so humans can audit what is exposed.
 *
 * @package RWM_MCP_Server
 */

namespace RWM_MCP;

defined( 'ABSPATH' ) || exit;

/**
 * Class RWM_MCP_Abilities
 */
class RWM_MCP_Abilities {

	/**
	 * Ability category.
	 */
	const CATEGORY = 'rwm-mcp';

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function hooks() {
		if ( ! function_exists( 'wp_register_ability' ) ) {
			return;
		}

		add_action( 'wp_abilities_api_categories_init', array( $this, 'register_category' ) );
		add_action( 'wp_abilities_api_init', array( $this, 'register_abilities' ) );
	}

	/**
	 * Register the category.
	 *
	 * @return void
	 */
	public function register_category() {
		if ( ! function_exists( 'wp_register_ability_category' ) ) {
			return;
		}

		if ( function_exists( 'wp_has_ability_category' ) && wp_has_ability_category( self::CATEGORY ) ) {
			return;
		}

		wp_register_ability_category(
			self::CATEGORY,
			array(
				'label'       => __( 'MCP Server', 'rwm-mcp-server' ),
				'description' => __( 'Describe the ResearchWith.me MCP endpoints and exposed tools.', 'rwm-mcp-server' ),
			)
		);
	}

	/**
	 * Register abilities.
	 *
	 * @return void
	 */
	public function register_abilities() {
		$this->register(
			'rwm-mcp/get-server-info',
			__( 'Get MCP server info', 'rwm-mcp-server' ),
			__( 'Returns MCP endpoint URLs, transport details, and the count of exposed tools for ResearchWith.me.', 'rwm-mcp-server' ),
			'read',
			array( $this, 'get_server_info' )
		);

		$this->register(
			'rwm-mcp/get-tool-catalog',
			__( 'Get MCP tool catalog', 'rwm-mcp-server' ),
			__( 'Lists every ability exposed by the ResearchWith.me MCP servers, split into read-only and write tools, with labels and descriptions.', 'rwm-mcp-server' ),
			'read',
			array( $this, 'get_tool_catalog' )
		);
	}

	/**
	 * Register one ability.
	 *
	 * @param string   $id          Ability ID.
	 * @param string   $label       Label.
	 * @param string   $description Description.
	 * @param string   $mode        Either "read" or "write".
	 * @param callable $callback    Execute callback.
	 *
	 * @return void
	 */
	private function register( $id, $label, $description, $mode, $callback ) {
		if ( function_exists( 'wp_has_ability' ) && wp_has_ability( $id ) ) {
			return;
		}

		wp_register_ability(
			$id,
			array(
				'label'               => $label,
				'description'         => $description,
				'category'            => self::CATEGORY,
				'input_schema'        => array(
					'type'       => 'object',
					'properties' => array(
						'noop' => array(
							'type'        => 'boolean',
							'description' => 'Optional compatibility flag for clients that cannot send an empty object.',
						),
					),
				),
				'output_schema'       => array(
					'type'                 => 'object',
					'additionalProperties' => true,
				),
				'execute_callback'    => static function ( $input = array() ) use ( $callback ) {
					return call_user_func( $callback, is_array( $input ) ? $input : array() );
				},
				'permission_callback' => static function () {
					return current_user_can( 'edit_posts' );
				},
				'meta'                => array(
					'show_in_rest' => true,
					'annotations'  => array(
						'readonly'   => 'read' === $mode,
						'idempotent' => true,
						'destructive' => false,
					),
					'mcp'          => array(
						'public' => true,
						'type'   => 'tool',
					),
				),
			)
		);
	}

	/**
	 * Server endpoint information.
	 *
	 * @param array $input Input.
	 *
	 * @return array
	 */
	public function get_server_info( array $input ) {
		$servers = array(
			array(
				'id'            => RWM_MCP_SERVER_ID,
				'name'          => 'ResearchWith.me',
				'endpoint'      => rest_url( RWM_MCP_NAMESPACE . '/' . RWM_MCP_ROUTE ),
				'transport'     => 'http',
				'tool_count'    => count( $this->exposed_ids( 'full' ) ),
				'mode'          => 'read-write',
			),
			array(
				'id'            => 'researchwithme-readonly',
				'name'          => 'ResearchWith.me (read-only)',
				'endpoint'      => rest_url( RWM_MCP_NAMESPACE . '/researchwithme-readonly' ),
				'transport'     => 'http',
				'tool_count'    => count( $this->exposed_ids( 'read' ) ),
				'mode'          => 'read-only',
			),
		);

		return array(
			'site_url'     => home_url( '/' ),
			'adapter'      => class_exists( '\WP\MCP\Core\McpAdapter' ) ? 'active' : 'missing',
			'abilities_api' => function_exists( 'wp_register_ability' ) ? 'active' : 'missing',
			'protocol'     => 'Model Context Protocol',
			'servers'      => $servers,
			'stdio'        => array(
				'command' => 'wp mcp-adapter serve --server=' . RWM_MCP_SERVER_ID,
				'note'    => __( 'Requires WP-CLI and the MCP Adapter CLI bridge.', 'rwm-mcp-server' ),
			),
		);
	}

	/**
	 * Catalog of exposed abilities.
	 *
	 * @param array $input Input.
	 *
	 * @return array
	 */
	public function get_tool_catalog( array $input ) {
		$catalog = array(
			'read'  => array(),
			'write' => array(),
		);

		$groups = array(
			'read'  => RWM_MCP_Servers::READ_ABILITY_IDS,
			'write' => RWM_MCP_Servers::WRITE_ABILITY_IDS,
		);

		foreach ( $groups as $mode => $ids ) {
			foreach ( $ids as $id ) {
				if ( function_exists( 'wp_has_ability' ) && ! wp_has_ability( $id ) ) {
					continue;
				}

				$catalog[ $mode ][] = array(
					'id'          => $id,
					'tool_name'   => str_replace( '/', '-', $id ),
					'label'       => function_exists( 'wp_get_ability' ) ? (string) wp_get_ability( $id )->get_label() : $id,
					'description' => function_exists( 'wp_get_ability' ) ? (string) wp_get_ability( $id )->get_description() : '',
				);
			}
		}

		return $catalog;
	}

	/**
	 * IDs exposed for a given mode.
	 *
	 * @param string $mode "full" or "read".
	 *
	 * @return string[]
	 */
	private function exposed_ids( $mode ) {
		$ids = 'read' === $mode
			? RWM_MCP_Servers::READ_ABILITY_IDS
			: array_merge( RWM_MCP_Servers::READ_ABILITY_IDS, RWM_MCP_Servers::WRITE_ABILITY_IDS );

		if ( ! function_exists( 'wp_has_ability' ) ) {
			return $ids;
		}

		return array_values( array_filter( $ids, 'wp_has_ability' ) );
	}
}
