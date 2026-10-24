<?php
/**
 * Special Editions engine.
 *
 * Compiles multiple posts into a single scholarly PDF edition on a weekly,
 * monthly, quarterly, half-yearly, or yearly cadence, selected by tags,
 * categories, or featured status.
 *
 * @package RWM_PDF_Editions
 */

namespace RWM_PDF\Includes;

defined( 'ABSPATH' ) || exit;

/**
 * Class RWM_PDF_Editions
 */
class RWM_PDF_Editions {

	/**
	 * Edition post type slug.
	 */
	const POST_TYPE = 'rwm_edition';

	/**
	 * Supported publication cadences, with their period length in days.
	 */
	const CADENCES = array(
		'weekly'      => array(
			'label'   => 'Weekly',
			'days'    => 7,
			'recur'   => 'weekly',
			'default' => false,
		),
		'monthly'     => array(
			'label'   => 'Monthly',
			'days'    => 30,
			'recur'   => 'monthly',
			'default' => true,
		),
		'quarterly'   => array(
			'label'   => 'Quarterly',
			'days'    => 91,
			'recur'   => 'quarterly',
			'default' => false,
		),
		'half-yearly' => array(
			'label'   => 'Half-Yearly',
			'days'    => 182,
			'recur'   => 'semiannually',
			'default' => false,
		),
		'yearly'      => array(
			'label'   => 'Yearly',
			'days'    => 365,
			'recur'   => 'yearly',
			'default' => false,
		),
	);

	/**
	 * Initialize hooks.
	 *
	 * @return void
	 */
	public function init() {
		add_action( 'init', array( __CLASS__, 'register_post_type' ) );
		add_action( 'init', array( $this, 'register_shortcodes' ) );
		add_action( 'init', array( $this, 'register_blocks' ) );
		add_action( 'template_redirect', array( $this, 'maybe_serve_pdf' ) );
		add_action( 'init', array( $this, 'register_pdf_route' ) );
		add_filter( 'query_vars', array( $this, 'register_query_vars' ) );
		add_filter( 'reme_seo_citation_pdf_url', array( $this, 'filter_citation_pdf_url' ), 10, 2 );
		add_action( 'rwm_pdf_build_scheduled_editions', array( __CLASS__, 'build_scheduled_editions' ) );
		add_filter( 'the_content', array( $this, 'append_download_button' ), 25 );
		add_filter( 'manage_' . self::POST_TYPE . '_posts_columns', array( $this, 'admin_columns' ) );
		add_action( 'manage_' . self::POST_TYPE . '_posts_custom_column', array( $this, 'render_admin_column' ), 10, 2 );
	}

	/**
	 * Register the edition post type (stored records, no public URLs).
	 *
	 * @return void
	 */
	public static function register_post_type() {
		if ( post_type_exists( self::POST_TYPE ) ) {
			return;
		}

		register_post_type(
			self::POST_TYPE,
			array(
				'labels'           => array(
					'name'               => __( 'Special Editions', 'rwm-pdf-editions' ),
					'singular_name'      => __( 'Special Edition', 'rwm-pdf-editions' ),
					'add_new_item'       => __( 'Add New Special Edition', 'rwm-pdf-editions' ),
					'edit_item'          => __( 'Edit Special Edition', 'rwm-pdf-editions' ),
					'search_items'       => __( 'Search Special Editions', 'rwm-pdf-editions' ),
					'not_found'          => __( 'No special editions found.', 'rwm-pdf-editions' ),
					'menu_name'          => __( 'Special Editions', 'rwm-pdf-editions' ),
				),
				'public'           => false,
				'show_ui'          => true,
				'show_in_menu'     => true,
				'menu_icon'        => 'dashicons-media-document',
				'menu_position'    => 26,
				'supports'         => array( 'title', 'editor', 'excerpt', 'author' ),
				'capability_type'  => 'post',
				'capabilities'      => array(
					'create_posts' => 'edit_posts',
				),
				'map_meta_cap'     => true,
				'show_in_rest'     => false,
				'has_archive'      => false,
				'rewrite'          => false,
			)
		);
	}

	/**
	 * Register shortcodes for front-end use.
	 *
	 * @return void
	 */
	public function register_shortcodes() {
		add_shortcode( 'rwm_pdf_download', array( $this, 'render_download_shortcode' ) );
		add_shortcode( 'rwm_special_editions', array( $this, 'render_editions_shortcode' ) );
	}

