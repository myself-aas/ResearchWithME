<?php
/**
 * Publication Taxonomies.
 *
 * @package RWM_Publications
 */

namespace RWM_Publications;

defined( 'ABSPATH' ) || exit;

/**
 * Class Publication_Taxonomy
 *
 * Registers publication_category and publication_tag taxonomies.
 */
class Publication_Taxonomy {

	/**
	 * Singleton instance.
	 *
	 * @var Publication_Taxonomy|null
	 */
	private static $instance = null;

	/**
	 * Get the singleton instance.
	 *
	 * @return Publication_Taxonomy
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor.
	 */
	private function __construct() {
		add_action( 'init', array( $this, 'register_taxonomies' ), 0 );
	}

	/**
	 * Register publication taxonomies.
	 *
	 * @return void
	 */
	public function register_taxonomies() {
		$this->register_category_taxonomy();
		$this->register_tag_taxonomy();
	}

	/**
	 * Register publication_category taxonomy.
	 *
	 * @return void
	 */
	private function register_category_taxonomy() {
		$labels = array(
			'name'                       => __( 'Publication Categories', 'rwm-publications' ),
			'singular_name'              => __( 'Publication Category', 'rwm-publications' ),
			'search_items'               => __( 'Search Categories', 'rwm-publications' ),
			'popular_items'              => __( 'Popular Categories', 'rwm-publications' ),
			'all_items'                  => __( 'All Categories', 'rwm-publications' ),
			'parent_item'                => __( 'Parent Category', 'rwm-publications' ),
			'parent_item_colon'          => __( 'Parent Category:', 'rwm-publications' ),
			'edit_item'                  => __( 'Edit Category', 'rwm-publications' ),
			'view_item'                  => __( 'View Category', 'rwm-publications' ),
			'update_item'                => __( 'Update Category', 'rwm-publications' ),
			'add_new_item'               => __( 'Add New Category', 'rwm-publications' ),
			'new_item_name'              => __( 'New Category Name', 'rwm-publications' ),
			'separate_items_with_commas' => __( 'Separate categories with commas', 'rwm-publications' ),
			'add_or_remove_items'        => __( 'Add or remove categories', 'rwm-publications' ),
			'choose_from_most_used'      => __( 'Choose from most used categories', 'rwm-publications' ),
			'not_found'                  => __( 'No categories found.', 'rwm-publications' ),
			'no_terms'                   => __( 'No categories', 'rwm-publications' ),
			'items_list_navigation'      => __( 'Categories list navigation', 'rwm-publications' ),
			'items_list'                 => __( 'Categories list', 'rwm-publications' ),
			'most_used'                  => __( 'Most used', 'rwm-publications' ),
			'back_to_items'              => __( 'Back to categories', 'rwm-publications' ),
		);

		$args = array(
			'labels'            => $labels,
			'public'            => true,
			'hierarchical'      => true,
			'show_ui'           => true,
			'show_in_menu'      => true,
			'show_in_nav_menus' => true,
			'show_tagcloud'     => true,
			'show_in_quick_edit' => true,
			'show_admin_column' => true,
			'rewrite'           => array(
				'slug'       => 'publication-category',
				'with_front' => false,
				'hierarchical' => true,
			),
			'show_in_rest'        => true,
			'rest_base'           => 'publication-categories',
			'rest_controller_class' => 'WP_REST_Terms_Controller',
		);

		register_taxonomy( 'publication_category', array( 'publication' ), $args );
	}

	/**
	 * Register publication_tag taxonomy.
	 *
	 * @return void
	 */
	private function register_tag_taxonomy() {
		$labels = array(
			'name'                       => __( 'Publication Tags', 'rwm-publications' ),
			'singular_name'              => __( 'Publication Tag', 'rwm-publications' ),
			'search_items'               => __( 'Search Tags', 'rwm-publications' ),
			'popular_items'              => __( 'Popular Tags', 'rwm-publications' ),
			'all_items'                  => __( 'All Tags', 'rwm-publications' ),
			'parent_item'                => null,
			'parent_item_colon'          => null,
			'edit_item'                  => __( 'Edit Tag', 'rwm-publications' ),
			'view_item'                  => __( 'View Tag', 'rwm-publications' ),
			'update_item'                => __( 'Update Tag', 'rwm-publications' ),
			'add_new_item'               => __( 'Add New Tag', 'rwm-publications' ),
			'new_item_name'              => __( 'New Tag Name', 'rwm-publications' ),
			'separate_items_with_commas' => __( 'Separate tags with commas', 'rwm-publications' ),
			'add_or_remove_items'        => __( 'Add or remove tags', 'rwm-publications' ),
			'choose_from_most_used'      => __( 'Choose from most used tags', 'rwm-publications' ),
			'not_found'                  => __( 'No tags found.', 'rwm-publications' ),
			'no_terms'                   => __( 'No tags', 'rwm-publications' ),
			'items_list_navigation'      => __( 'Tags list navigation', 'rwm-publications' ),
			'items_list'                 => __( 'Tags list', 'rwm-publications' ),
			'most_used'                  => __( 'Most used', 'rwm-publications' ),
			'back_to_items'              => __( 'Back to tags', 'rwm-publications' ),
		);

		$args = array(
			'labels'            => $labels,
			'public'            => true,
			'hierarchical'      => false,
			'show_ui'           => true,
			'show_in_menu'      => true,
			'show_in_nav_menus' => true,
			'show_tagcloud'     => true,
			'show_in_quick_edit' => true,
			'show_admin_column' => true,
			'rewrite'           => array(
				'slug'       => 'publication-tag',
				'with_front' => false,
			),
			'show_in_rest'        => true,
			'rest_base'           => 'publication-tags',
			'rest_controller_class' => 'WP_REST_Terms_Controller',
		);

		register_taxonomy( 'publication_tag', array( 'publication' ), $args );
	}
}
