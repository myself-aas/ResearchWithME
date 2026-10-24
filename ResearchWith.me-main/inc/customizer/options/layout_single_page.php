<?php
/**
 * Single page layout section.
 *
 * @package ReMe\Customizer\Options
 */

namespace ReMe\Customizer\Options;

use ReMe\Customizer\Types\Control;

/**
 * Class Layout_Single_Page
 */
class Layout_Single_Page extends Base_Layout_Single {

	/**
	 * Returns the post type.
	 *
	 * @return string
	 */
	public function get_post_type() {
		return 'page';
	}

	/**
	 * @return string
	 */
	public function get_cover_selector() {
		return '.page .rm-post-cover';
	}

	/**
	 * Function that should be extended to add customizer controls.
	 *
	 * @return void
	 */
	public function add_controls() {
		parent::add_controls();
		$this->add_control(
			new Control(
				'reme_page_hide_title',
				[
					'sanitize_callback' => 'reme_sanitize_checkbox',
					'default'           => false,
				],
				[
					'label'    => esc_html__( 'Disable Title', 'reme' ),
					'section'  => $this->section,
					'type'     => 'reme_toggle_control',
					'priority' => 25,
				],
				'ReMe\Customizer\Controls\Checkbox'
			)
		);
	}

	/**
	 * Fuction used for active_callback control property.
	 *
	 * @return bool
	 */
	public static function is_cover_layout() {
		return get_theme_mod( 'reme_page_header_layout' ) === 'cover';
	}
}
