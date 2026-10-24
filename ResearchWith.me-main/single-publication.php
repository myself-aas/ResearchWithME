<?php
/**
 * Single Publication template.
 *
 * Displays a single publication / research paper post.
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
$container_class = apply_filters( 'reme_container_class_filter', 'container', 'single-publication' );

get_header();

?>
<div class="<?php echo esc_attr( $container_class ); ?> single-publication-container">

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
	do_action( 'reme_page_header', 'single-publication' );

	/**
	 * Executes actions before the page content.
	 *
	 * @param string $context The displaying location context.
	 *
	 * @since 1.0.7
	 */
	do_action( 'reme_before_content', 'single-publication' );
	?>

	<div class="row">
		<div class="rm-single-post-wrap col">
			<article id="post-<?php echo esc_attr( get_the_ID() ); ?>"
				class="<?php echo esc_attr( join( ' ', get_post_class( 'reme-single-publication' ) ) ); ?>">
				<?php
				/**
				 * Executes actions before the publication content.
				 *
				 * @since 1.0.0
				 */
				do_action( 'reme_before_publication_content' );

				if ( have_posts() ) {
					while ( have_posts() ) {
						the_post();
						get_template_part( 'template-parts/content', 'publication' );
					}
				} else {
					get_template_part( 'template-parts/content', 'none' );
				}

				/**
				 * Executes actions after the publication content.
				 *
				 * @since 1.0.0
				 */
				do_action( 'reme_after_publication_content' );
				?>
			</article>

			<?php
			/**
			 * Related publications.
			 *
			 * @since 1.0.0
			 */
			do_action( 'reme_do_related_publications' );
			?>
		</div>
		<?php do_action( 'reme_do_sidebar', 'single-publication', 'right' ); ?>
	</div>
</div>
<?php get_footer(); ?>
