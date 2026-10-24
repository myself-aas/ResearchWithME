<?php
/**
 * Default settings traits, shared with other classes.
 *
 * @package ReMe\Customizer\Defaults
 */

namespace ReMe\Customizer\Defaults;

/**
 * Trait Utils
 *
 * @package ReMe\Customizer\Defaults
 */
trait Utils {
	/**
	 * Get the sidebar layout choices.
	 *
	 * @param string $control_id Name of the control.
	 *
	 * @return array
	 */
	final public function sidebar_layout_choices( $control_id ) {
		$options = apply_filters(
			'reme_sidebar_layout_choices',
			array(
				'full-width' => array(
					'name' => __( 'Full Width', 'reme' ),
					'url'  => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAABqAQMAAABknzrDAAAABlBMVEX////V1dXUdjOkAAAAPUlEQVRIx2NgGAUkAcb////Y/+d/+P8AdcQoc8vhH/X/5P+j2kG+GA3CCgrwi43aMWrHqB2jdowEO4YpAACyKSE0IzIuBgAAAABJRU5ErkJggg==',
				),
				'left'       => array(
					'name' => __( 'Left', 'reme' ),
					'url'  => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAABqAgMAAAAjP0ATAAAACVBMVEX///8+yP/V1dXG9YqxAAAAWElEQVR42mNgGAXDE4RCQMDAKONaBQINWqtWrWBatQDIaxg8ygYqQIAOYwC6bwHUmYNH2eBPSMhgBQXKRr0w6oVRL4x6YdQLo14Y9cKoF0a9QCO3jYLhBADvmFlNY69qsQAAAABJRU5ErkJggg==',
				),
				'right'      => array(
					'name' => __( 'Right', 'reme' ),
					'url'  => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAABqAgMAAAAjP0ATAAAACVBMVEX///8+yP/V1dXG9YqxAAAAWUlEQVR42mNgGAUjB4iGgkEIzZStAoEVTECiQWsVkLdiECkboAABOmwBF9BtUGcOImUDEiCkJCQU0ECBslEvjHph1AujXhj1wqgXRr0w6oVRLwyEF0bBUAUAz/FTNXm+R/MAAAAASUVORK5CYII=',
				),
			),
			$control_id
		);

		foreach ( $options as $slug => $args ) {
			if ( ! isset( $args['name'] ) ) {
				$options[ $slug ]['name'] = ucwords( str_replace( '-', ' ', $slug ) );
			}
		}

		return $options;
	}

	/**
	 * Sanitize the sidebar layout value
	 *
	 * @param string $value value from the control.
	 *
	 * @return string
	 */
	public function sanitize_sidebar_layout( $value ) {
		$allowed_values = array( 'left', 'right', 'full-width', 'off-canvas' );
		if ( ! in_array( $value, $allowed_values, true ) ) {
			return 'right';
		}

		return esc_html( $value );
	}
}
