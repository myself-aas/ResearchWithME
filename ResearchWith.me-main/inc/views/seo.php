<?php
/**
 * Blog SEO, AEO and GEO engine.
 *
 * Ships the search surfaces a general publishing site needs without requiring a
 * third-party SEO plugin:
 *
 * - JSON-LD (`BlogPosting`, `Person`, `Organization`, `BreadcrumbList`,
 *   `ProfilePage`, `CollectionPage`) emitted as a single `@graph`.
 * - Open Graph and X/Twitter cards.
 * - Meta description fallbacks sized for snippets.
 * - Meta description fallbacks sized for snippets.
 * - AI crawler policy in `robots.txt`, an optional `llms.txt`, and Markdown
 *   content negotiation at the canonical URL.
 *
 * Every surface defers to an installed SEO plugin so the theme never emits
 * duplicate tags.
 *
 * @package ReMe\Views
 */

namespace ReMe\Views;

defined( 'ABSPATH' ) || exit;

/**
 * Class Seo
 *
 * @package ReMe\Views
 */
class Seo extends Base_View {

	/**
	 * Option name holding the llms.txt cache and toggle state.
	 */
	const MOD_STRUCTURED_DATA = 'reme_seo_structured_data';
	const MOD_OPEN_GRAPH      = 'reme_seo_open_graph';
	const MOD_META_DESC       = 'reme_seo_meta_description';
	const MOD_AI_SEARCH_BOTS  = 'reme_seo_allow_ai_search_bots';
	const MOD_AI_TRAIN_BOTS   = 'reme_seo_allow_ai_training_bots';
	const MOD_LLMS_TXT        = 'reme_seo_llms_txt';
	const MOD_MARKDOWN        = 'reme_seo_markdown';
	const MOD_DEFAULT_IMAGE   = 'reme_seo_default_image';

	/**
	 * Collected affiliate product records, filled while content renders.
	 *
	 * @var array
	 */
	private static $products = array();

	/**
	 * Cached SEO-plugin detection result.
	 *
	 * @var bool|null
	 */
	private static $plugin_active = null;

	/**
	 * Initialize the feature.
	 *
	 * @return void
	 */
	public function init() {
		add_filter( 'document_title_parts', array( $this, 'filter_title_parts' ), 12 );
		add_filter( 'document_title_separator', array( $this, 'filter_title_separator' ), 12 );
		add_action( 'wp_head', array( $this, 'render_head' ), 2 );
		add_action( 'wp_footer', array( $this, 'render_deferred_schema' ), 20 );
		add_filter( 'robots_txt', array( $this, 'filter_robots_txt' ), 20, 2 );
		add_filter( 'wp_robots', array( $this, 'filter_wp_robots' ) );
		add_action( 'init', array( $this, 'register_llms_txt_route' ) );
		add_action( 'template_redirect', array( $this, 'maybe_render_llms_txt' ), 0 );
		add_action( 'template_redirect', array( $this, 'maybe_render_markdown' ), 0 );
		add_action( 'send_headers', array( $this, 'add_vary_header' ) );
		add_filter( 'wp_sitemaps_post_types', array( $this, 'filter_sitemap_post_types' ) );
		add_filter( 'wp_sitemaps_taxonomies', array( $this, 'filter_sitemap_taxonomies' ) );
		add_filter( 'wp_sitemaps_posts_query_args', array( $this, 'filter_sitemap_query_args' ), 10 );
	}

	/* ---------------------------------------------------------------------
	 * Registration helpers
	 * ------------------------------------------------------------------ */

	/**
	 * Whether an SEO plugin already owns the metadata surfaces.
	 *
	 * @return bool
	 */
	public static function has_seo_plugin() {
		if ( null !== self::$plugin_active ) {
			return self::$plugin_active;
		}

		$active = (
			defined( 'WPSEO_VERSION' )
			|| class_exists( 'WPSEO_Options' )
			|| defined( 'RANK_MATH_VERSION' )
			|| class_exists( 'RankMath' )
			|| defined( 'AIOSEO_VERSION' )
			|| defined( 'SEOPRESS_VERSION' )
			|| class_exists( 'The_SEO_Framework\\Load' )
		);

		/**
		 * Filters whether a third-party SEO plugin owns metadata output.
		 *
		 * @param bool $active Whether an SEO plugin is active.
		 */
		self::$plugin_active = (bool) apply_filters( 'reme_seo_plugin_active', $active );

		return self::$plugin_active;
	}

	/**
	 * Whether a feature is enabled.
	 *
	 * @param string $mod     Theme mod name.
	 * @param bool   $default Default when the mod has never been saved.
	 *
	 * @return bool
	 */
	private function enabled( $mod, $default = true ) {
		return (bool) get_theme_mod( $mod, $default );
	}

	/**
	 * Register the affiliate product record for schema output.
	 *
	 * Called by the affiliate render callbacks so the Product graph is built
	 * from markup that actually reached the page.
	 *
	 * @param array $product Product data.
	 *
	 * @return void
	 */
	public static function register_product( array $product ) {
		self::$products[] = $product;
	}

	/**
	 * Retrieve collected products.
	 *
	 * @return array
	 */
	private static function get_products() {
		return self::$products;
	}

	/* ---------------------------------------------------------------------
	 * Titles
	 * ------------------------------------------------------------------ */

