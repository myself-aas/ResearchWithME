<?php
/**
 * Abilities API integration.
 *
 * Exposes PDF and edition operations as WordPress Abilities so they can be
 * discovered and invoked by AI agents (including through the MCP adapter).
 *
 * @package RWM_PDF_Editions
 */

namespace RWM_PDF\Includes;

defined( 'ABSPATH' ) || exit;

/**
 * Class RWM_PDF_Abilities
 */
class RWM_PDF_Abilities {

	/**
	 * Category slug.
	 */
	const CATEGORY = 'rwm-pdf';

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function init() {
		if ( ! function_exists( 'wp_register_ability' ) ) {
			return;
		}

		add_action( 'wp_abilities_api_categories_init', array( $this, 'register_category' ) );
		add_action( 'wp_abilities_api_init', array( $this, 'register_abilities' ) );
	}

	/**
	 * Register the ability category.
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
				'label'       => __( 'PDF Editions', 'rwm-pdf-editions' ),
				'description' => __( 'Generate article PDFs and compile scholarly special editions.', 'rwm-pdf-editions' ),
			)
		);
	}

	/**
	 * Register all abilities.
	 *
	 * @return void
	 */
	public function register_abilities() {
		$this->register_ability(
			'rwm-pdf/list-editions',
			array(
				'label'       => __( 'List special editions', 'rwm-pdf-editions' ),
				'description' => __( 'Returns compiled special editions with cadence, period, article count, and download URL.', 'rwm-pdf-editions' ),
				'capability'  => 'edit_posts',
				'annotations' => array(
					'readonly'   => true,
					'idempotent' => true,
				),
				'input'       => array(
					'type'       => 'object',
					'properties' => array(
						'cadence' => array(
							'type' => 'string',
							'enum' => array_keys( RWM_PDF_Editions::CADENCES ),
						),
						'limit'   => array(
							'type'    => 'integer',
							'minimum' => 1,
							'maximum' => 50,
						),
					),
				),
				'callback'    => array( $this, 'list_editions' ),
			)
		);

		$this->register_ability(
			'rwm-pdf/compile-edition',
			array(
				'label'       => __( 'Compile a special edition', 'rwm-pdf-editions' ),
				'description' => __( 'Compiles a new special edition for a cadence, period offset, and optional tag/category/featured filters.', 'rwm-pdf-editions' ),
				'capability'  => 'edit_others_posts',
				'annotations' => array(
					'readonly'    => false,
					'destructive' => false,
					'idempotent'  => false,
				),
				'input'       => array(
					'type'       => 'object',
					'required'   => array( 'cadence' ),
					'properties' => array(
						'cadence'       => array(
							'type' => 'string',
							'enum' => array_keys( RWM_PDF_Editions::CADENCES ),
						),
						'period_offset' => array(
							'type'    => 'integer',
							'minimum' => 0,
							'maximum' => 52,
						),
						'tags'          => array(
							'type'  => 'array',
							'items' => array( 'type' => 'integer' ),
						),
						'categories'    => array(
							'type'  => 'array',
							'items' => array( 'type' => 'integer' ),
						),
						'featured_only' => array( 'type' => 'boolean' ),
						'limit'         => array(
							'type'    => 'integer',
							'minimum' => 1,
							'maximum' => 100,
						),
						'royalty_pool'  => array(
							'type'    => 'number',
							'minimum' => 0,
						),
					),
				),
				'callback'    => array( $this, 'compile_edition' ),
			)
		);

		$this->register_ability(
			'rwm-pdf/get-article-pdf',
			array(
				'label'       => __( 'Get article PDF link', 'rwm-pdf-editions' ),
				'description' => __( 'Returns the download URL, DOI, and license for a single article PDF.', 'rwm-pdf-editions' ),
				'capability'  => 'edit_posts',
				'annotations' => array(
					'readonly'   => true,
					'idempotent' => true,
				),
				'input'       => array(
					'type'       => 'object',
					'required'   => array( 'post_id' ),
					'properties' => array(
						'post_id' => array( 'type' => 'integer' ),
					),
				),
				'callback'    => array( $this, 'get_article_pdf' ),
			)
		);

		$this->register_ability(
			'rwm-pdf/get-royalty-ledger',
			array(
				'label'       => __( 'Get edition royalty ledger', 'rwm-pdf-editions' ),
				'description' => __( 'Returns the contributor royalty shares and verification tokens recorded for an edition.', 'rwm-pdf-editions' ),
				'capability'  => 'manage_options',
				'annotations' => array(
					'readonly'   => true,
					'idempotent' => true,
				),
				'input'       => array(
					'type'       => 'object',
					'required'   => array( 'edition_id' ),
					'properties' => array(
						'edition_id' => array( 'type' => 'integer' ),
					),
				),
				'callback'    => array( $this, 'get_royalty_ledger' ),
			)
		);
	}

	/**
	 * Register one ability with MCP exposure metadata.
	 *
	 * @param string $id   Ability ID.
	 * @param array  $args Ability arguments.
	 *
	 * @return void
	 */
	private function register_ability( $id, array $args ) {
		if ( function_exists( 'wp_has_ability' ) && wp_has_ability( $id ) ) {
			return;
		}

		wp_register_ability(
			$id,
			array(
				'label'               => $args['label'],
				'description'         => $args['description'],
				'category'            => self::CATEGORY,
				'input_schema'        => $args['input'],
				'output_schema'       => array(
					'type'                 => 'object',
					'additionalProperties' => true,
				),
				'execute_callback'    => function ( $input = array() ) use ( $args ) {
					$result = call_user_func( $args['callback'], is_array( $input ) ? $input : array() );

					if ( is_wp_error( $result ) ) {
						throw new \RuntimeException( esc_html( $result->get_error_message() ) );
					}

					return $result;
				},
				'permission_callback' => function () use ( $args ) {
					return current_user_can( $args['capability'] );
				},
				'meta'                => array(
					'show_in_rest' => true,
					'annotations'  => $args['annotations'],
					'mcp'          => array(
						'public' => true,
						'type'   => 'tool',
					),
				),
			)
		);
	}

