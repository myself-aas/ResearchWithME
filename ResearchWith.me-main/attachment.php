<?php
/**
 * Attachment template.
 *
 * Displays a single media attachment page.
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
$container_class = apply_filters( 'reme_container_class_filter', 'container', 'attachment' );

get_header();

?>
<div class="<?php echo esc_attr( $container_class ); ?> attachment-container">

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
	do_action( 'reme_page_header', 'single-attachment' );

	/**
	 * Executes actions before the page content.
	 *
	 * @param string $context The displaying location context.
	 *
	 * @since 1.0.7
	 */
	do_action( 'reme_before_content', 'single-attachment' );
	?>

	<div class="row">
		<div class="rm-single-post-wrap col">
			<article id="post-<?php echo esc_attr( get_the_ID() ); ?>"
				class="<?php echo esc_attr( join( ' ', get_post_class( 'reme-single-attachment' ) ) ); ?>">
				<?php
				if ( have_posts() ) {
					while ( have_posts() ) {
						the_post();
						get_template_part( 'template-parts/content', 'attachment' );
					}
				} else {
					get_template_part( 'template-parts/content', 'none' );
				}
				?>
			</article>
		</div>
		<?php do_action( 'reme_do_sidebar', 'single-attachment', 'right' ); ?>
	</div>
</div>
<?php get_footer(); ?>
