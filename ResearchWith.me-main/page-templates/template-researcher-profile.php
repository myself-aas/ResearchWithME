<?php
/**
 * Template Name: Author Profile
 * Template Post Type: page
 *
 * Displays an author profile with bio, profile links, and a listing of their
 * recent writing. Used by the starter "Author" page.
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
$container_class = apply_filters( 'reme_container_class_filter', 'container', 'author-profile' );

get_header();

?>
<div class="<?php echo esc_attr( $container_class ); ?> author-profile-container">

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
			 * Author profile meta block (role, social links, bio).
			 * Rendered from the current post's author meta when an author is
			 * identified, otherwise from the page's own post meta.
			 */
			$profile_author_id = get_the_author_meta( 'ID' );
			if ( ! $profile_author_id ) {
				$profile_author_id = (int) get_post_meta( get_the_ID(), 'reme_author_profile_user', true );
			}
			if ( $profile_author_id ) :
				?>
				<div class="reme-author-profile">
					<div class="reme-author-avatar">
						<?php echo get_avatar( $profile_author_id, 120 ); ?>
					</div>
					<div class="reme-author-meta">
						<h2 class="reme-author-name"><?php echo esc_html( get_the_author_meta( 'display_name', $profile_author_id ) ); ?></h2>
						<?php
						$title = get_the_author_meta( 'title', $profile_author_id );
						if ( $title ) :
							?>
							<p class="reme-author-title"><?php echo esc_html( $title ); ?></p>
						<?php endif; ?>
						<?php
						foreach ( array( 'website', 'mastodon', 'linkedin', 'x' ) as $key ) {
							$url = get_the_author_meta( 'rwm_profile_' . $key, $profile_author_id );
							if ( $url ) :
								?>
								<p class="reme-author-profile-<?php echo esc_attr( $key ); ?>"><strong><?php echo esc_html( ucwords( str_replace( '_', ' ', $key ) ) ) . ':'; ?></strong> <a href="<?php echo esc_url( $url ); ?>" rel="me nofollow noopener"><?php echo esc_html( $url ); ?></a></p>
							<?php endif;
						}
						$description = get_the_author_meta( 'description', $profile_author_id );
						if ( $description ) :
							?>
							<div class="reme-author-bio"><?php echo wp_kses_post( $description ); ?></div>
						<?php endif; ?>
					</div>
				</div>
				<?php
				/**
				 * Recent writing by this author.
				 */
				$author_posts = new \WP_Query(
					array(
						'author'         => $profile_author_id,
						'post_type'      => 'post',
						'post_status'    => 'publish',
						'posts_per_page' => get_theme_mod( 'reme_author_posts_per_page', 6 ),
						'orderby'        => 'date',
						'order'          => 'DESC',
					)
				);

				if ( $author_posts->have_posts() ) :
					?>
					<div class="reme-author-posts">
						<h2 class="reme-author-posts-title"><?php esc_html_e( 'Recent writing', 'reme' ); ?></h2>
						<div class="reme-posts-grid">
							<?php
							while ( $author_posts->have_posts() ) :
								$author_posts->the_post();
								get_template_part( 'template-parts/content', 'post' );
							endwhile;
							?>
						</div>
					</div>
					<?php
					wp_reset_postdata();
				endif;
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