	/**
	 * Register the block-editor surfaces for the download button and edition index.
	 *
	 * @return void
	 */
	public function register_blocks() {
		if ( ! function_exists( 'register_block_type' ) ) {
			return;
		}

		register_block_type(
			'rwm/pdf-download',
			array(
				'api_version'     => 2,
				'title'           => __( 'RWM Article PDF Download', 'rwm-pdf-editions' ),
				'description'     => __( 'Adds an accessible PDF download button for the current article.', 'rwm-pdf-editions' ),
				'category'        => 'widgets',
				'icon'            => 'download',
				'attributes'      => array(
					'label' => array(
						'type'    => 'string',
						'default' => __( 'Download PDF', 'rwm-pdf-editions' ),
					),
					'showMeta' => array(
						'type'    => 'boolean',
						'default' => true,
					),
				),
				'render_callback' => array( $this, 'render_download_block' ),
			)
		);

		register_block_type(
			'rwm/editions-index',
			array(
				'api_version'     => 2,
				'title'           => __( 'RWM Special Editions Index', 'rwm-pdf-editions' ),
				'description'     => __( 'Lists compiled weekly, monthly, quarterly, half-yearly, and yearly editions.', 'rwm-pdf-editions' ),
				'category'        => 'widgets',
				'icon'            => 'media-spreadsheet',
				'attributes'      => array(
					'cadence' => array(
						'type'    => 'string',
						'default' => '',
					),
					'limit'   => array(
						'type'    => 'number',
						'default' => 10,
					),
				),
				'render_callback' => array( $this, 'render_editions_block' ),
			)
		);
	}

	/* ---------------------------------------------------------------------
	 * Period calculation
	 * ------------------------------------------------------------------ */

	/**
	 * Compute the start and end timestamps of the period preceding "now".
	 *
	 * @param string $cadence One of the CADENCES keys.
	 * @param int    $offset  How many periods back to go (0 = current period).
	 *
	 * @return array{start:int,end:int,label:string} Period boundaries.
	 */
	public static function get_period( $cadence, $offset = 0 ) {
		$cadence = isset( self::CADENCES[ $cadence ] ) ? $cadence : 'monthly';
		$now     = current_time( 'timestamp' ); // phpcs:ignore WordPress.DateTime.CurrentTimeTimestamp.Requested

		switch ( $cadence ) {
			case 'weekly':
				$start = strtotime( 'monday this week', $now );
				$start = strtotime( '-' . ( $offset * 7 ) . ' days', $start );
				$end   = strtotime( '+7 days', $start ) - 1;
				$label = sprintf(
					/* translators: 1: start date, 2: end date. */
					__( 'Week of %1$s – %2$s', 'rwm-pdf-editions' ),
					date_i18n( 'M j, Y', $start ),
					date_i18n( 'M j, Y', $end )
				);
				break;

			case 'quarterly':
				$month = (int) gmdate( 'n', $now );
				$year  = (int) gmdate( 'Y', $now );
				$quarter = (int) ceil( $month / 3 );
				$quarter -= $offset;
				while ( $quarter < 1 ) {
					$quarter += 4;
					--$year;
				}
				$start_month = ( ( $quarter - 1 ) * 3 ) + 1;
				$start       = gmmktime( 0, 0, 0, $start_month, 1, $year );
				$end         = gmmktime( 0, 0, 0, $start_month + 3, 1, $year ) - 1;
				$label       = sprintf(
					/* translators: 1: quarter number, 2: year. */
					__( 'Q%1$d %2$s', 'rwm-pdf-editions' ),
					$quarter,
					$year
				);
				break;

			case 'half-yearly':
				$month = (int) gmdate( 'n', $now );
				$year  = (int) gmdate( 'Y', $now );
				$half  = $month <= 6 ? 1 : 2;
				$half -= $offset;
				while ( $half < 1 ) {
					$half += 2;
					--$year;
				}
				$start_month = ( 1 === $half ) ? 1 : 7;
				$start       = gmmktime( 0, 0, 0, $start_month, 1, $year );
				$end         = gmmktime( 0, 0, 0, $start_month + 6, 1, $year ) - 1;
				$label       = sprintf(
					/* translators: 1: half number, 2: year. */
					__( 'H%1$d %2$s', 'rwm-pdf-editions' ),
					$half,
					$year
				);
				break;

			case 'yearly':
				$year  = (int) gmdate( 'Y', $now ) - $offset;
				$start = gmmktime( 0, 0, 0, 1, 1, $year );
				$end   = gmmktime( 0, 0, 0, 1, 1, $year + 1 ) - 1;
				$label = sprintf(
					/* translators: %s: year. */
					__( 'Annual Edition %s', 'rwm-pdf-editions' ),
					$year
				);
				break;

			case 'monthly':
			default:
				$month = (int) gmdate( 'n', $now );
				$year  = (int) gmdate( 'Y', $now );
				$start = gmmktime( 0, 0, 0, $month - $offset, 1, $year );
				$end   = gmmktime( 0, 0, 0, $month - $offset + 1, 1, $year ) - 1;
				$label = date_i18n( 'F Y', $start );
				break;
		}

		return array(
			'start' => (int) $start,
			'end'   => (int) $end,
			'label' => $label,
		);
	}

