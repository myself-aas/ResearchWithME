<?php
/**
 * Author Archive template.
 *
 * Displays an author / researcher profile archive with their publications.
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
$container_class = apply_filters( 'reme_container_class_filter', 'container', 'author' );

get_header();

$wrapper_classes = array( 'posts-wrapper' );
$wrapper_classes = apply_filters( 'reme_posts_wrapper_class', $wrapper_classes );

?>
<div class="<?php echo esc_attr( $container_class ); ?> author-container">

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
	do_action( 'reme_page_header', 'author' );

	/**
	 * Executes actions before the page content.
	 *
	 * @param string $context The displaying location context.
	 *
	 * @since 1.0.7
	 */
	do_action( 'reme_before_content', 'author' );
	?>

	<div class="row">
		<div class="rm-author-profile-wrap col">
			<?php
			/**
			 * Author profile header block.
			 *
			 * @since 1.0.0
			 */
			$author_id = (int) get_query_var( 'author' );
			$user      = get_userdata( $author_id );

			if ( $user ) :
				?>
				<div class="reme-author-header">
					<div class="reme-author-avatar">
						<?php echo get_avatar( $author_id, 150 ); ?>
					</div>
					<div class="reme-author-info">
						<h1 class="reme-author-name"><?php echo esc_html( $user->display_name ); ?></h1>
						<?php
						$title = get_user_meta( $author_id, 'title', true );
						if ( $title ) :
							?>
							<p class="reme-author-title"><?php echo esc_html( $title ); ?></p>
						<?php endif; ?>
						<?php
						$orcid = get_user_meta( $author_id, 'orcid_id', true );
						if ( $orcid ) :
							?>
							<p class="reme-author-orcid"><strong><?php esc_html_e( 'ORCID:', 'reme' ); ?></strong> <a href="<?php echo esc_url( 'https://orcid.org/' . $orcid ); ?>" rel="me nofollow"><?php echo esc_html( $orcid ); ?></a></p>
						<?php endif; ?>
						<?php
						foreach ( array( 'google_scholar', 'researchgate', 'linkedin', 'mastodon', 'website' ) as $key ) {
							$url = get_user_meta( $author_id, 'rwm_profile_' . $key, true );
							if ( $url ) :
								?>
								<p class="reme-author-profile-<?php echo esc_attr( $key ); ?>"><strong><?php echo esc_html( ucwords( str_replace( '_', ' ', $key ) ) ) . ':'; ?></strong> <a href="<?php echo esc_url( $url ); ?>" rel="me nofollow noopener"><?php echo esc_html( $url ); ?></a></p>
							<?php endif;
						}
						$description = $user->description;
						if ( $description ) :
							?>
							<div class="reme-author-bio"><?php echo wp_kses_post( $description ); ?></div>
						<?php endif; ?>
					</div>
				</div>
				<?php
			endif;
			?>

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

					get_template_part( 'template-parts/content', get_post_type() );

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
					do_action( 'reme_do_pagination', 'author' );
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
		<?php do_action( 'reme_do_sidebar', 'author', 'right' ); ?>
	</div>
</div>
<?php get_footer(); ?>
