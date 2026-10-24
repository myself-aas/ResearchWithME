<?php
/**
 * Publication Archive template.
 *
 * Displays a listing of publications / research papers.
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
$container_class = apply_filters( 'reme_container_class_filter', 'container', 'archive-publication' );

get_header();

$wrapper_classes = array( 'posts-wrapper' );
$wrapper_classes = apply_filters( 'reme_posts_wrapper_class', $wrapper_classes );

?>
<div class="<?php echo esc_attr( $container_class ); ?> archive-publication-container">

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
	do_action( 'reme_page_header', 'archive' );

	/**
	 * Executes actions before the page content.
	 *
	 * @param string $context The displaying location context.
	 *
	 * @since 1.0.7
	 */
	do_action( 'reme_before_content', 'archive' );
	?>

	<div class="row">
		<?php do_action( 'reme_do_sidebar', 'archive', 'left' ); ?>
		<div class="rm-index-posts blog col">
			<?php
			/**
			 * Executes actions before the posts loop start.
			 *
			 * @since 2.4.0
			 */
			do_action( 'reme_before_loop' );

			/**
			 * Executes actions before the post loop.
			 *
			 * @since 2.3.10
			 */
			do_action( 'reme_before_posts_loop' );

			if ( have_posts() ) {
				/* Start the Loop. */
				echo '<div class="' . esc_attr( join( ' ', $wrapper_classes ) ) . '">';

				$pagination_type = get_theme_mod( 'reme_pagination_type', 'number' );
				if ( $pagination_type !== 'infinite' ) {
					global $wp_query;

					$posts_on_current_page = $wp_query->post_count;
					$hook_after_post       = -1;

					if ( $posts_on_current_page >= 2 ) {
						$hook_after_post = (int) ceil( $posts_on_current_page / 2 );
					}
					$post_index = 1;
				}

				reme_do_loop_hook( 'before' );

				while ( have_posts() ) {
					the_post();

					reme_do_loop_hook( 'entry_before' );

					get_template_part( 'template-parts/content', 'publication' );

					reme_do_loop_hook( 'entry_after' );

					if ( $pagination_type !== 'infinite' ) {
						if ( $post_index === $hook_after_post && $hook_after_post !== -1 ) {
							do_action( 'reme_middle_posts_loop' );
						}
						$post_index++;
					}
				}
				echo '</div>';
				if ( ! is_singular() ) {
					do_action( 'reme_do_pagination', 'archive-publication' );
				}
			} else {
				get_template_part( 'template-parts/content', 'none' );
			}
			?>
			<div class="w-100"></div>
			<?php
			/**
			 * Executes actions after the post loop.
			 *
			 * @since 2.3.10
			 */
			do_action( 'reme_after_posts_loop' );

			reme_do_loop_hook( 'after' );
			?>
		</div>
		<?php do_action( 'reme_do_sidebar', 'archive', 'right' ); ?>
	</div>
</div>
<?php get_footer(); ?>