	/* ---------------------------------------------------------------------
	 * Post selection
	 * ------------------------------------------------------------------ */

	/**
	 * Select posts that belong in an edition.
	 *
	 * @param array $args {
	 *     @type string $cadence      Cadence key.
	 *     @type int    $period_offset Period offset (0 = current).
	 *     @type int[]  $tags          Tag term IDs.
	 *     @type int[]  $categories    Category term IDs.
	 *     @type bool   $featured_only Restrict to sticky/featured posts.
	 *     @type string $orderby       Order clause.
	 *     @type int    $limit         Maximum number of posts.
	 *     @type int    $start         Explicit start timestamp.
	 *     @type int    $end           Explicit end timestamp.
	 * }
	 *
	 * @return \WP_Post[] Posts in the edition.
	 */
	public static function query_edition_posts( $args = array() ) {
		$args = wp_parse_args(
			$args,
			array(
				'cadence'       => 'monthly',
				'period_offset' => 0,
				'tags'          => array(),
				'categories'    => array(),
				'featured_only' => false,
				'orderby'       => 'date',
				'limit'         => 50,
				'start'         => 0,
				'end'           => 0,
			)
		);

		$period = ( $args['start'] && $args['end'] )
			? array(
				'start' => (int) $args['start'],
				'end'   => (int) $args['end'],
			)
			: self::get_period( $args['cadence'], (int) $args['period_offset'] );

		$query_args = array(
			'post_type'              => 'post',
			'post_status'            => 'publish',
			'posts_per_page'         => max( 1, min( 100, (int) $args['limit'] ) ),
			'ignore_sticky_posts'    => false,
			'no_found_rows'          => true,
			'update_post_meta_cache' => true,
			'update_post_term_cache' => true,
			'orderby'                => in_array( $args['orderby'], array( 'date', 'title', 'menu_order' ), true ) ? $args['orderby'] : 'date',
			'order'                  => 'DESC',
			'date_query'             => array(
				array(
					'after'     => gmdate( 'Y-m-d H:i:s', $period['start'] ),
					'before'    => gmdate( 'Y-m-d H:i:s', $period['end'] ),
					'inclusive' => true,
				),
			),
		);

		if ( ! empty( $args['tags'] ) ) {
			$query_args['tag__in'] = array_map( 'absint', (array) $args['tags'] );
		}

		if ( ! empty( $args['categories'] ) ) {
			$query_args['category__in'] = array_map( 'absint', (array) $args['categories'] );
		}

		if ( ! empty( $args['featured_only'] ) ) {
			$sticky = get_option( 'sticky_posts' );
			if ( ! empty( $sticky ) ) {
				$query_args['post__in'] = array_map( 'absint', (array) $sticky );
			} else {
				$query_args['meta_key']   = '_rwm_featured'; // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
				$query_args['meta_value'] = '1'; // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value
			}
		}

		/**
		 * Filters the arguments used to select posts for a special edition.
		 *
		 * @param array $query_args WP_Query arguments.
		 * @param array $args       Edition selection arguments.
		 */
		$query_args = (array) apply_filters( 'rwm_pdf_edition_query_args', $query_args, $args );

		$query = new \WP_Query( $query_args );

		return $query->posts;
	}

	/* ---------------------------------------------------------------------
	 * Edition records
	 * ------------------------------------------------------------------ */

