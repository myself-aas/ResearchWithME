<?php
/**
 * Front Page template.
 *
 * Displays the static front page when "A static page" is selected under
 * Settings > Reading. Falls back to the page assigned as the front page.
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
$container_class = apply_filters( 'reme_container_class_filter', 'container', 'front-page' );

get_header();

?>
<div class="<?php echo esc_attr( $container_class ); ?> front-page-container">

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
	do_action( 'reme_page_header', 'front-page' );

	/**
	 * Executes actions before the page content.
	 *
	 * @param string $context The displaying location context.
	 *
	 * @since 1.0.7
	 */
	do_action( 'reme_before_content', 'front-page' );
	?>

	<div class="row">
		<?php do_action( 'reme_do_sidebar', 'front-page', 'left' ); ?>
		<div class="rm-single-page-wrap col">
			<?php
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
			 * Executes actions after the page content.
			 *
			 * @param string $context The displaying location context.
			 *
			 * @since 1.0.7
			 */
			do_action( 'reme_after_content', 'front-page' );
			?>
		</div>
		<?php do_action( 'reme_do_sidebar', 'front-page', 'right' ); ?>
	</div>
</div>
<?php get_footer(); ?>
