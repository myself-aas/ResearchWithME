<?php
/**
 * Handles main customzier setup like root panels.
 *
 * Author:          Andrei Baicus <andrei@themeisle.com>
 * Created on:      20/08/2018
 *
 * @package ReMe\Customizer\Options
 */

namespace ReMe\Customizer\Options;

use ReMe\Core\Settings\Mods;
use ReMe\Customizer\Controls\React\Instructions_Section;
use ReMe\Customizer\Base_Customizer;
use ReMe\Customizer\Controls\Separator_Section;
use ReMe\Customizer\Types\Control;
use ReMe\Customizer\Types\Panel;
use ReMe\Customizer\Types\Section;

/**
 * Main customizer handler.
 */
class Main extends Base_Customizer {
	/**
	 * Add controls.
	 */
	public function add_controls() {
		$this->register_types();
		$this->add_main_panels();
	}

	/**
	 * Register customizer controls type.
	 */
	private function register_types() {
		$this->register_type( 'ReMe\Customizer\Controls\Radio_Image', 'control' );
		$this->register_type( 'ReMe\Customizer\Controls\Range', 'control' );
		$this->register_type( 'ReMe\Customizer\Controls\Responsive_Number', 'control' );
		$this->register_type( 'ReMe\Customizer\Controls\Tabs', 'control' );
		$this->register_type( 'ReMe\Customizer\Controls\Heading', 'control' );
		$this->register_type( 'ReMe\Customizer\Controls\Checkbox', 'control' );
	}

	/**
	 * Add main panels.
	 */
	private function add_main_panels() {
		$panels = array(
			'reme_layout'     => array(
				'priority' => 25,
				'title'    => __( 'Global', 'reme' ),
			),
			'reme_blog'       => array(
				'priority' => 25,
				'title'    => __( 'Blog', 'reme' ),
			),
			'reme_typography' => array(
				'priority' => 35,
				'title'    => __( 'Typography', 'reme' ),
			),
		);

		foreach ( $panels as $panel_id => $panel ) {
			$this->add_panel(
				new Panel(
					$panel_id,
					array(
						'priority' => $panel['priority'],
						'title'    => $panel['title'],
					)
				)
			);
		}
		$this->wpc->add_section(
			new Instructions_Section(
				$this->wpc,
				'reme_typography_quick_links',
				array(
					'priority' => -100,
					'panel'    => 'reme_typography',
					'type'     => 'hfg_instructions',
					'options'  => array(
						'quickLinks' => array(
							'reme_body_font_family'     => array(
								'label' => esc_html__( 'Change main font', 'reme' ),
								'icon'  => 'dashicons-editor-spellcheck',
							),
							'reme_headings_font_family' => array(
								'label' => esc_html__( 'Change headings font', 'reme' ),
								'icon'  => 'dashicons-heading',
							),
							'reme_h1_accordion_wrap'    => array(
								'label' => esc_html__( 'Change H1 font size', 'reme' ),
								'icon'  => 'dashicons-info-outline',
							),
							'reme_archive_typography_post_title' => array(
								'label' => esc_html__( 'Change archive font size', 'reme' ),
								'icon'  => 'dashicons-sticky',
							),
						),
					),
				)
			)
		);

		$this->wpc->add_section(
			new Separator_Section(
				$this->wpc,
				'reme_separator_main_panel',
				[
					'priority' => 10010,
				]
			)
		);
	}

	/**
	 * After all controls are registered, move core root panels and sections to the end of the list.
	 */
	public function after_controls_registered() {

		$sections = [
			'static_front_page' => 10600,
			'custom_css'        => 10610,
		];

		$panels = [
			'nav_menus' => 10500,
			'widgets'   => 10510,
		];

		foreach ( $sections as $section_id => $section_priority ) {
			$this->change_customizer_object( 'section', $section_id, 'priority', $section_priority );
		}

		foreach ( $panels as $panel_id => $panel_priority ) {
			$this->change_customizer_object( 'panel', $panel_id, 'priority', $panel_priority );
		}
	}
}
