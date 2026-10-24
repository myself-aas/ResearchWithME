<?php
/**
 * Publication Post Type.
 *
 * @package RWM_Publications
 */

namespace RWM_Publications;

defined( 'ABSPATH' ) || exit;

/**
 * Class Publication_Post_Type
 *
 * Registers the 'publication' custom post type for scholarly articles.
 */
class Publication_Post_Type {

	/**
	 * Singleton instance.
	 *
	 * @var Publication_Post_Type|null
	 */
	private static $instance = null;

	/**
	 * Get the singleton instance.
	 *
	 * @return Publication_Post_Type
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
		add_action( 'init', array( $this, 'register' ), 0 );
	}

	/**
	 * Register the publication post type.
	 *
	 * @return void
	 */
	public function register() {
		$labels = array(
			'name'                  => __( 'Publications', 'rwm-publications' ),
			'singular_name'         => __( 'Publication', 'rwm-publications' ),
			'add_new'               => __( 'Add New', 'rwm-publications' ),
			'add_new_item'          => __( 'Add New Publication', 'rwm-publications' ),
			'edit_item'             => __( 'Edit Publication', 'rwm-publications' ),
			'new_item'              => __( 'New Publication', 'rwm-publications' ),
			'view_item'             => __( 'View Publication', 'rwm-publications' ),
			'view_items'            => __( 'View Publications', 'rwm-publications' ),
			'search_items'          => __( 'Search Publications', 'rwm-publications' ),
			'not_found'             => __( 'No publications found.', 'rwm-publications' ),
			'not_found_in_trash'    => __( 'No publications found in trash.', 'rwm-publications' ),
			'parent_item_colon'     => __( 'Parent Publication:', 'rwm-publications' ),
			'all_items'             => __( 'All Publications', 'rwm-publications' ),
			'archives'              => __( 'Publication Archives', 'rwm-publications' ),
			'attributes'            => __( 'Publication Attributes', 'rwm-publications' ),
			'insert_into_item'      => __( 'Insert into publication', 'rwm-publications' ),
			'uploaded_to_this_item' => __( 'Uploaded to this publication', 'rwm-publications' ),
			'featured_image'        => __( 'Featured Image', 'rwm-publications' ),
			'set_featured_image'    => __( 'Set featured image', 'rwm-publications' ),
			'remove_featured_image' => __( 'Remove featured image', 'rwm-publications' ),
			'use_featured_image'    => __( 'Use as featured image', 'rwm-publications' ),
			'filter_items_list'     => __( 'Filter publications list', 'rwm-publications' ),
			'items_list_navigation' => __( 'Publications list navigation', 'rwm-publications' ),
			'items_list'            => __( 'Publications list', 'rwm-publications' ),
		);

		$args = array(
			'labels'             => $labels,
			'public'             => true,
			'publicly_queryable' => true,
			'show_ui'            => true,
			'show_in_menu'       => true,
			'show_in_nav_menus'  => true,
			'show_in_admin_bar'  => true,
			'menu_position'      => 25,
			'menu_icon'          => 'dashicons-posts',
			'can_export'         => true,
			'has_archive'        => 'publications',
			'hierarchical'       => false,
			'exclude_from_search' => false,
			'capability_type'    => 'post',
			'map_meta_cap'       => true,
			'supports'           => array(
				'title',
				'editor',
				'excerpt',
				'author',
				'thumbnail',
				'revisions',
				'custom-fields',
				'post-formats',
			),
			'taxonomies'         => array( 'publication_category', 'publication_tag' ),
			'rewrite'            => array(
				'slug'       => 'publications',
				'with_front' => false,
				'feeds'      => true,
				'pages'      => true,
			),
			'show_in_rest'       => true,
			'rest_base'          => 'publications',
			'rest_controller_class' => 'WP_REST_Posts_Controller',
		);

		register_post_type( 'publication', $args );
	}
}
