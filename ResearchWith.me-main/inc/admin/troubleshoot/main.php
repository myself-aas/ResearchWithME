<?php
/**
 * WordPress troubleshooting module.
 *
 * @package ReMe
 */

namespace ReMe\Admin\Troubleshoot;

/**
 * Class Main
 *
 * @package ReMe\Admin\Troubleshoot
 */
final class Main {
	/**
	 * Init function
	 *
	 * @return void
	 */
	public function init() {
		add_filter( 'debug_information', [ $this, 'reme_add_debug_info' ] );
	}

	/**
	 * Register ReMe Accordion on Debug Info page.
	 *
	 * @param array $debug_info Debug List.
	 *
	 * @return array
	 */
	public function reme_add_debug_info( $debug_info ) {
		$custom_customizer_css = wp_get_custom_css();

		$debug_info['reme'] = array(
			'label'  => __( 'ReMe', 'reme' ),
			'fields' => array(
				'child'          => array(
					'label'   => __( 'Child theme files', 'reme' ),
					'value'   => is_child_theme() ? $this->list_files() : __( 'No', 'reme' ),
					'private' => false,
				),
				'customizer_css' => array(
					'label'   => __( 'Customizer Custom CSS', 'reme' ),
					'value'   => empty( $custom_customizer_css ) ? __( 'No', 'reme' ) : $custom_customizer_css,
					'private' => false,
				),
			),
		);

		return $debug_info;
	}

	/**
	 * List active theme files
	 *
	 * @return string
	 */
	public function list_files() {
		return implode( ",\n\r", list_files( get_stylesheet_directory(), 2 ) );
	}

}