	/**
	 * Create or update an edition record, returning its post ID.
	 *
	 * @param array $config Edition configuration.
	 *
	 * @return int|\WP_Error Edition post ID or error.
	 */
	public static function create_edition( $config ) {
		$config = wp_parse_args(
			$config,
			array(
				'cadence'       => 'monthly',
				'period_offset' => 0,
				'tags'          => array(),
				'categories'    => array(),
				'featured_only' => false,
				'limit'         => 50,
				'title'         => '',
				'royalty_pool'  => 0.0,
			)
		);

		$period = self::get_period( $config['cadence'], (int) $config['period_offset'] );
		$posts  = self::query_edition_posts( $config );

		if ( empty( $posts ) ) {
			return new \WP_Error(
				'rwm_pdf_empty_edition',
				__( 'No published articles matched this edition configuration.', 'rwm-pdf-editions' )
			);
		}

		$title = ! empty( $config['title'] )
			? $config['title']
			: sprintf(
				/* translators: 1: cadence label, 2: period label. */
				__( '%1$s Edition — %2$s', 'rwm-pdf-editions' ),
				self::CADENCES[ $config['cadence'] ]['label'] ?? 'Monthly',
				$period['label']
			);

		$post_ids = wp_list_pluck( $posts, 'ID' );

		$edition_id = wp_insert_post(
			array(
				'post_type'    => self::POST_TYPE,
				'post_status'  => 'publish',
				'post_title'   => $title,
				'post_content' => sprintf(
					/* translators: %d: number of articles. */
					__( 'This edition compiles %d peer-reviewed articles.', 'rwm-pdf-editions' ),
					count( $post_ids )
				),
				'meta_input'   => array(
					'_rwm_edition_cadence'     => sanitize_key( $config['cadence'] ),
					'_rwm_edition_start'       => (int) $period['start'],
					'_rwm_edition_end'         => (int) $period['end'],
					'_rwm_edition_period_name' => sanitize_text_field( $period['label'] ),
					'_rwm_edition_posts'       => array_map( 'absint', $post_ids ),
					'_rwm_edition_tags'        => array_map( 'absint', (array) $config['tags'] ),
					'_rwm_edition_categories'  => array_map( 'absint', (array) $config['categories'] ),
					'_rwm_edition_featured'    => (bool) $config['featured_only'] ? '1' : '0',
					'_rwm_edition_royalty_pool' => (float) $config['royalty_pool'],
					'_rwm_edition_hash'        => wp_hash( implode( ',', $post_ids ) ),
					'_rwm_edition_generated'   => current_time( 'mysql' ),
				),
			),
			true
		);

		if ( is_wp_error( $edition_id ) ) {
			return $edition_id;
		}

		self::record_royalties( $edition_id, $posts, (float) $config['royalty_pool'] );

		return $edition_id;
	}

	/**
	 * Persist royalty computations for an edition.
	 *
	 * @param int       $edition_id   Edition post ID.
	 * @param \WP_Post[] $posts       Included posts.
	 * @param float     $royalty_pool Pool value.
	 *
	 * @return void
	 */
	public static function record_royalties( $edition_id, $posts, $royalty_pool ) {
		if ( $royalty_pool <= 0 ) {
			update_post_meta( $edition_id, '_rwm_edition_royalties', array() );
			return;
		}

		$ledger = RWM_PDF_Licensing::calculate_edition_royalties( $posts, $royalty_pool );
		update_post_meta( $edition_id, '_rwm_edition_royalties', $ledger );
	}

	/**
	 * Retrieve posts attached to a stored edition.
	 *
	 * @param int $edition_id Edition ID.
	 *
	 * @return \WP_Post[] Posts.
	 */
	public static function get_edition_posts( $edition_id ) {
		$ids = get_post_meta( $edition_id, '_rwm_edition_posts', true );
		$ids = is_array( $ids ) ? array_filter( array_map( 'absint', $ids ) ) : array();

		if ( empty( $ids ) ) {
			return array();
		}

		$query = new \WP_Query(
			array(
				'post_type'      => 'post',
				'post__in'       => $ids,
				'post_status'    => 'publish',
				'posts_per_page' => count( $ids ),
				'orderby'        => 'post__in',
				'no_found_rows'  => true,
			)
		);

		return $query->posts;
	}

	/* ---------------------------------------------------------------------
	 * Scheduling
	 * ------------------------------------------------------------------ */

