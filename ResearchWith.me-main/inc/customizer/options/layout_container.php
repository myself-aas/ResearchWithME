<?php
/**
 * Container layout section.
 *
 * Author:          Andrei Baicus <andrei@themeisle.com>
 * Created on:      20/08/2018
 *
 * @package ReMe\Customizer\Options
 */

namespace ReMe\Customizer\Options;

use ReMe\Customizer\Base_Customizer;
use ReMe\Customizer\Types\Control;
use ReMe\Customizer\Types\Section;
use ReMe\Customizer\Defaults\Layout;
use ReMe\Core\Settings\Config;

/**
 * Class Layout_Container
 *
 * @package ReMe\Customizer\Options
 */
class Layout_Container extends Base_Customizer {
	use Layout;

	/**
	 * Function that should be extended to add customizer controls.
	 *
	 * @return void
	 */
	public function add_controls() {
		$this->section_container();
		$this->control_container_width();
		$this->control_vertical_spacing();
		$this->control_container_style();
	}

	/**
	 * Add customize section
	 */
	private function section_container() {
		$this->add_section(
			new Section(
				'reme_container',
				array(
					'priority' => 25,
					'title'    => esc_html__( 'Container', 'reme' ),
					'panel'    => 'reme_layout',
				)
			)
		);
	}

	/**
	 * Add container width control
	 */
	private function control_container_width() {
		$this->add_control(
			new Control(
				'reme_container_width',
				[
					'sanitize_callback' => 'reme_sanitize_range_value',
					'transport'         => $this->selective_refresh,
					'default'           => '{ "mobile": 748, "tablet": 992, "desktop": 1170 }',
				],
				[
					'label'                 => esc_html__( 'Container width', 'reme' ),
					'section'               => 'reme_container',
					'type'                  => 'reme_responsive_range_control',
					'input_attrs'           => [
						'min'        => 200,
						'max'        => 2000,
						'units'      => [ 'px' ],
						'defaultVal' => [
							'mobile'  => 748,
							'tablet'  => 992,
							'desktop' => 1170,
							'suffix'  => [
								'mobile'  => 'px',
								'tablet'  => 'px',
								'desktop' => 'px',
							],
						],
					],
					'live_refresh_selector' => true,
					'live_refresh_css_prop' => [
						'cssVar' => [
							'selector'   => 'body',
							'vars'       => '--container',
							'responsive' => true,
							'suffix'     => 'px',
						],
					],
					'priority'              => 25,
				],
				'\ReMe\Customizer\Controls\React\Responsive_Range'
			)
		);
	}

	/**
	 * Add vertical spacing control
	 */
	private function control_vertical_spacing() {
		$this->add_control(
			new Control(
				Config::MODS_CONTENT_VSPACING,
				[
					'default'   => $this->content_vspacing_default(),
					'transport' => $this->selective_refresh,
				],
				[
					'label'                 => __( 'Content Vertical Spacing', 'reme' ),
					'sanitize_callback'     => [ $this, 'sanitize_spacing_array' ],
					'section'               => 'reme_container',
					'input_attrs'           => [
						'units' => [ 'px', 'vh' ],
						'axis'  => 'vertical',
					],
					'default'               => $this->content_vspacing_default(),
					'priority'              => 26,
					'live_refresh_selector' => true,
					'live_refresh_css_prop' => [
						'cssVar'      => [
							'vars'       => '--c-vspace',
							'selector'   => 'body.single, body.page',
							'responsive' => true,
							'fallback'   => '',
						],
						'directional' => true,
					],
				],
				'\ReMe\Customizer\Controls\React\Spacing'
			)
		);
	}

	/**
	 * Add container style controls
	 */
	private function control_container_style() {
		$container_style_controls = array(
			'reme_default_container_style'      => array(
				'priority' => 30,
				'label'    => __( 'Default Container Style', 'reme' ),
			),
			'reme_blog_archive_container_style' => array(
				'priority' => 35,
				'label'    => __( 'Blog / Archive Container Style', 'reme' ),
			),
			'reme_single_post_container_style'  => array(
				'priority' => 40,
				'label'    => __( 'Single Post Container Style', 'reme' ),
			),
		);

		/**
		 * Filters the container style controls.
		 *
		 * @param array $container_style_controls Container style controls.
		 *
		 * @since 3.1.0
		 */
		$container_style_controls = apply_filters( 'reme_container_style_filter', $container_style_controls );

		foreach ( $container_style_controls as $control_id => $control ) {
			$this->add_control(
				new Control(
					$control_id,
					array(
						'sanitize_callback' => 'reme_sanitize_container_layout',
						'transport'         => $this->selective_refresh,
						'default'           => 'contained',
					),
					array(
						'label'    => $control['label'],
						'section'  => 'reme_container',
						'type'     => 'select',
						'priority' => $control['priority'],
						'choices'  => array(
							'contained'  => __( 'Contained', 'reme' ),
							'full-width' => __( 'Full Width', 'reme' ),
						),
					)
				)
			);
		}
	}
}
