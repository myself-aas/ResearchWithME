<?php
/**
 * Template Name: Articles Archive
 * Template Post Type: page
 *
 * Displays a listing of articles. Queries the 'post' post type by default,
 * falling back to the 'publication' / 'rwm_edition' custom post types when
 * those plugins are active. Intended for the starter "Work" page.
 *
 * @package ReMe
 * @since   1.0.0
 */

/**
 * Container class filter.
 *
 * @param string $classes Container classes.
 * @since 1.0.0
 */
$container_class = apply_filters( 'reme_container_class_filter', 'container', 'articles-archive' );

get_header();

?>
<div class="<?php echo esc_attr( $container_class ); ?> articles-archive-container">

	<?php
	/**
	 * Executes actions before the page header.
	 *
	 * @since 2.4.0
	 */
	do_action( 'reme_before_page_header' );

	/**
	 * Executes the rendering function for the page header.
	 *
	 * @param string $context The displaying location context.
	 *
	 * @since 1.0.7
	 */
	do_action( 'reme_page_header', 'single-page' );

	/**
	 * Executes actions before the page content.
	 *
	 * @param string $context The displaying location context.
	 *
	 * @since 1.0.7
	 */
	do_action( 'reme_before_content', 'single-page' );
	?>

	<div class="row">
		<div class="rm-single-page-wrap col">
			<?php
			/**
			 * Render the page's own content (intro text, featured article callout, etc.).
			 */
			if ( have_posts() ) {
				while ( have_posts() ) {
					the_post();
					get_template_part( 'template-parts/content', 'page' );
				}
			} else {
				get_template_part( 'template-parts/content', 'none' );
			}
			?>

			<?php
			/**
			 * Articles archive listing.
			 *
			 * Queries the 'post' post type by default, falling back to the
			 * 'publication' post type used by the publications plugin, then
			 * the 'rwm_edition' post type used by the PDF Editions plugin.
			 */
			if ( post_type_exists( 'publication' ) ) {
				$archive_post_type = 'publication';
			} elseif ( post_type_exists( 'rwm_edition' ) ) {
				$archive_post_type = 'rwm_edition';
			} else {
				$archive_post_type = 'post';
			}

			$articles = new \WP_Query(
				array(
					'post_type'      => $archive_post_type,
					'post_status'    => 'publish',
					'posts_per_page' => get_theme_mod( 'reme_articles_per_page', 12 ),
					'paged'          => get_query_var( 'paged' ) ? get_query_var( 'paged' ) : 1,
					'orderby'        => 'date',
					'order'          => 'DESC',
				)
			);

			if ( $articles->have_posts() ) :
				?>
				<div class="reme-articles-grid">
					<?php
					while ( $articles->have_posts() ) :
						$articles->the_post();
						get_template_part( 'template-parts/content', $archive_post_type );
					endwhile;
					?>
				</div>
				<?php
				/**
				 * Articles pagination.
				 */
				do_action( 'reme_do_pagination', 'articles-archive' );
				wp_reset_postdata();
			else :
				get_template_part( 'template-parts/content', 'none' );
			endif;
			?>

			<?php
			/**
			 * Executes actions after the page content.
			 *
			 * @param string $context The displaying location context.
			 *
			 * @since 1.0.7
			 */
			do_action( 'reme_after_content', 'single-page' );
			?>
		</div>
	</div>
</div>
<?php get_footer(); ?>