	/**
	 * Schedule the cron event that compiles editions.
	 *
	 * @return void
	 */
	public static function schedule_cron() {
		if ( wp_next_scheduled( 'rwm_pdf_build_scheduled_editions' ) ) {
			return;
		}

		wp_schedule_event( time() + HOUR_IN_SECONDS, 'twicedaily', 'rwm_pdf_build_scheduled_editions' );
	}

	/**
	 * Build every enabled scheduled edition.
	 *
	 * Enabled cadences and their selection rules live in the plugin settings.
	 *
	 * @return void
	 */
	public static function build_scheduled_editions() {
		$options = RWM_PDF_Settings::get_options();

		if ( empty( $options['auto_build'] ) ) {
			return;
		}

		$cadences = isset( $options['enabled_cadences'] ) ? (array) $options['enabled_cadences'] : array( 'monthly' );

		foreach ( $cadences as $cadence ) {
			if ( ! isset( self::CADENCES[ $cadence ] ) ) {
				continue;
			}

			// The period that has just closed is offset 1 for the current run.
			$period = self::get_period( $cadence, 1 );

			$existing = get_posts(
				array(
					'post_type'        => self::POST_TYPE,
					'post_status'      => 'any',
					'posts_per_page'   => 1,
					'fields'           => 'ids',
					'no_found_rows'    => true,
					'suppress_filters' => false,
					// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
					'meta_query'       => array(
						array(
							'key'   => '_rwm_edition_cadence',
							'value' => $cadence,
						),
						array(
							'key'   => '_rwm_edition_start',
							'value' => (int) $period['start'],
						),
					),
				)
			);

			if ( ! empty( $existing ) ) {
				continue;
			}

			self::create_edition(
				array(
					'cadence'       => $cadence,
					'period_offset' => 1,
					'tags'          => isset( $options['tags'][ $cadence ] ) ? (array) $options['tags'][ $cadence ] : array(),
					'categories'    => isset( $options['categories'][ $cadence ] ) ? (array) $options['categories'][ $cadence ] : array(),
					'featured_only' => ! empty( $options['featured_only'][ $cadence ] ),
					'limit'         => isset( $options['limit'] ) ? (int) $options['limit'] : 50,
				)
			);
		}
	}

	/* ---------------------------------------------------------------------
	 * Download handling
	 * ------------------------------------------------------------------ */

	/**
	 * Build the signed download URL for an article.
	 *
	 * @param int $post_id Post ID.
	 *
	 * @return string URL.
	 */
	public static function get_article_pdf_url( $post_id ) {
		return add_query_arg(
			array(
				'rwm_pdf' => 'article',
				'post_id' => (int) $post_id,
			),
			home_url( '/' )
		);
	}

	/**
	 * Build the signed download URL for an edition.
	 *
	 * @param int $edition_id Edition post ID.
	 *
	 * @return string URL.
	 */
	public static function get_edition_pdf_url( $edition_id ) {
		return add_query_arg(
			array(
				'rwm_pdf'    => 'edition',
				'edition_id' => (int) $edition_id,
			),
			home_url( '/' )
		);
	}

