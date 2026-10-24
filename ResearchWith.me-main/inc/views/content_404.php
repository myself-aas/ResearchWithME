<?php
/**
 * Content 404 class.
 *
 * @package ReMe\Views
 */

namespace ReMe\Views;

/**
 * Class Content_404
 *
 * @package ReMe\Views
 */
class Content_404 extends Base_View {

	/**
	 * Init function.
	 */
	public function init() {
		add_action( 'reme_do_404', array( $this, 'render_404_page' ) );
	}

	/**
	 * Render 404 page.
	 */
	public function render_404_page() {
		$container_class = apply_filters( 'reme_container_class_filter', 'container', 'blog-archive' );

		echo '<div class="' . esc_attr( $container_class ) . ' archive-container">';
		echo '<div class="row">';
		do_action( 'reme_do_sidebar', 'blog-archive', 'left' );
		echo '<div class="rm-index-posts blog col">';

		echo '<div class="col-12 rm-content-none-wrap">';
		echo '<h1>' . esc_html__( 'Page not found', 'reme' ) . '</h1>';
		echo '<p>';
		esc_html_e( 'It seems we can&rsquo;t find what you&rsquo;re looking for. Perhaps searching can help.', 'reme' );
		echo '</p>';
		echo '<div class="rm-seach-form-wrap">';
		get_search_form( array( 'visible_label' => true ) );
		echo '</div>';
		echo '</div>';

		echo '<div class="w-100"></div>';
		echo '</div>';
		do_action( 'reme_do_sidebar', 'blog-archive', 'right' );
		echo '</div>';
		echo '</div>';
	}
}
