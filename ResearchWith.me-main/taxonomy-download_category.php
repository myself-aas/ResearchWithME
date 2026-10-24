<?php
/**
 * Author:          Uriahs Victor
 * Created on:      14/07/2021 (d/m/y)
 *
 * @package ReMe
 */

$container_class = apply_filters( 'reme_container_class_filter', 'container', 'download-archive' );

get_header();

?>

<div id= "rm-edd-download-archive-container" class="<?php echo esc_attr( $container_class ); ?>">

		<div id="wrapper">
			<?php
				/**
				 * Executes actions before the archive content.
				 *
				 * @since 3.0.0
				 */
				do_action( 'reme_before_download_archive' );
			?>
			<div id="rm-edd-grid-container">
				<?php
				if ( have_posts() ) {
				
					while ( have_posts() ) {
						the_post();
						get_template_part( 'template-parts/content-download-archive' ); 
					}
				} else {
					get_template_part( 'template-parts/content', 'none' );
				}

					/**
					* Executes actions after the post content.
					*
					* @since 3.0.0
					*/
					do_action( 'reme_after_download_archive' );
					
				?>
			</div>
				<?php 
					/**
					 * Download pagination
					 */
					reme_edd_download_nav();        
				?>
		</div>

</div>

<?php
get_footer();