	/**
	 * Ability callback: list editions.
	 *
	 * @param array $input Input.
	 *
	 * @return array Response.
	 */
	public function list_editions( array $input ) {
		$cadence = isset( $input['cadence'] ) ? sanitize_key( $input['cadence'] ) : '';
		$limit   = isset( $input['limit'] ) ? max( 1, min( 50, (int) $input['limit'] ) ) : 10;

		$query_args = array(
			'post_type'      => RWM_PDF_Editions::POST_TYPE,
			'post_status'    => 'publish',
			'posts_per_page' => $limit,
			'no_found_rows'  => true,
			'orderby'        => 'date',
			'order'          => 'DESC',
		);

		if ( $cadence && isset( RWM_PDF_Editions::CADENCES[ $cadence ] ) ) {
			$query_args['meta_key']   = '_rwm_edition_cadence'; // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
			$query_args['meta_value'] = $cadence; // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value
		}

		$editions = get_posts( $query_args );
		$out      = array();

		foreach ( $editions as $edition ) {
			$posts    = (array) get_post_meta( $edition->ID, '_rwm_edition_posts', true );
			$out[]    = array(
				'id'           => (int) $edition->ID,
				'title'        => get_the_title( $edition ),
				'cadence'      => (string) get_post_meta( $edition->ID, '_rwm_edition_cadence', true ),
				'period'       => (string) get_post_meta( $edition->ID, '_rwm_edition_period_name', true ),
				'article_count' => count( array_filter( $posts ) ),
				'download_url' => RWM_PDF_Editions::get_edition_pdf_url( $edition->ID ),
			);
		}

		return array( 'editions' => $out );
	}

	/**
	 * Ability callback: compile an edition.
	 *
	 * @param array $input Input.
	 *
	 * @return array|\WP_Error Response.
	 */
	public function compile_edition( array $input ) {
		$cadence = isset( $input['cadence'] ) ? sanitize_key( $input['cadence'] ) : 'monthly';

		if ( ! isset( RWM_PDF_Editions::CADENCES[ $cadence ] ) ) {
			return new \WP_Error( 'rwm_pdf_invalid_cadence', __( 'Unknown edition cadence.', 'rwm-pdf-editions' ) );
		}

		$result = RWM_PDF_Editions::create_edition(
			array(
				'cadence'       => $cadence,
				'period_offset' => isset( $input['period_offset'] ) ? absint( $input['period_offset'] ) : 0,
				'tags'          => isset( $input['tags'] ) ? array_map( 'absint', (array) $input['tags'] ) : array(),
				'categories'    => isset( $input['categories'] ) ? array_map( 'absint', (array) $input['categories'] ) : array(),
				'featured_only' => ! empty( $input['featured_only'] ),
				'limit'         => isset( $input['limit'] ) ? (int) $input['limit'] : 50,
				'royalty_pool'  => isset( $input['royalty_pool'] ) ? (float) $input['royalty_pool'] : 0.0,
			)
		);

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return array(
			'edition_id'   => (int) $result,
			'title'        => get_the_title( $result ),
			'download_url' => RWM_PDF_Editions::get_edition_pdf_url( $result ),
		);
	}

	/**
	 * Ability callback: article PDF link.
	 *
	 * @param array $input Input.
	 *
	 * @return array|\WP_Error Response.
	 */
	public function get_article_pdf( array $input ) {
		$post_id = isset( $input['post_id'] ) ? absint( $input['post_id'] ) : 0;
		$post    = get_post( $post_id );

		if ( ! $post || 'post' !== $post->post_type ) {
			return new \WP_Error( 'rwm_pdf_not_found', __( 'Article not found.', 'rwm-pdf-editions' ) );
		}

		return array(
			'post_id'      => $post_id,
			'title'        => get_the_title( $post ),
			'enabled'      => RWM_PDF_Editions::is_download_allowed( $post_id ),
			'doi'          => RWM_PDF_Licensing::get_post_doi( $post_id ),
			'license'      => RWM_PDF_Licensing::get_post_license( $post_id ),
			'download_url' => RWM_PDF_Editions::get_article_pdf_pretty_url( $post_id ),
		);
	}

	/**
	 * Ability callback: royalty ledger.
	 *
	 * @param array $input Input.
	 *
	 * @return array|\WP_Error Response.
	 */
	public function get_royalty_ledger( array $input ) {
		$edition_id = isset( $input['edition_id'] ) ? absint( $input['edition_id'] ) : 0;
		$edition    = get_post( $edition_id );

		if ( ! $edition || RWM_PDF_Editions::POST_TYPE !== $edition->post_type ) {
			return new \WP_Error( 'rwm_pdf_not_found', __( 'Edition not found.', 'rwm-pdf-editions' ) );
		}

		$ledger = get_post_meta( $edition_id, '_rwm_edition_royalties', true );

		return array(
			'edition_id' => $edition_id,
			'title'      => get_the_title( $edition ),
			'pool'       => (float) get_post_meta( $edition_id, '_rwm_edition_royalty_pool', true ),
			'ledger'     => is_array( $ledger ) ? $ledger : array(),
		);
	}
}
