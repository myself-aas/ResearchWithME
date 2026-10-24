<?php
/**
 * Buttons section.
 *
 * Author:          Andrei Baicus <andrei@themeisle.com>
 * Created on:      20/08/2018
 *
 * @package ReMe\Customizer\Options
 */

namespace ReMe\Customizer\Options;

use ReMe\Core\Settings\Config;
use ReMe\Core\Settings\Mods;
use ReMe\Customizer\Base_Customizer;
use ReMe\Customizer\Types\Control;
use ReMe\Customizer\Types\Section;

/**
 * Class Buttons
 *
 * @package ReMe\Customizer\Options
 */
class Buttons extends Base_Customizer {

	/**
	 * Customizer section slug.
	 *
	 * @var string
	 */
	private $section_id = 'reme_buttons_section';

	/**
	 * Function that should be extended to add customizer controls.
	 *
	 * @return void
	 */
	public function add_controls() {
		$this->add_section(
			new Section(
				$this->section_id,
				array(
					'priority' => 40,
					'title'    => esc_html__( 'Buttons', 'reme' ),
					'panel'    => 'reme_layout',
				)
			)
		);

		$this->add_control(
			new Control(
				'reme_buttons_generic_heading',
				[
					'sanitize_callback' => 'sanitize_text_field',
				],
				[
					'label'            => esc_html__( 'General', 'reme' ),
					'section'          => $this->section_id,
					'class'            => 'buttons-general-accordion',
					'accordion'        => true,
					'expanded'         => true,
					'controls_to_wrap' => 2,
				],
				'ReMe\Customizer\Controls\Heading'
			)
		);

		$mod_key  = Config::MODS_BUTTON_PRIMARY_PADDING;
		$defaults = Mods::get_alternative_mod_default( Config::MODS_BUTTON_PRIMARY_PADDING );
		$this->add_control(
			new Control(
				$mod_key,
				array(
					'default' => $defaults,
				),
				array(
					'label'             => __( 'Padding', 'reme' ),
					'sanitize_callback' => array( $this, 'sanitize_spacing_array' ),
					'section'           => $this->section_id,
					'input_attrs'       => [
						'units' => [ 'px', 'em', 'rem' ],
						'min'   => 0,
					],
					'default'           => $defaults,
				),
				'\ReMe\Customizer\Controls\React\Spacing'
			)
		);

		$this->add_control(
			new Control(
				Config::MODS_BUTTON_TYPEFACE,
				[
					'transport' => $this->selective_refresh,
				],
				[
					'label'                 => esc_html__( 'Button Text', 'reme' ),
					'section'               => $this->section_id,
					'input_attrs'           => array(
						'size_units'             => [ 'px', 'em', 'rem' ],
						'weight_default'         => 700,
						'size_default'           => array(
							'suffix'  => array(
								'mobile'  => 'px',
								'tablet'  => 'px',
								'desktop' => 'px',
							),
							'mobile'  => '',
							'tablet'  => '',
							'desktop' => '',
						),
						'line_height_default'    => array(
							'mobile'  => '',
							'tablet'  => '',
							'desktop' => '',
						),
						'letter_spacing_default' => array(
							'mobile'  => '',
							'tablet'  => '',
							'desktop' => '',
						),
					),
					'type'                  => 'reme_typeface_control',
					'font_family_control'   => 'reme_body_font_family',
					'live_refresh_selector' => true,
					'live_refresh_css_prop' => [
						'cssVar' => [
							'vars'     => [
								'--btnfs'            => [
									'key'        => 'fontSize',
									'responsive' => true,
									'suffix'     => 'px',
								],
								'--btnlineheight'    => [
									'key'        => 'lineHeight',
									'responsive' => true,
								],
								'--btnletterspacing' => [
									'key'        => 'letterSpacing',
									'responsive' => true,
									'suffix'     => 'px',
								],
								'--btntexttransform' => [
									'key' => 'textTransform',
								],
								'--btnfontweight'    => [
									'key' => 'fontWeight',
								],
							],
							'selector' => 'body',
						],
					],
					'refresh_on_reset'      => true,
				],
				'\ReMe\Customizer\Controls\React\Typography'
			)
		);

		$buttons = [
			'button'           => __( 'Primary Button', 'reme' ),
			'secondary_button' => __( 'Secondary Button', 'reme' ),
		];

		foreach ( $buttons as $button => $heading_text ) {
			$this->add_control(
				new Control(
					'reme_' . $button . '_appearance_heading',
					[
						'sanitize_callback' => 'sanitize_text_field',
					],
					[
						'label'            => esc_html( $heading_text ),
						'section'          => $this->section_id,
						'class'            => 'buttons-' . $button . '-appearance-accordion',
						'accordion'        => true,
						'controls_to_wrap' => 1,
						'expanded'         => false,
					],
					'ReMe\Customizer\Controls\Heading'
				)
			);

			$mod_key  = 'reme_' . $button . '_appearance';
			$defaults = reme_get_button_appearance_default( $button );

			$this->add_control(
				new Control(
					$mod_key,
					[
						'sanitize_callback' => 'reme_sanitize_button_appearance',
						'default'           => $defaults,
					],
					[
						'default_vals' => $defaults,
						'label'        => __( 'Button Appearance', 'reme' ),
						'section'      => $this->section_id,
					],
					'\ReMe\Customizer\Controls\React\Button_Appearance'
				)
			);
		}
	}
}
