<?php
/**
 * Author:          Andrei Baicus <andrei@themeisle.com>
 * Created on:      27/08/2018
 *
 * @package ReMe\Views\Layouts
 */

namespace ReMe\Views\Layouts;

use ReMe\Customizer\Defaults\Layout;
use ReMe\Views\Base_View;

/**
 * Class Layout_Container
 *
 * @package ReMe\Views\Layouts
 */
class Layout_Sidebar extends Base_View {
	use Layout;

	/**
	 * Function that is run after instantiation.
	 *
	 * @return void
	 */
	public function init() {
		add_action( 'reme_do_sidebar', array( $this, 'sidebar' ), 10, 2 );
		add_filter( 'body_class', array( $this, 'add_body_class' ) );
	}

	/**
	 * Render the sidebar.
	 *
	 * @param string $context  context passed into do_action.
	 * @param string $position position passed into do_action.
	 */
	public function sidebar( $context, $position ) {
		$sidebar_setup = $this->get_sidebar_setup( $context );
		$theme_mod     = $sidebar_setup['theme_mod'];
		$theme_mod     = apply_filters( 'reme_sidebar_position', get_theme_mod( $theme_mod, $this->sidebar_layout_alignment_default( $theme_mod ) ) );

		$content_width = get_theme_mod( $sidebar_setup['content_width'], $this->sidebar_layout_width_default( $sidebar_setup['content_width'] ) );

		$meta_width = apply_filters( 'reme_meta_content_width', false );

		if ( $meta_width !== false && ! empty( $meta_width ) ) {
			$content_width = $meta_width;
		}

		$class_hide_sidebar_conditionally = '';

		if ( $content_width >= 95 ) {
			$class_hide_sidebar_conditionally = 'hide';
			if ( ! is_customize_preview() ) {
				// do not load sidebar as SSR
				return;
			}
		}

		if ( $theme_mod !== $position ) {
			return;
		}

		if ( ! is_active_sidebar( $sidebar_setup['sidebar_slug'] ) ) {
			return;
		}

		global $wp_registered_sidebars;
		$sidebar_label = isset( $wp_registered_sidebars[ $sidebar_setup['sidebar_slug'] ]['name'] )
			? $wp_registered_sidebars[ $sidebar_setup['sidebar_slug'] ]['name']
			: $sidebar_setup['sidebar_slug'];

		$args = array(
			'wrap_classes' => 'rm-' . $position . ' ' . $sidebar_setup['sidebar_slug'] . ' ' . $class_hide_sidebar_conditionally,
			'data_attrs'   => apply_filters( 'reme_sidebar_data_attrs', '', $sidebar_setup['sidebar_slug'] ),
			'close_button' => '',
			'slug'         => $sidebar_setup['sidebar_slug'],
			'context'      => $context,
			'position'     => $position,
			'label'        => $sidebar_label,
		);

		$this->get_view( 'sidebar', $args );
	}

	/**
	 * Add classes to the main tag.
	 *
	 * @param array $classes the body classes.
	 *
	 * @return array
	 */
	public function add_body_class( $classes ) {
		$context = $this->get_context();

		$sidebar_setup = $this->get_sidebar_setup( $context );
		$theme_mod     = $sidebar_setup['theme_mod'];
		$theme_mod     = apply_filters( 'reme_sidebar_position', get_theme_mod( $theme_mod, $this->sidebar_layout_alignment_default( $theme_mod ) ) );

		$layout       = get_theme_mod( 'reme_blog_archive_layout', 'grid' );
		$posts_layout = ' rm-blog-' . $layout;

		$classes[] = $posts_layout;
		$classes[] = 'rm-sidebar-' . $theme_mod;

		return $classes;
	}

	/**
	 * Get the sidebar setup. Returns array (`theme_mod`, `sidebar_slug`) based on context.
	 *
	 * @param string $context the provided context.
	 *
	 * @return array
	 */
	public function get_sidebar_setup( $context ) {
		$advanced_options = get_theme_mod( 'reme_advanced_layout_options', true );
		$sidebar_setup    = [
			'theme_mod'     => '',
			'content_width' => '',
			'sidebar_slug'  => 'blog-sidebar',
		];

		if ( $advanced_options === false ) {
			$sidebar_setup['theme_mod']     = 'reme_default_sidebar_layout';
			$sidebar_setup['content_width'] = 'reme_sitewide_content_width';
			$sidebar_setup['has_widgets']   = is_active_sidebar( $sidebar_setup['sidebar_slug'] );

			return apply_filters( 'reme_before_returning_sidebar_setup', $sidebar_setup );
		}

		switch ( $context ) {
			case 'blog-archive':
				$sidebar_setup['theme_mod']     = 'reme_blog_archive_sidebar_layout';
				$sidebar_setup['content_width'] = 'reme_blog_archive_content_width';
				break;
			case 'single-post':
				$sidebar_setup['theme_mod'] = 'reme_single_post_sidebar_layout';
				break;
			case 'single-page':
				$sidebar_setup['theme_mod']     = 'reme_other_pages_sidebar_layout';
				$sidebar_setup['content_width'] = 'reme_other_pages_content_width';
				break;
			default:
				$sidebar_setup['theme_mod']     = 'reme_other_pages_sidebar_layout';
				$sidebar_setup['content_width'] = 'reme_other_pages_content_width';
		}

		$sidebar_setup['has_widgets'] = is_active_sidebar( $sidebar_setup['sidebar_slug'] );

		$sidebar_setup = apply_filters( 'reme_before_returning_sidebar_setup', apply_filters( 'reme_sidebar_setup_filter', $sidebar_setup ) );

		add_filter(
			'reme_' . $context . '_sidebar_setup',
			function () use ( $sidebar_setup ) {
				return $sidebar_setup;
			}
		);
		return $sidebar_setup;
	}

	/**
	 * Get current context.
	 *
	 * @return string|false
	 */
	private function get_context() {
		if ( is_page() ) {
			return 'single-page';
		}

		if ( is_single() ) {
			return 'single-post';
		}

		if ( is_archive() || is_home() ) {
			return 'blog-archive';
		}

		return false;
	}
}
