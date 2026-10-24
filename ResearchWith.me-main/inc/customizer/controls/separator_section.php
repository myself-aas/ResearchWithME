<?php
/**
 * Separator section.
 *
 * @package ReMe\Customizer\Controls
 */
namespace ReMe\Customizer\Controls;

/**
 * Customizer section.
 */
class Separator_Section extends \WP_Customize_Section {
	/**
	 * Type of this section.
	 *
	 * @var string
	 */
	public $type = 'reme_separator';

	/**
	 * Render the separator.
	 * 
	 * @return void
	 */
	public function render() {
		$output  = '<li id="accordion-section-' . $this->id . '" class="reme-separator-section">';
		$output .= '<hr/>';
		$output .= '</li>';

		echo wp_kses_post( $output );
	}
}
