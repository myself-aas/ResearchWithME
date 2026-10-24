<?php
/**
 * Metabox range control.
 *
 * @package ReMe\Admin\Metabox\Controls
 */

namespace ReMe\Admin\Metabox\Controls;

/**
 * Class Range
 *
 * @package ReMe\Admin\Metabox\Controls
 */
class Range extends Control_Base {
	/**
	 * Control type.
	 *
	 * @var string
	 */
	public $type = 'range';

	/**
	 * Render control.
	 *
	 * @return void
	 */
	public function render_content( $post_id ) {
		$value      = $this->get_value( $post_id );
		$class      = 'reme-range-input ';
		$dependency = '';
		if ( $this->settings['hidden'] === true ) {
			$class .= ' reme-hidden';
		}
		if ( isset( $this->settings['depends_on'] ) ) {
			$dependency .= ' data-depends=' . esc_attr( $this->settings['depends_on'] );
			$class      .= ' reme-dependent';
		}

		$markup = '
<style>
.reme-range-input{display: flex; align-items: center;}
.reme-range-input .rm-range{flex-grow: 1; margin-right: 5px;}
.reme-range-input .rm-number{min-width: 0; margin-left: auto;}
.reme-range-input.reme-hidden{display: none;}
</style>';

		$markup .= '<p class="' . esc_attr( $class ) . '" ' . esc_attr( $dependency ) . ' >';
		$markup .= '<input type="range"
		value="' . esc_attr( $value ) . '"
		id="' . esc_attr( $this->id ) . '-range"
		class="rm-range"
		name="' . esc_attr( $this->id ) . '"
		min="' . esc_attr( $this->settings['min'] ) . '"
		max="' . esc_attr( $this->settings['max'] ) . '" >';
		$markup .= '<input type="number"
		value="' . esc_attr( $value ) . '"
		id="' . esc_attr( $this->id ) . '"
		class="rm-number"
		name="' . esc_attr( $this->id ) . '"
		min="' . esc_attr( $this->settings['min'] ) . '"
		max="' . esc_attr( $this->settings['max'] ) . '" >';
		$markup .= '</p>';

		echo $markup; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}


}