	/**
	 * Tune the document title for archive and singular pages.
	 *
	 * @param array $parts Title parts.
	 *
	 * @return array
	 */
	public function filter_title_parts( $parts ) {
		if ( self::has_seo_plugin() ) {
			return $parts;
		}

		if ( is_singular() && isset( $parts['title'] ) && '' === trim( (string) $parts['title'] ) ) {
			$parts['title'] = get_the_title();
		}

		if ( is_front_page() && isset( $parts['title'] ) ) {
			$parts['title'] = get_bloginfo( 'name' );
		}

		// Taglines crowd article titles out of the SERP; drop them on posts.
		if ( is_singular( 'post' ) ) {
			unset( $parts['tagline'] );
		}

		return $parts;
	}

	/**
	 * Use a pipe separator, which survives SERP truncation better than a dash.
	 *
	 * @param string $separator Separator.
	 *
	 * @return string
	 */
	public function filter_title_separator( $separator ) {
		return self::has_seo_plugin() ? $separator : '|';
	}

	/* ---------------------------------------------------------------------
	 * Head
	 * ------------------------------------------------------------------ */

	/**
	 * Output meta descriptions, social cards and structured data.
	 *
	 * @return void
	 */
	public function render_head() {
		if ( self::has_seo_plugin() ) {
			return;
		}

		$description = $this->enabled( self::MOD_META_DESC ) ? $this->get_description() : '';

		if ( $description ) {
			printf( "\n\t<meta name=\"description\" content=\"%s\" />\n", esc_attr( $description ) );
		}

		if ( $this->enabled( self::MOD_OPEN_GRAPH ) ) {
			$this->render_social_tags( $description );
		}

		if ( $this->enabled( self::MOD_STRUCTURED_DATA ) ) {
			$this->render_graph();
		}
	}

	/**
	 * Build a snippet-sized description.
	 *
	 * @return string
	 */
	private function get_description() {
		$description = '';

		if ( is_singular() ) {
			$post = get_queried_object();

			if ( $post instanceof \WP_Post ) {
				$excerpt     = has_excerpt( $post ) ? $post->post_excerpt : '';
				$description = $excerpt ? $excerpt : wp_strip_all_tags( strip_shortcodes( $post->post_content ) );
			}
		} elseif ( is_category() || is_tag() || is_tax() ) {
			$description = term_description();
		} elseif ( is_author() ) {
			$description = get_the_author_meta( 'description', (int) get_query_var( 'author' ) );
		} elseif ( is_home() ) {
			$description = get_bloginfo( 'description' );
		}

		$description = trim( preg_replace( '/\s+/', ' ', wp_strip_all_tags( (string) $description ) ) );

		if ( '' === $description ) {
			$description = sprintf(
				/* translators: %s: site name. */
				__( 'Fresh writing and analysis across research, tech, culture and more on %s.', 'reme' ),
				get_bloginfo( 'name' )
			);
		}

		/**
		 * Filters the generated meta description.
		 *
		 * @param string $description Description text.
		 */
		$description = (string) apply_filters( 'reme_seo_meta_description', $description );

		return wp_html_excerpt( $description, 158, '…' );
	}

	/**
	 * Open Graph and X/Twitter card tags.
	 *
	 * @param string $description Description text.
	 *
	 * @return void
	 */
	private function render_social_tags( $description ) {
		$title = wp_get_document_title();
		$url   = $this->get_canonical_url();
		$image = $this->get_social_image();

		$type = is_singular( 'post' ) ? 'article' : 'website';

		$tags = array(
			'og:site_name'   => get_bloginfo( 'name' ),
			'og:locale'      => get_locale(),
			'og:type'        => $type,
			'og:title'       => $title,
			'og:description' => $description,
			'og:url'         => $url,
		);

		if ( $image ) {
			$tags['og:image']        = $image;
			$tags['og:image:width']  = '1200';
			$tags['og:image:height'] = '630';
		}

		if ( is_singular() ) {
			$post = get_queried_object();

			if ( $post instanceof \WP_Post ) {
				$tags['article:published_time'] = get_the_date( DATE_W3C, $post );
				$tags['article:modified_time']  = get_the_modified_date( DATE_W3C, $post );

				$authors = array( get_the_author_meta( 'display_name', $post->post_author ) );
				if ( ! empty( $authors[0] ) ) {
					$tags['article:author'] = $authors[0];
				}
			}
		}

		foreach ( $tags as $property => $content ) {
			if ( '' === (string) $content ) {
				continue;
			}
			printf(
				"\n\t<meta property=\"%s\" content=\"%s\" />",
				esc_attr( $property ),
				esc_attr( $content )
			);
		}

		printf( "\n\t<meta name=\"twitter:card\" content=\"%s\" />", $image ? 'summary_large_image' : 'summary' );
		printf( "\n\t<meta name=\"twitter:title\" content=\"%s\" />", esc_attr( $title ) );
		printf( "\n\t<meta name=\"twitter:description\" content=\"%s\" />", esc_attr( $description ) );

		if ( $image ) {
			printf( "\n\t<meta name=\"twitter:image\" content=\"%s\" />", esc_url( $image ) );
		}

		echo "\n";
	}

