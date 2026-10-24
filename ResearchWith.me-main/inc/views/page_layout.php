<?php
/**
 * Single page layout.
 *
 * @package ReMe\Views
 */

namespace ReMe\Views;

/**
 * Class Page_Layout
 *
 * @package ReMe\Views
 */
class Page_Layout extends Base_View {

	/**
	 * Init function
	 */
	public function init() {
		add_action( 'reme_do_single_page', [ $this, 'render_page' ] );
	}

	/**
	 * Render single page.
	 */
	public function render_page() {
		echo '<div class="rm-content-wrap entry-content">';
		the_content();

		do_action( 'reme_before_page_comments' );
		if ( comments_open() || get_comments_number() ) {
			comments_template();
		}

		echo '</div>';
		do_action( 'reme_do_pagination', 'single' );
	}
}