	/**
	 * Serve the PDF when a download URL is requested.
	 *
	 * @return void
	 */
	public function maybe_serve_pdf() {
		$slug = get_query_var( 'rwm_pdf_slug' );

		if ( ! empty( $slug ) ) {
			$post = get_page_by_path( sanitize_title( $slug ), OBJECT, 'post' );

			if ( ! $post instanceof \WP_Post ) {
				wp_die( esc_html__( 'The requested article could not be found.', 'rwm-pdf-editions' ), 404 );
			}

			$this->stream_article_pdf( (int) $post->ID );
			return;
		}

		if ( ! isset( $_GET['rwm_pdf'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			return;
		}

		$type = sanitize_key( wp_unslash( $_GET['rwm_pdf'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended

		if ( 'article' === $type ) {
			$post_id = isset( $_GET['post_id'] ) ? absint( $_GET['post_id'] ) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$this->stream_article_pdf( $post_id );
			return;
		}

		if ( 'edition' === $type ) {
			$edition_id = isset( $_GET['edition_id'] ) ? absint( $_GET['edition_id'] ) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$this->stream_edition_pdf( $edition_id );
			return;
		}
	}

	/**
	 * Stream a single-article PDF.
	 *
	 * @param int $post_id Post ID.
	 *
	 * @return void
	 */
	private function stream_article_pdf( $post_id ) {
		$post = get_post( $post_id );

		if ( ! $post || 'post' !== $post->post_type || 'publish' !== $post->post_status ) {
			wp_die( esc_html__( 'The requested article could not be found.', 'rwm-pdf-editions' ), 404 );
		}

		if ( ! self::is_download_allowed( $post_id ) ) {
			wp_die( esc_html__( 'PDF downloads are not enabled for this article.', 'rwm-pdf-editions' ), 403 );
		}

		$binary   = RWM_PDF_Generator::generate_binary_pdf( $post_id );
		$filename = sanitize_title( $post->post_title ) . '.pdf';

		$this->send_pdf_headers( $filename, true );

		echo $binary; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Binary PDF stream.
		exit;
	}

	/**
	 * Stream a compiled edition PDF.
	 *
	 * @param int $edition_id Edition ID.
	 *
	 * @return void
	 */
	private function stream_edition_pdf( $edition_id ) {
		$edition = get_post( $edition_id );

		if ( ! $edition || self::POST_TYPE !== $edition->post_type ) {
			wp_die( esc_html__( 'The requested edition could not be found.', 'rwm-pdf-editions' ), 404 );
		}

		$posts = self::get_edition_posts( $edition_id );

		if ( empty( $posts ) ) {
			wp_die( esc_html__( 'This edition contains no articles.', 'rwm-pdf-editions' ), 404 );
		}

		$binary   = RWM_PDF_Generator::generate_edition_pdf( $edition_id, $posts );
		$filename = sanitize_title( $edition->post_title ) . '.pdf';

		$this->send_pdf_headers( $filename );

		echo $binary; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Binary PDF stream.
		exit;
	}

	/**
	 * Emit PDF response headers.
	 *
	 * @param string $filename Download filename.
	 *
	 * @return void
	 */
	private function send_pdf_headers( $filename, $indexable = false ) {
		nocache_headers();
		header( 'Content-Type: application/pdf' );
		header( 'Content-Disposition: attachment; filename="' . sanitize_file_name( $filename ) . '"' );
		header( 'X-Content-Type-Options: nosniff' );

		/**
		 * Filters whether article PDFs may be indexed.
		 *
		 * Article PDFs carry the full citation record, and AI answer engines
		 * favour indexable PDFs. Compiled editions aggregate already-published
		 * content, so they stay out of the index by default.
		 *
		 * @param bool $indexable Whether to allow indexing.
		 */
		$indexable = (bool) apply_filters( 'rwm_pdf_allow_indexing', $indexable );

		if ( ! $indexable ) {
			header( 'X-Robots-Tag: noindex' );
		}
	}

	/**
	 * Whether PDF download is allowed for an article.
	 *
	 * @param int $post_id Post ID.
	 *
	 * @return bool
	 */
	public static function is_download_allowed( $post_id ) {
		$allowed = (bool) get_post_meta( $post_id, '_rwm_pdf_enabled', true );

		if ( ! $allowed ) {
			$options = RWM_PDF_Settings::get_options();
			$allowed = ! empty( $options['default_enabled'] );
		}

		/**
		 * Filters whether an article may be downloaded as PDF.
		 *
		 * @param bool $allowed Whether downloads are allowed.
		 * @param int  $post_id Post ID.
		 */
		return (bool) apply_filters( 'rwm_pdf_is_download_allowed', $allowed, $post_id );
	}

	/* ---------------------------------------------------------------------
	 * Pretty, citable URLs
	 * ------------------------------------------------------------------ */

	/**
	 * Register `/publications/{slug}.pdf` so each article PDF has a stable,
	 * parameter-free URL that search engines and citation managers can use.
	 *
	 * @return void
	 */
	public function register_pdf_route() {
		add_rewrite_rule(
			'^publications/([^/]+)\.pdf$',
			'index.php?rwm_pdf_slug=$matches[1]',
			'top'
		);

		// Activation runs before this rule exists, so flush once per version.
		if ( get_option( 'rwm_pdf_rewrite_version' ) !== RWM_PDF_VERSION ) {
			flush_rewrite_rules( false );
			update_option( 'rwm_pdf_rewrite_version', RWM_PDF_VERSION );
		}
	}

	/**
	 * Register the rewrite query var.
	 *
	 * @param array $vars Query vars.
	 *
	 * @return array
	 */
	public function register_query_vars( $vars ) {
		$vars[] = 'rwm_pdf_slug';

		return $vars;
	}

	/**
	 * Build the canonical, pretty PDF URL for an article.
	 *
	 * @param int $post_id Post ID.
	 *
	 * @return string
	 */
	public static function get_article_pdf_pretty_url( $post_id ) {
		$slug = get_post_field( 'post_name', $post_id );

		if ( empty( $slug ) ) {
			return self::get_article_pdf_url( $post_id );
		}

		return home_url( '/publications/' . $slug . '.pdf' );
	}

	/**
	 * Expose the PDF URL to the theme's Highwire citation tags.
	 *
	 * @param string $url     Current URL.
	 * @param int    $post_id Post ID.
	 *
	 * @return string
	 */
	public function filter_citation_pdf_url( $url, $post_id ) {
		if ( $post_id && self::is_download_allowed( $post_id ) ) {
			return esc_url_raw( self::get_article_pdf_pretty_url( $post_id ) );
		}

		return $url;
	}

	/* ---------------------------------------------------------------------
	 * Front-end output
	 * ------------------------------------------------------------------ */

	/**
	 * Append the download button to single article content.
	 *
	 * @param string $content Post content.
	 *
	 * @return string Filtered content.
	 */
	public function append_download_button( $content ) {
		if ( ! is_singular( 'post' ) || ! in_the_loop() || ! is_main_query() ) {
			return $content;
		}

		$options = RWM_PDF_Settings::get_options();
		if ( empty( $options['auto_button'] ) ) {
			return $content;
		}

		if ( has_block( 'rwm/pdf-download', $content ) || has_shortcode( $content, 'rwm_pdf_download' ) ) {
			return $content;
		}

		return $content . $this->render_download_button( get_the_ID() );
	}

	/**
	 * Render the download button markup.
	 *
	 * @param int    $post_id Post ID.
	 * @param string $label   Button label.
	 *
	 * @return string Markup.
	 */
	public function render_download_button( $post_id, $label = '' ) {
		if ( ! self::is_download_allowed( $post_id ) ) {
			return '';
		}

		$label = ! empty( $label ) ? $label : __( 'Download PDF', 'rwm-pdf-editions' );
		$doi   = RWM_PDF_Licensing::get_post_doi( $post_id );
		$size  = wp_strip_all_tags( get_the_title( $post_id ) );

		return sprintf(
			'<div class="rwm-pdf-download"><a class="rwm-pdf-btn" href="%1$s" rel="nofollow" download aria-label="%2$s"><span class="rwm-pdf-icon" aria-hidden="true">&#8681;</span><span>%3$s</span></a><span class="rwm-pdf-meta">%4$s</span></div>',
			esc_url( self::get_article_pdf_pretty_url( $post_id ) ),
			esc_attr( sprintf( /* translators: %s: article title. */ __( 'Download %s as PDF', 'rwm-pdf-editions' ), $size ) ),
			esc_html( $label ),
			esc_html( sprintf( /* translators: %s: DOI. */ __( 'DOI: %s · Open Access', 'rwm-pdf-editions' ), $doi ) )
		);
	}

	/**
	 * Shortcode callback: [rwm_pdf_download].
	 *
	 * @param array $atts Shortcode attributes.
	 *
	 * @return string Markup.
	 */
	public function render_download_shortcode( $atts ) {
		$atts = shortcode_atts(
			array(
				'post_id' => get_the_ID(),
				'label'   => __( 'Download PDF', 'rwm-pdf-editions' ),
			),
			$atts,
			'rwm_pdf_download'
		);

		return $this->render_download_button( (int) $atts['post_id'], (string) $atts['label'] );
	}

	/**
	 * Block render callback: rwm/pdf-download.
	 *
	 * @param array $attributes Block attributes.
	 *
	 * @return string Markup.
	 */
	public function render_download_block( $attributes ) {
		$label = isset( $attributes['label'] ) ? $attributes['label'] : __( 'Download PDF', 'rwm-pdf-editions' );
		$html  = $this->render_download_button( (int) get_the_ID(), $label );

		if ( empty( $html ) && is_admin() ) {
			return sprintf(
				'<div class="rwm-pdf-download"><span class="rwm-pdf-btn">%s</span></div>',
				esc_html__( 'PDF download disabled for this article', 'rwm-pdf-editions' )
			);
		}

		return $html;
	}

	/**
	 * Shortcode callback: [rwm_special_editions].
	 *
	 * @param array $atts Shortcode attributes.
	 *
	 * @return string Markup.
	 */
	public function render_editions_shortcode( $atts ) {
		$atts = shortcode_atts(
			array(
				'cadence' => '',
				'limit'   => 10,
			),
			$atts,
			'rwm_special_editions'
		);

		return $this->get_editions_list_markup( (string) $atts['cadence'], (int) $atts['limit'] );
	}

	/**
	 * Block render callback: rwm/editions-index.
	 *
	 * @param array $attributes Block attributes.
	 *
	 * @return string Markup.
	 */
	public function render_editions_block( $attributes ) {
		$cadence = isset( $attributes['cadence'] ) ? $attributes['cadence'] : '';
		$limit   = isset( $attributes['limit'] ) ? (int) $attributes['limit'] : 10;

		return $this->get_editions_list_markup( $cadence, $limit );
	}

	/**
	 * Build the markup for a list of stored editions.
	 *
	 * @param string $cadence Optional cadence filter.
	 * @param int    $limit   Number of editions.
	 *
	 * @return string Markup.
	 */
	public function get_editions_list_markup( $cadence = '', $limit = 10 ) {
		$query_args = array(
			'post_type'      => self::POST_TYPE,
			'post_status'    => 'publish',
			'posts_per_page' => max( 1, min( 50, $limit ) ),
			'no_found_rows'  => true,
			'orderby'        => 'date',
			'order'          => 'DESC',
		);

		if ( ! empty( $cadence ) && isset( self::CADENCES[ $cadence ] ) ) {
			$query_args['meta_key']   = '_rwm_edition_cadence'; // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
			$query_args['meta_value'] = $cadence; // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value
		}

		$editions = get_posts( $query_args );

		if ( empty( $editions ) ) {
			return sprintf(
				'<p class="rwm-editions-empty">%s</p>',
				esc_html__( 'No special editions have been compiled yet.', 'rwm-pdf-editions' )
			);
		}

		$items = '';
		foreach ( $editions as $edition ) {
			$count    = count( (array) get_post_meta( $edition->ID, '_rwm_edition_posts', true ) );
			$period   = get_post_meta( $edition->ID, '_rwm_edition_period_name', true );
			$items   .= sprintf(
				'<li class="rwm-edition-item"><a href="%1$s" rel="nofollow" download><span class="rwm-edition-title">%2$s</span><span class="rwm-edition-meta">%3$s</span></a></li>',
				esc_url( self::get_edition_pdf_url( $edition->ID ) ),
				esc_html( get_the_title( $edition ) ),
				esc_html(
					sprintf(
						/* translators: 1: period label, 2: article count. */
						__( '%1$s · %2$d articles', 'rwm-pdf-editions' ),
						$period ? $period : get_the_date( '', $edition ),
						$count
					)
				)
			);
		}

		return '<ul class="rwm-editions-list">' . $items . '</ul>';
	}

	/* ---------------------------------------------------------------------
	 * Admin columns
	 * ------------------------------------------------------------------ */

	/**
	 * Add edition admin columns.
	 *
	 * @param array $columns Columns.
	 *
	 * @return array Columns.
	 */
	public function admin_columns( $columns ) {
		$columns['rwm_cadence']   = __( 'Cadence', 'rwm-pdf-editions' );
		$columns['rwm_articles']  = __( 'Articles', 'rwm-pdf-editions' );
		$columns['rwm_download']  = __( 'Download', 'rwm-pdf-editions' );

		return $columns;
	}

	/**
	 * Render edition admin column values.
	 *
	 * @param string $column  Column key.
	 * @param int    $post_id Post ID.
	 *
	 * @return void
	 */
	public function render_admin_column( $column, $post_id ) {
		switch ( $column ) {
			case 'rwm_cadence':
				$cadence = get_post_meta( $post_id, '_rwm_edition_cadence', true );
				echo esc_html( isset( self::CADENCES[ $cadence ] ) ? self::CADENCES[ $cadence ]['label'] : '—' );
				break;

			case 'rwm_articles':
				$ids = get_post_meta( $post_id, '_rwm_edition_posts', true );
				echo esc_html( is_array( $ids ) ? (string) count( $ids ) : '0' );
				break;

			case 'rwm_download':
				printf(
					'<a class="button button-small" href="%s">%s</a>',
					esc_url( self::get_edition_pdf_url( $post_id ) ),
					esc_html__( 'PDF', 'rwm-pdf-editions' )
				);
				break;
		}
	}
}