	/**
	 * Canonical URL for the current request.
	 *
	 * Mirrors `rel_canonical()` without duplicating core output.
	 *
	 * @return string
	 */
	private function get_canonical_url() {
		if ( is_singular() ) {
			$post = get_queried_object();

			if ( $post instanceof \WP_Post ) {
				return (string) get_permalink( $post );
			}
		}

		if ( is_front_page() ) {
			return home_url( '/' );
		}

		if ( is_home() ) {
			$page_for_posts = (int) get_option( 'page_for_posts' );
			return $page_for_posts ? (string) get_permalink( $page_for_posts ) : home_url( '/' );
		}

		$queried = get_queried_object();

		if ( $queried instanceof \WP_Term ) {
			$link = get_term_link( $queried );
			if ( ! is_wp_error( $link ) ) {
				return (string) $link;
			}
		}

		if ( is_author() ) {
			$author_id = (int) get_query_var( 'author' );
			$link      = get_author_posts_url( $author_id );
			if ( $link ) {
				return (string) $link;
			}
		}

		$path = isset( $_SERVER['REQUEST_URI'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '/';

		return home_url( $path );
	}

	/**
	 * Social share image (1200x630 when a featured image is available).
	 *
	 * @return string
	 */
	private function get_social_image() {
		if ( is_singular() && has_post_thumbnail() ) {
			$image = get_the_post_thumbnail_url( null, 'full' );

			if ( $image ) {
				return (string) $image;
			}
		}

		$custom = get_theme_mod( self::MOD_DEFAULT_IMAGE, '' );

		if ( ! empty( $custom ) ) {
			return esc_url_raw( $custom );
		}

		$custom_logo_id = (int) get_theme_mod( 'custom_logo' );

		if ( $custom_logo_id ) {
			$logo = wp_get_attachment_image_url( $custom_logo_id, 'full' );
			if ( $logo ) {
				return (string) $logo;
			}
		}

		return '';
	}


	/* ---------------------------------------------------------------------
	 * Structured data
	 * ------------------------------------------------------------------ */

	/**
	 * Render the JSON-LD graph for the current request.
	 *
	 * @return void
	 */
	private function render_graph() {
		$graph = array( $this->schema_organization(), $this->schema_website() );

		if ( is_singular() ) {
			$post = get_queried_object();

			if ( $post instanceof \WP_Post ) {
				if ( 'post' === $post->post_type ) {
					$graph[] = $this->schema_webpage( $post );
					$graph[] = $this->schema_article( $post );
				} else {
					$graph[] = $this->schema_page( $post );
				}

				$graph[] = $this->schema_author( (int) $post->post_author );

				if ( $this->enabled( self::MOD_STRUCTURED_DATA ) ) {
					$breadcrumb = $this->schema_breadcrumb( $post );
					if ( $breadcrumb ) {
						$graph[] = $breadcrumb;
					}
				}
			}
		} elseif ( is_author() ) {
			$graph[] = $this->schema_author( (int) get_query_var( 'author' ), true );
		} elseif ( is_category() || is_tag() || is_tax() || is_home() || is_archive() ) {
			$graph[] = $this->schema_collection();
		}

		$graph = array_values( array_filter( $graph ) );

		/**
		 * Filters the ReMe JSON-LD graph before output.
		 *
		 * @param array $graph Array of schema nodes.
		 */
		$graph = (array) apply_filters( 'reme_seo_schema_graph', $graph );

		if ( empty( $graph ) ) {
			return;
		}

		$document = array(
			'@context' => 'https://schema.org',
			'@graph'   => $this->dedupe_graph( $graph ),
		);

		printf(
			"\n\t<script type=\"application/ld+json\">%s</script>\n",
			wp_json_encode( $document, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Encoded JSON-LD.
		);
	}

	/**
	 * Remove duplicate `@id` nodes so the graph stays valid.
	 *
	 * @param array $graph Graph nodes.
	 *
	 * @return array
	 */
	private function dedupe_graph( array $graph ) {
		$seen = array();
		$out  = array();

		foreach ( $graph as $node ) {
			$id = isset( $node['@id'] ) ? $node['@id'] : '';

			if ( $id && isset( $seen[ $id ] ) ) {
				continue;
			}

			if ( $id ) {
				$seen[ $id ] = true;
			}

			$out[] = $node;
		}

		return $out;
	}

	/**
	 * Organization node.
	 *
	 * @return array
	 */
	private function schema_organization() {
		$logo = $this->get_social_image();

		$node = array(
			'@type' => 'Organization',
			'@id'   => home_url( '/#organization' ),
			'name'  => get_bloginfo( 'name' ),
			'url'   => home_url( '/' ),
		);

		if ( '' !== (string) get_bloginfo( 'description' ) ) {
			$node['description'] = wp_strip_all_tags( get_bloginfo( 'description' ) );
		}

		if ( $logo ) {
			$node['logo'] = array(
				'@type' => 'ImageObject',
				'url'   => $logo,
			);
		}

		$same_as = array_filter(
			array(
				get_theme_mod( 'reme_social_website', '' ),
				get_theme_mod( 'reme_social_mastodon', '' ),
				get_theme_mod( 'reme_social_linkedin', '' ),
				get_theme_mod( 'reme_social_x', '' ),
			)
		);

		if ( ! empty( $same_as ) ) {
			$node['sameAs'] = array_values( array_map( 'esc_url_raw', $same_as ) );
		}

		return $node;
	}

	/**
	 * WebSite node with a sitelinks search box action.
	 *
	 * @return array
	 */
	private function schema_website() {
		return array(
			'@type'     => 'WebSite',
			'@id'       => home_url( '/#website' ),
			'url'       => home_url( '/' ),
			'name'      => get_bloginfo( 'name' ),
			'publisher' => array( '@id' => home_url( '/#organization' ) ),
			'inLanguage' => str_replace( '_', '-', get_locale() ),
			'potentialAction' => array(
				'@type'       => 'SearchAction',
				'target'      => array(
					'@type'       => 'EntryPoint',
					'urlTemplate' => home_url( '/?s={search_term_string}' ),
				),
				'query-input' => 'required name=search_term_string',
			),
		);
	}

	/**
	 * BlogPosting node for a single post.
	 *
	 * @param \WP_Post $post Post object.
	 *
	 * @return array
	 */
	private function schema_article( $post ) {
		$license = (string) get_post_meta( $post->ID, '_rwm_pdf_license', true );

		$node = array(
			'@type'            => 'BlogPosting',
			'@id'              => get_permalink( $post ) . '#article',
			'headline'         => wp_strip_all_tags( get_the_title( $post ) ),
			'name'             => wp_strip_all_tags( get_the_title( $post ) ),
			'url'              => get_permalink( $post ),
			'datePublished'    => get_the_date( DATE_W3C, $post ),
			'dateModified'     => get_the_modified_date( DATE_W3C, $post ),
			'inLanguage'       => str_replace( '_', '-', get_locale() ),
			'isAccessibleForFree' => true,
			'author'           => array( '@id' => $this->author_id( (int) $post->post_author ) ),
			'publisher'        => array( '@id' => home_url( '/#organization' ) ),
			'mainEntityOfPage' => array(
				'@type' => 'WebPage',
				'@id'   => get_permalink( $post ) . '#webpage',
			),
			'isPartOf'         => array( '@id' => home_url( '/#website' ) ),
		);

		$description = has_excerpt( $post )
			? wp_strip_all_tags( $post->post_excerpt )
			: wp_html_excerpt( wp_strip_all_tags( strip_shortcodes( $post->post_content ) ), 300, '…' );

		if ( $description ) {
			$node['abstract']    = $description;
			$node['description'] = $description;
		}

		if ( has_post_thumbnail( $post ) ) {
			$node['image'] = get_the_post_thumbnail_url( $post, 'full' );
		}

		$keywords = array();

		foreach ( (array) get_the_category( $post->ID ) as $category ) {
			if ( ! is_object( $category ) ) {
				continue;
			}
			$keywords[] = $category->name;
		}

		foreach ( (array) get_the_tags( $post->ID ) as $tag ) {
			if ( ! is_object( $tag ) ) {
				continue;
			}
			$keywords[] = $tag->name;
		}

		if ( ! empty( $keywords ) ) {
			$node['keywords'] = implode( ', ', array_unique( $keywords ) );
		}

		$word_count = str_word_count( wp_strip_all_tags( (string) $post->post_content ) );

		if ( $word_count > 0 ) {
			$node['wordCount'] = $word_count;
		}

		if ( $license ) {
			$node['license'] = $license;
		}

		return $node;
	}


	/**
	 * WebPage node for a single article, so the article's mainEntityOfPage
	 * resolves to a real node in the graph.
	 *
	 * @param \WP_Post $post Post object.
	 *
	 * @return array
	 */
	private function schema_webpage( $post ) {
		$node = array(
			'@type'      => 'WebPage',
			'@id'        => get_permalink( $post ) . '#webpage',
			'url'        => get_permalink( $post ),
			'name'       => wp_strip_all_tags( get_the_title( $post ) ),
			'isPartOf'   => array( '@id' => home_url( '/#website' ) ),
			'inLanguage' => str_replace( '_', '-', get_locale() ),
			'datePublished' => get_the_date( DATE_W3C, $post ),
			'dateModified'  => get_the_modified_date( DATE_W3C, $post ),
		);

		if ( has_post_thumbnail( $post ) ) {
			$node['primaryImageOfPage'] = array(
				'@type' => 'ImageObject',
				'url'   => get_the_post_thumbnail_url( $post, 'full' ),
			);
		}

		return $node;
	}

	/**
	 * WebPage node for a single page.
	 *
	 * @param \WP_Post $post Page object.
	 *
	 * @return array
	 */
	private function schema_page( $post ) {
		$node = array(
			'@type'      => 'WebPage',
			'@id'        => get_permalink( $post ) . '#webpage',
			'url'        => get_permalink( $post ),
			'name'       => wp_strip_all_tags( get_the_title( $post ) ),
			'isPartOf'   => array( '@id' => home_url( '/#website' ) ),
			'inLanguage' => str_replace( '_', '-', get_locale() ),
			'datePublished' => get_the_date( DATE_W3C, $post ),
			'dateModified'  => get_the_modified_date( DATE_W3C, $post ),
		);

		if ( has_excerpt( $post ) ) {
			$node['description'] = wp_strip_all_tags( $post->post_excerpt );
		}

		return $node;
	}

	/**
	 * Person node for an author, with profile links when present.
	 *
	 * @param int  $author_id  Author ID.
	 * @param bool $standalone Whether this is the primary profile node.
	 *
	 * @return array
	 */
	private function schema_author( $author_id, $standalone = false ) {
		$user = get_userdata( $author_id );

		if ( ! $user ) {
			return array();
		}

		$node = array(
			'@type' => 'Person',
			'@id'   => $this->author_id( $author_id ),
			'name'  => $user->display_name,
		);

		if ( '' !== (string) $user->description ) {
			$node['description'] = wp_html_excerpt( wp_strip_all_tags( $user->description ), 300, '…' );
		}

		$node['url'] = get_author_posts_url( $author_id );

		$same_as  = array();
		$profiles = array( 'website', 'mastodon', 'linkedin', 'x' );

		foreach ( $profiles as $key ) {
			$value = (string) get_user_meta( $author_id, 'rwm_profile_' . $key, true );
			if ( $value ) {
				$same_as[] = esc_url_raw( $value );
			}
		}

		if ( ! empty( $same_as ) ) {
			$node['sameAs'] = array_values( array_unique( $same_as ) );
		}

		if ( $standalone ) {
			return array(
				'@type'      => 'ProfilePage',
				'@id'        => get_author_posts_url( $author_id ) . '#profilepage',
				'url'        => get_author_posts_url( $author_id ),
				'name'       => $user->display_name,
				'isPartOf'   => array( '@id' => home_url( '/#website' ) ),
				'inLanguage' => str_replace( '_', '-', get_locale() ),
				'mainEntity' => $node,
			);
		}

		return $node;
	}


	/**
	 * Person `@id` for an author.
	 *
	 * @param int $author_id Author ID.
	 *
	 * @return string
	 */
	private function author_id( $author_id ) {
		return get_author_posts_url( $author_id ) . '#person';
	}

	/**
	 * BreadcrumbList node.
	 *
	 * @param \WP_Post $post Post object.
	 *
	 * @return array
	 */
	private function schema_breadcrumb( $post ) {
		$items = array();

		foreach ( self::breadcrumb_trail( $post ) as $index => $crumb ) {
			$item = array(
				'@type'    => 'ListItem',
				'position' => $index + 1,
				'name'     => $crumb['name'],
			);

			if ( ! empty( $crumb['url'] ) ) {
				$item['item'] = $crumb['url'];
			}

			$items[] = $item;
		}

		return array(
			'@type'           => 'BreadcrumbList',
			'@id'             => get_permalink( $post ) . '#breadcrumb',
			'itemListElement' => $items,
		);
	}

	/**
	 * The visible breadcrumb trail for a singular object.
	 *
	 * Shared by the BreadcrumbList schema and the theme's rendered
	 * breadcrumbs so the markup always describes what visitors can see.
	 *
	 * @param \WP_Post|null $post Post object. Defaults to the queried object.
	 *
	 * @return array[] List of `name`/`url` pairs.
	 */
	public static function breadcrumb_trail( $post = null ) {
		$post = $post ? get_post( $post ) : get_queried_object();

		if ( ! $post instanceof \WP_Post ) {
			return array();
		}

		$trail = array(
			array(
				'name' => __( 'Home', 'reme' ),
				'url'  => home_url( '/' ),
			),
		);

		if ( 'post' === $post->post_type ) {
			$categories     = get_the_category( $post->ID );
			$page_for_posts = (int) get_option( 'page_for_posts' );

			if ( ! empty( $categories ) ) {
				$trail[] = array(
					'name' => wp_strip_all_tags( $categories[0]->name ),
					'url'  => get_category_link( $categories[0]->term_id ),
				);
			} elseif ( $page_for_posts ) {
				$trail[] = array(
					'name' => wp_strip_all_tags( get_the_title( $page_for_posts ) ),
					'url'  => get_permalink( $page_for_posts ),
				);
			}
		} else {
			foreach ( array_reverse( get_post_ancestors( $post ) ) as $ancestor_id ) {
				$trail[] = array(
					'name' => wp_strip_all_tags( get_the_title( $ancestor_id ) ),
					'url'  => get_permalink( $ancestor_id ),
				);
			}
		}

		$trail[] = array(
			'name' => wp_strip_all_tags( get_the_title( $post ) ),
			'url'  => get_permalink( $post ),
		);

		/**
		 * Filters the breadcrumb trail used by schema and visible markup.
		 *
		 * @param array[]  $trail List of `name`/`url` pairs.
		 * @param \WP_Post $post  Post object.
		 */
		return (array) apply_filters( 'reme_seo_breadcrumb_trail', $trail, $post );
	}

	/**
	 * CollectionPage node for archives.
	 *
	 * @return array
	 */
	private function schema_collection() {
		$queried = get_queried_object();

		$name = __( 'Articles', 'reme' );

		if ( $queried instanceof \WP_Term ) {
			$name = $queried->name;
		} elseif ( is_author() ) {
			$name = get_the_author_meta( 'display_name', (int) get_query_var( 'author' ) );
		}

		return array(
			'@type'      => 'CollectionPage',
			'@id'        => $this->get_canonical_url() . '#collection',
			'url'        => $this->get_canonical_url(),
			'name'       => $name,
			'isPartOf'   => array( '@id' => home_url( '/#website' ) ),
			'inLanguage' => str_replace( '_', '-', get_locale() ),
		);
	}

	/**
	 * Emit Product graphs for affiliate cards after content has rendered.
	 *
	 * @return void
	 */
	public function render_deferred_schema() {
		if ( self::has_seo_plugin() || ! $this->enabled( self::MOD_STRUCTURED_DATA ) ) {
			return;
		}

		$products = self::get_products();

		if ( empty( $products ) ) {
			return;
		}

		$nodes = array();

		foreach ( $products as $index => $product ) {
			$node = array(
				'@type' => 'Product',
				'@id'   => $this->get_canonical_url() . '#product-' . ( $index + 1 ),
				'name'  => $product['name'],
			);

			if ( ! empty( $product['description'] ) ) {
				$node['description'] = wp_strip_all_tags( $product['description'] );
			}

			if ( ! empty( $product['image'] ) ) {
				$node['image'] = $product['image'];
			}

			if ( ! empty( $product['brand'] ) ) {
				$node['brand'] = array(
					'@type' => 'Brand',
					'name'  => $product['brand'],
				);
			}

			if ( ! empty( $product['price'] ) ) {
				$node['offers'] = array(
					'@type'         => 'Offer',
					'price'         => $product['price_numeric'] ? $product['price_numeric'] : $product['price'],
					'priceCurrency' => $product['currency'],
					'url'           => $product['url'],
					'availability'  => 'https://schema.org/InStock',
				);
			}

			if ( ! empty( $product['rating'] ) && ! empty( $product['rating_count'] ) ) {
				$node['aggregateRating'] = array(
					'@type'       => 'AggregateRating',
					'ratingValue' => $product['rating'],
					'ratingCount' => $product['rating_count'],
				);
			}

			$nodes[] = $node;
		}

		$graph = array(
			'@context' => 'https://schema.org',
			'@graph'   => array_values( array_unique( $nodes, SORT_REGULAR ) ),
		);

		printf(
			"\n<script type=\"application/ld+json\">%s</script>\n",
			wp_json_encode( $graph, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Encoded JSON-LD.
		);
	}

	/* ---------------------------------------------------------------------
	 * Robots, sitemaps and AI discovery
	 * ------------------------------------------------------------------ */

	/**
	 * Add snippet-friendly directives without overriding core's noindex logic.
	 *
	 * @param array $robots Robots directives.
	 *
	 * @return array
	 */
	public function filter_wp_robots( $robots ) {
		if ( isset( $robots['noindex'] ) ) {
			return $robots;
		}

		if ( ! self::has_seo_plugin() ) {
			$robots['max-image-preview'] = 'large';
			$robots['max-snippet']       = '-1';
			$robots['max-video-preview'] = '-1';
		}

		// Date archives are thin duplicates of the article list. They stay
		// crawlable (links are followed) but out of the index.
		$noindex = is_date() || is_search();

		if ( ! $noindex && is_tag() ) {
			$term     = get_queried_object();
			$noindex  = $term instanceof \WP_Term && (int) $term->count < 3;
		}

		/**
		 * Filters whether the current archive is excluded from the index.
		 *
		 * @param bool $noindex Whether to noindex.
		 */
		if ( apply_filters( 'reme_seo_noindex_archive', $noindex ) ) {
			$robots['noindex'] = true;
			$robots['follow']  = true;
		}

		return $robots;
	}

	/**
	 * Declare an explicit AI crawler policy in robots.txt.
	 *
	 * Search and user-triggered retrieval crawlers are allowed by default so
	 * the site can be cited. Model-training crawlers are blocked unless the
	 * publisher opts in, which keeps the licensing decision explicit.
	 *
	 * @param string $output  Robots.txt content.
	 * @param bool   $public  Whether the site is public.
	 *
	 * @return string
	 */
	public function filter_robots_txt( $output, $public ) {
		if ( ! $public ) {
			return $output;
		}

		$search_bots = array( 'OAI-SearchBot', 'PerplexityBot', 'Claude-SearchBot', 'Claude-User', 'ChatGPT-User', 'Perplexity-User', 'Google-Extended' );
		$train_bots  = array( 'GPTBot', 'ClaudeBot', 'CCBot', 'GoogleOther', 'meta-externalagent' );

		/**
		 * Filters the AI crawler policy applied to robots.txt.
		 *
		 * @param array $policy {
		 *     @type string[] $search         Crawlers allowed when search discovery is allowed.
		 *     @type string[] $training       Crawlers blocked when training is disallowed.
		 *     @type bool     $allow_search   Allow search/retrieval crawlers.
		 *     @type bool     $allow_training Allow model-training crawlers.
		 * }
		 */
		$policy = (array) apply_filters(
			'reme_seo_ai_crawler_policy',
			array(
				'search'         => $search_bots,
				'training'       => $train_bots,
				'allow_search'   => $this->enabled( self::MOD_AI_SEARCH_BOTS, true ),
				'allow_training' => $this->enabled( self::MOD_AI_TRAIN_BOTS, false ),
			)
		);

		$output .= "\n# AI crawler policy (ResearchWith.me)\n";

		if ( ! empty( $policy['allow_search'] ) ) {
			foreach ( (array) $policy['search'] as $bot ) {
				$output .= "User-agent: {$bot}\nAllow: /\n\n";
			}
		} else {
			foreach ( (array) $policy['search'] as $bot ) {
				$output .= "User-agent: {$bot}\nDisallow: /\n\n";
			}
		}

		if ( empty( $policy['allow_training'] ) ) {
			foreach ( (array) $policy['training'] as $bot ) {
				$output .= "User-agent: {$bot}\nDisallow: /\n\n";
			}
		}

		$output .= "# Ad and PDF endpoints are not indexable\n";
		$output .= "Disallow: /*?rwm_pdf=\n";
		$output .= "Disallow: /*?replytocom=\n";
		$output .= "Disallow: /*?s=\n";

		if ( $this->enabled( self::MOD_LLMS_TXT, false ) ) {
			$output .= "\n# Machine-readable summary for AI systems\n";
			$output .= 'Allow: /llms.txt' . "\n";
		}

		return $output;
	}

	/**
	 * Register the llms.txt rewrite.
	 *
	 * @return void
	 */
	public function register_llms_txt_route() {
		add_rewrite_rule( '^llms\.txt$', 'index.php?reme_llms_txt=1', 'top' );
		add_rewrite_rule( '^llms-full\.txt$', 'index.php?reme_llms_txt=full', 'top' );

		// Rewrite rules only take effect after a flush; do it once per version.
		if ( get_option( 'reme_seo_rewrite_version' ) !== REME_VERSION ) {
			flush_rewrite_rules( false );
			update_option( 'reme_seo_rewrite_version', REME_VERSION );
		}

		add_filter(
			'query_vars',
			static function ( $vars ) {
				$vars[] = 'reme_llms_txt';
				return $vars;
			}
		);
	}

	/**
	 * Serve llms.txt / llms-full.txt when requested.
	 *
	 * @return void
	 */
	public function maybe_render_llms_txt() {
		$request = get_query_var( 'reme_llms_txt' );

		if ( empty( $request ) ) {
			return;
		}

		if ( ! $this->enabled( self::MOD_LLMS_TXT, false ) ) {
			status_header( 404 );
			nocache_headers();
			exit;
		}

		nocache_headers();
		header( 'Content-Type: text/plain; charset=utf-8' );
		header( 'X-Robots-Tag: noindex' );

		echo $this->build_llms_txt( 'full' === $request ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Plain text body.

		exit;
	}

	/**
	 * Build the llms.txt document.
	 *
	 * @param bool $full Whether to append recent publication summaries.
	 *
	 * @return string
	 */
	private function build_llms_txt( $full = false ) {
		$site = get_bloginfo( 'name' );
		$desc = get_bloginfo( 'description' );

		$lines   = array();
		$lines[] = '# ' . $site;
		$lines[] = '';
		$lines[] = '> ' . ( $desc ? $desc : __( 'Original writing and analysis across research, tech, culture and more.', 'reme' ) );
		$lines[] = '';
		$lines[] = '## About';
		$lines[] = '';
		$lines[] = __( 'This site publishes original writing and analysis across research, technology, culture and more. Canonical article URLs are stable; each post exposes its own permalink and metadata.', 'reme' );
		$lines[] = '';
		$lines[] = '## Key pages';
		$lines[] = '';

		$key_pages = array(
			__( 'Home', 'reme' )         => home_url( '/' ),
			__( 'Articles', 'reme' ) => get_post_type_archive_link( 'post' ) ? get_post_type_archive_link( 'post' ) : home_url( '/' ),
		);

		$page_for_posts = (int) get_option( 'page_for_posts' );
		if ( $page_for_posts ) {
			$key_pages[ __( 'Blog posts', 'reme' ) ] = get_permalink( $page_for_posts );
		}

		$about_page = get_page_by_path( 'about' );
		if ( $about_page ) {
			$key_pages[ __( 'About', 'reme' ) ] = get_permalink( $about_page );
		}

		$submission_page = get_page_by_path( 'contact' );
		if ( $submission_page ) {
			$key_pages[ __( 'Contact', 'reme' ) ] = get_permalink( $submission_page );
		}

		/**
		 * Filters the pages listed in llms.txt.
		 *
		 * @param array<string,string> $key_pages Label => URL.
		 */
		foreach ( (array) apply_filters( 'reme_seo_llms_key_pages', $key_pages ) as $label => $url ) {
			$lines[] = sprintf( '- [%s](%s)', $label, $url );
		}

		$lines[] = '';
		$lines[] = '## Recent articles';
		$lines[] = '';

		$query = new \WP_Query(
			array(
				'post_type'              => 'post',
				'post_status'            => 'publish',
				'posts_per_page'         => $full ? 100 : 20,
				'no_found_rows'          => true,
				'update_post_term_cache' => false,
				'ignore_sticky_posts'    => true,
			)
		);

		foreach ( $query->posts as $post ) {
			$license = (string) get_post_meta( $post->ID, '_rwm_pdf_license', true );
			$suffix  = array( get_the_date( 'Y-m-d', $post ) );

			if ( $license ) {
				$suffix[] = $license;
			}

			$lines[] = sprintf(
				'- [%s](%s): %s',
				wp_strip_all_tags( get_the_title( $post ) ),
				get_permalink( $post ),
				implode( ' | ', $suffix )
			);

			if ( $full ) {
				$abstract = has_excerpt( $post )
					? wp_strip_all_tags( $post->post_excerpt )
					: wp_html_excerpt( wp_strip_all_tags( strip_shortcodes( $post->post_content ) ), 280, '…' );

				if ( $abstract ) {
					$lines[] = '  ' . $abstract;
				}
			}
		}

		wp_reset_postdata();

		$lines[] = '';
		$lines[] = '## Citation policy';
		$lines[] = '';
		$lines[] = __( 'Citation of published articles is encouraged and unrestricted. Model-training use is governed by the rights statement of each article. Where a Creative Commons license is declared, that license controls reuse.', 'reme' );
		$lines[] = '';

		return implode( "\n", $lines );
	}

	/**
	 * Serve Markdown at the canonical URL when an agent asks for it.
	 *
	 * Agents that send `Accept: text/markdown` get a clean document instead of
	 * scraping HTML; browsers are unaffected.
	 *
	 * @return void
	 */
	public function maybe_render_markdown() {
		if ( ! $this->enabled( self::MOD_MARKDOWN, true ) || ! is_singular() ) {
			return;
		}

		$accept = isset( $_SERVER['HTTP_ACCEPT'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_ACCEPT'] ) ) : '';

		if ( false === stripos( $accept, 'text/markdown' ) ) {
			return;
		}

		$post = get_queried_object();

		if ( ! $post instanceof \WP_Post || post_password_required( $post ) ) {
			return;
		}

		header( 'Content-Type: text/markdown; charset=utf-8' );
		header( 'Vary: Accept' );
		nocache_headers();

		echo $this->build_markdown( $post ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Plain text body.

		exit;
	}

	/**
	 * Convert an article to Markdown for agent consumption.
	 *
	 * @param \WP_Post $post Post object.
	 *
	 * @return string
	 */
	private function build_markdown( $post ) {
		$author   = get_the_author_meta( 'display_name', $post->post_author );
		$license  = (string) get_post_meta( $post->ID, '_rwm_pdf_license', true );

		$front = array(
			'title'   => wp_strip_all_tags( get_the_title( $post ) ),
			'url'     => get_permalink( $post ),
			'author'  => $author,
			'published' => get_the_date( 'c', $post ),
			'modified'  => get_the_modified_date( 'c', $post ),
		);

		$lines = array( '---' );

		foreach ( $front as $key => $value ) {
			if ( '' === (string) $value ) {
				continue;
			}
			$lines[] = $key . ': ' . wp_json_encode( (string) $value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
		}

		$lines[] = '---';
		$lines[] = '';
		$lines[] = '# ' . wp_strip_all_tags( get_the_title( $post ) );
		$lines[] = '';

		if ( has_excerpt( $post ) ) {
			$lines[] = '> ' . wp_strip_all_tags( $post->post_excerpt );
			$lines[] = '';
		}

		$content = wp_strip_all_tags( strip_shortcodes( $post->post_content ) );
		$content = preg_replace( "/\n{3,}/", "\n\n", (string) $content );

		$lines[] = trim( (string) $content );
		$lines[] = '';
		$lines[] = '---';
		$lines[] = sprintf(
			/* translators: 1: author name, 2: permalink. */
			__( 'Source: %1$s — %2$s', 'reme' ),
			$author,
			get_permalink( $post )
		);
		$lines[] = '';

		return implode( "\n", $lines );
	}

	/**
	 * Optionally advertise content negotiation to shared caches.
	 *
	 * Sending `Vary: Accept` across HTML responses fragments CDN caches,
	 * because Accept headers vary widely between clients. The Markdown
	 * response sets the header itself, so the site-wide header is opt-in.
	 *
	 * @return void
	 */
	public function add_vary_header() {
		/**
		 * Filters whether `Vary: Accept` is sent on HTML responses.
		 *
		 * @param bool $send Whether to send the header.
		 */
		if ( ! apply_filters( 'reme_seo_vary_accept', false ) ) {
			return;
		}

		if ( ! $this->enabled( self::MOD_MARKDOWN, true ) || ! is_singular() ) {
			return;
		}

		header( 'Vary: Accept', false );
	}

	/**
	 * Keep non-public post types out of the core sitemap.
	 *
	 * @param array $post_types Sitemap post types.
	 *
	 * @return array
	 */
	public function filter_sitemap_post_types( $post_types ) {
		if ( isset( $post_types['rwm_edition'] ) ) {
			unset( $post_types['rwm_edition'] );
		}

		if ( isset( $post_types['attachment'] ) ) {
			unset( $post_types['attachment'] );
		}

		return $post_types;
	}

	/**
	 * Keep empty taxonomies out of the core sitemap.
	 *
	 * @param array $taxonomies Sitemap taxonomies.
	 *
	 * @return array
	 */
	public function filter_sitemap_taxonomies( $taxonomies ) {
		if ( isset( $taxonomies['post_format'] ) ) {
			unset( $taxonomies['post_format'] );
		}

		return $taxonomies;
	}

	/**
	 * Exclude noindexed and password-protected posts from the sitemap.
	 *
	 * @param array $args Query arguments.
	 *
	 * @return array
	 */
	public function filter_sitemap_query_args( $args ) {
		$args['has_password'] = false;

		return $args;
	}
}
