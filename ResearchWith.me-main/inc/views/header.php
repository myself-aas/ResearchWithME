<?php
/**
 * Header View Manager
 *
 * @package ReMe\Views
 */

namespace ReMe\Views;

use HFG\Core\Components\Nav;

/**
 * Class Header
 *
 * @package ReMe\Views
 */
class Header extends Base_View {
	/**
	 * Nav instance number
	 *
	 * @var int
	 */
	public static $primary_nav_instance_no = 1;
	/**
	 * Add hooks for the front end.
	 */
	public function init() {
		add_filter( 'wp_nav_menu_items', array( $this, 'add_last_menu_item' ), 10, 2 );
		add_filter( 'wp_page_menu', array( $this, 'add_fallback_last_menu_items' ), 10, 2 );
		add_action( 'wp_enqueue_scripts', array( $this, 'hide_last_menu_item_search_in_sidebar' ) );
	}

	/**
	 * Hide last menu item search in mobile sidebar.
	 */
	public function hide_last_menu_item_search_in_sidebar() {
		if ( reme_is_new_builder() ) {
			return;
		}

		wp_add_inline_style(
			'reme-style',
			'.header-menu-sidebar-inner li.menu-item-nav-search { display: none; }
		[data-row-id] .row { display: flex !important; align-items: center; flex-wrap: unset;}
		@media (max-width: 960px) { .footer--row .row { flex-direction: column; } }'
		);
	}

	/**
	 * Add the last menu item.
	 *
	 * @param string $items the nav menu markup.
	 * @param object $args  menu properties.
	 *
	 * @return string
	 */
	public function add_last_menu_item( $items, $args ) {
		if ( $args->theme_location !== 'primary' ) {
			return $items;
		}

		if ( strpos( $args->menu_class, 'max-mega-menu' ) ) {
			return $items;
		}

		$items = $this->get_last_menu_items_markup( $items );

		return $items;
	}

	/**
	 * Get the last menu items.
	 *
	 * @param string $items the menu markup.
	 *
	 * @return string
	 */
	private function get_last_menu_items_markup( $items = '' ) {
		$additional_items = $this->get_last_menu_item_setting();
		$additional_items = json_decode( $additional_items, true );
		if ( empty( $additional_items ) ) {
			return $items;
		}
		foreach ( $additional_items as $item ) {
			if ( $item === 'search' ) {
				$items .= $this->get_nav_menu_search();
			} else {
				$items .= apply_filters( 'reme_last_menu_item_' . $item, '' );
			}
		}

		return apply_filters( 'reme_last_menu_item', $items );
	}

	/**
	 * Get the last menu item theme mod value.
	 *
	 * @return string
	 */
	private function get_last_menu_item_setting() {
		$default           = array();
		$current_component = 'default';
		if ( isset( Nav::$current_component ) ) {
			$current_component = Nav::$current_component;
		}
		$last_menu_setting_slug = apply_filters( 'reme_last_menu_setting_slug_' . $current_component, 'reme_last_menu_item' );

		return get_theme_mod( $last_menu_setting_slug, wp_json_encode( $default ) );
	}

	/**
	 * Get the markup for the nav menu search.
	 *
	 * @param bool $responsive should get the responsive version.
	 *
	 * @return string
	 */
	private function get_nav_menu_search( $responsive = false ) {
		// TODO when HFG is live we should drop this at all as we have a section for icon, or offer a way of disabling it.
		$tag   = 'li';
		$class = 'menu-item-nav-search minimal';
		if ( $responsive === true ) {
			$tag = 'span';

			$class .= ' responsive-nav-search ';
		}
		$search = '';

		$id = 'rm-menu-item-search-' . self::$primary_nav_instance_no;

		$search     .= '<' . esc_attr( $tag ) . ' class="' . esc_attr( $class ) . '" id="' . esc_attr( $id ) . '">';
		$extra_attrs = apply_filters( 'reme_search_menu_item_filter', '', self::$primary_nav_instance_no );
		$search     .= '<button type="button" class="rm-nav-search-icon" aria-label="' . esc_attr__( 'Search', 'reme' ) . '" aria-expanded="false" ' . $extra_attrs . '>' . reme_search_icon() . '</button>';
		$search     .= '<div class="rm-nav-search">';
		if ( $responsive === true ) {
			$search .= '<div class="container close-container">';
			$search .= '<button type="button" class="button button-secondary close-responsive-search">' . __( 'Close', 'reme' ) . '</button>';
			$search .= '</div>';
		}
		if ( version_compare( get_bloginfo( 'version' ), '5.2.0', '>=' ) ) {
			$search .= get_search_form( array( 'echo' => false ) );
		} else {
			$search .= get_search_form( false ); // @phpstan-ignore-line
		}
		$search .= '</div>';
		$search .= '</' . esc_attr( $tag ) . '>';

		self::$primary_nav_instance_no ++;

		return $search;
	}

	/**
	 * Add last menu items to fallback menu.
	 *
	 * @param string $menu the menu markup.
	 * @param array  $args the menu args.
	 *
	 * @return string;
	 */
	public function add_fallback_last_menu_items( $menu, $args ) {
		if ( strpos( $args['menu_id'], 'rm-primary-navigation' ) === false ) {
			return $menu;
		}

		$items = $this->get_last_menu_items_markup( '' );

		$menu = str_replace( '</ul>', $items . '</ul>', $menu );

		return $menu;
	}

}
