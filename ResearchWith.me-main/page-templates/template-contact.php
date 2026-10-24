<?php
/**
 * Template Name: Contact
 * Template Post Type: page
 *
 * Displays a contact page with a contact form block area. Used by the starter
 * "Contact" page.
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
$container_class = apply_filters( 'reme_container_class_filter', 'container', 'contact-page' );

get_header();

?>
<div class="<?php echo esc_attr( $container_class ); ?> contact-page-container">

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
			 * Submission guidelines / contact info block area.
			 * Rendered from the page content above; this section wraps it in a
			 * contact-styled container for themes that want a distinct form zone.
			 */
			?>
			<div class="reme-contact-submission">
				<?php
				/**
				 * Allow plugins (e.g. Contact Form 7, WPForms) or the block editor
				 * to inject the submission form via a dedicated hook.
				 */
				do_action( 'reme_contact_submission_form' );
				?>
			</div>
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
