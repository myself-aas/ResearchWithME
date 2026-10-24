<?php
/**
 * Customizer typography controls.
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
use ReMe\Customizer\Controls\React\Typography_Extra_Section;
use ReMe\Customizer\Types\Control;
use ReMe\Customizer\Types\Section;
use ReMe\Core\Traits\Theme_Mods;

/**
 * Class Typography
 *
 * @package ReMe\Customizer\Options
 */
class Typography extends Base_Customizer {
	use Theme_Mods;

	const HEADINGS_FONT_FAMILY_SELECTORS = 'h1:not(.site-title), .single h1.entry-title, h2, h3, h4, h5, h6';

	/**
	 * Add controls
	 */
	public function add_controls() {
		$this->sections_typography();
		$this->controls_font_pairs();
		$this->controls_typography_general();
		$this->controls_typography_headings();
		$this->controls_typography_blog();
		$this->section_extra();
	}

	/**
	 * Add controls for font pair section
	 *
	 * @return void
	 */
	private function controls_font_pairs() {
		/**
		 * Filters the font pairs that are available inside Customizer.
		 *
		 * @param array $pairs The font pairs array.
		 *
		 * @since 3.5.0
		 */
		$pairs = apply_filters( 'reme_font_pairings', Mods::get( Config::MODS_TPOGRAPHY_FONT_PAIRS, Config::$typography_default_pairs ) );

		/**
		 * Font Pairs Control
		 */
		$this->add_control(
			new Control(
				Config::MODS_TPOGRAPHY_FONT_PAIRS,
				[
					'transport'         => $this->selective_refresh,
					'sanitize_callback' => 'sanitize_text_field',
					'default'           => $pairs,
				],
				array(
					'input_attrs' => array(
						'pairs'       => $pairs,
						'description' => array(
							'text' => __( 'Choose Font family presets for your Headings and Text.', 'reme' ),
						),
					),
					'label'       => esc_html__( 'Font presets', 'reme' ),
					'section'     => 'typography_font_pair_section',
					'priority'    => 10,
					'type'        => 'reme_font_pairings_control',
				),
				'\ReMe\Customizer\Controls\React\Font_Pairings'
			)
		);
	}

	/**
	 * Add the customizer section.
	 */
	private function sections_typography() {
		$typography_sections = array(
			'typography_globals_section'   => array(
				'title'    => __( 'Global', 'reme' ),
				'priority' => 10,
			),
			'typography_font_pair_section' => array(
				'title'    => __( 'Font presets', 'reme' ),
				'priority' => 15,
			),
			'reme_typography_general'      => array(
				'title'    => __( 'General', 'reme' ),
				'priority' => 25,
			),
			'reme_typography_headings'     => array(
				'title'    => __( 'Headings', 'reme' ),
				'priority' => 35,
			),
			'reme_typography_blog'         => array(
				'title'    => __( 'Blog', 'reme' ),
				'priority' => 45,
			),
		);

		foreach ( $typography_sections as $section_id => $section_data ) {
			$this->add_section(
				new Section(
					$section_id,
					array(
						'title'    => $section_data['title'],
						'panel'    => 'reme_typography',
						'priority' => $section_data['priority'],
					)
				)
			);
		}
	}

	/**
	 * Add general typography controls
	 */
	private function controls_typography_general() {

		/**
		 * Body font family
		 */
		$this->add_control(
			new Control(
				Config::MODS_FONT_GENERAL,
				[
					'transport'         => $this->selective_refresh,
					'sanitize_callback' => 'sanitize_text_field',
					'default'           => Mods::get_alternative_mod_default( Config::MODS_FONT_GENERAL ),
				],
				array(
					'settings'              => [
						'default'  => Config::MODS_FONT_GENERAL,
						'variants' => Config::MODS_FONT_GENERAL_VARIANTS,
					],
					'label'                 => esc_html__( 'Body', 'reme' ),
					'section'               => 'reme_typography_general',
					'priority'              => 10,
					'type'                  => 'reme_font_family_control',
					'live_refresh_selector' => apply_filters( 'reme_body_font_family_selectors', 'body, .site-title' ),
					'live_refresh_css_prop' => [
						'cssVar' => [
							'vars'     => '--bodyfontfamily',
							'selector' => 'body',
							'fallback' => Mods::get_alternative_mod_default( Config::MODS_FONT_GENERAL ),
							'suffix'   => ', var(--rm-fallback-ff)',
						],
					],
				),
				'\ReMe\Customizer\Controls\React\Font_Family'
			)
		);
		/**
		 * Body font family subsets.
		 */
		$this->wpc->add_setting(
			Config::MODS_FONT_GENERAL_VARIANTS,
			[
				'transport'         => $this->selective_refresh,
				'sanitize_callback' => 'reme_sanitize_font_variants',
				'default'           => [],
			]
		);


		$defaults = Mods::get_alternative_mod_default( Config::MODS_TYPEFACE_GENERAL );
		$this->add_control(
			new Control(
				Config::MODS_TYPEFACE_GENERAL,
				[
					'transport' => $this->selective_refresh,
					'default'   => $defaults,
				],
				[
					'priority'              => 11,
					'section'               => 'reme_typography_general',
					'input_attrs'           => array(
						'size_units'             => [ 'px', 'em', 'rem' ],
						'weight_default'         => 400,
						'size_default'           => $defaults['fontSize'],
						'line_height_default'    => $defaults['lineHeight'],
						'letter_spacing_default' => $defaults['letterSpacing'],
					),
					'type'                  => 'reme_typeface_control',
					'font_family_control'   => 'reme_body_font_family',
					'live_refresh_selector' => 'body, .site-title',
					'live_refresh_css_prop' => [
						'cssVar' => [
							'vars'     => [
								'--bodytexttransform' => 'textTransform',
								'--bodyfontweight'    => 'fontWeight',
								'--bodyfontsize'      => [
									'key'        => 'fontSize',
									'responsive' => true,
								],
								'--bodylineheight'    => [
									'key'        => 'lineHeight',
									'responsive' => true,
								],
								'--bodyletterspacing' => [
									'key'        => 'letterSpacing',
									'suffix'     => 'px',
									'responsive' => true,
								],
							],
							'selector' => 'body',
						],
					],
				],
				'\ReMe\Customizer\Controls\React\Typography'
			)
		);

		/**
		 * Fallback Font Family.
		 */
		$this->add_control(
			new Control(
				'reme_fallback_font_family',
				[
					'transport'         => $this->selective_refresh,
					'sanitize_callback' => 'sanitize_text_field',
					'default'           => 'Arial, Helvetica, sans-serif',
				],
				[
					'label'                 => esc_html__( 'Fallback Font', 'reme' ),
					'section'               => 'reme_typography_general',
					'priority'              => 12,
					'type'                  => 'reme_font_family_control',
					'input_attrs'           => [
						'system' => true,
					],
					'live_refresh_selector' => true,
					'live_refresh_css_prop' => [
						'cssVar' => [
							'vars'     => '--rm-fallback-ff',
							'selector' => 'body',
						],
					],
				],
				'\ReMe\Customizer\Controls\React\Font_Family'
			)
		);

	}

	/**
	 * Add controls for typography headings.
	 */
	private function controls_typography_headings() {
		/**
		 * Headings font family
		 */
		$this->add_control(
			new Control(
				'reme_headings_font_family',
				array(
					'transport'         => $this->selective_refresh,
					'sanitize_callback' => 'sanitize_text_field',
				),
				array(
					'section'               => 'reme_typography_headings',
					'priority'              => 10,
					'type'                  => 'reme_font_family_control',
					'live_refresh_selector' => apply_filters( 'reme_headings_font_family_selectors', self::HEADINGS_FONT_FAMILY_SELECTORS ),
					'live_refresh_css_prop' => [
						'cssVar' => [
							'vars'     => '--headingsfontfamily',
							'selector' => 'body',
							'fallback' => 'var(--bodyfontfamily, var(--rm-fallback-ff))',
						],
						'type'   => 'svg-icon-size',
					],
					'input_attrs'           => [
						'default_is_inherit' => true,
					],
					'color_setting'         => Config::MODS_COLOR_HEADINGS,
				),
				'\ReMe\Customizer\Controls\React\Font_Family'
			)
		);

		$this->add_control(
			new Control(
				Config::MODS_COLOR_HEADINGS,
				array(
					'transport'         => $this->selective_refresh,
					'sanitize_callback' => 'reme_sanitize_colors',
					'default'           => '',
				),
				array(
					'section'               => 'reme_typography_headings',
					'type'                  => 'hidden',
					'live_refresh_selector' => true,
					'live_refresh_css_prop' => [
						'cssVar' => [
							'vars'     => '--headingcolor',
							'selector' => 'body',
						],
					],
				)
			)
		);

		

		$selectors = reme_get_headings_selectors();
		$priority  = 20;
		foreach ( [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ] as $heading_id ) {
			$this->add_control(
				new Control(
					'reme_' . $heading_id . '_accordion_wrap',
					array(
						'sanitize_callback' => 'sanitize_text_field',
						'transport'         => $this->selective_refresh,
					),
					array(
						'label'            => $heading_id,
						'section'          => 'reme_typography_headings',
						'priority'         => $priority += 1,
						'class'            => esc_attr( 'advanced-sidebar-accordion-' . $heading_id ),
						'accordion'        => true,
						'controls_to_wrap' => 2,
						'expanded'         => false,
					),
					'ReMe\Customizer\Controls\React\Heading'
				)
			);

			$mod_key_font_family = $this->get_mod_key_heading_fontfamily( $heading_id );

			/**
			 * Headings font family
			 */
			$this->add_control(
				new Control(
					$mod_key_font_family,
					array(
						'transport'         => $this->selective_refresh,
						'sanitize_callback' => 'sanitize_text_field',
					),
					array(
						'section'               => 'reme_typography_headings',
						'priority'              => $priority += 1,
						'type'                  => 'reme_font_family_control',
						'live_refresh_selector' => apply_filters( $mod_key_font_family . '_selectors', self::HEADINGS_FONT_FAMILY_SELECTORS ),
						'live_refresh_css_prop' => [
							'cssVar' => [
								'vars'     => '--' . $heading_id . 'fontfamily',
								'selector' => 'body',
								'fallback' => 'var(--headingsfontfamily, var(--bodyfontfamily))',
							],
							'type'   => 'svg-icon-size',
						],
						'input_attrs'           => [
							'default_is_inherit' => true,
						],
					),
					'\ReMe\Customizer\Controls\React\Font_Family'
				)
			);

			$mod_key        = 'reme_' . $heading_id . '_typeface_general';
			$default_values = Mods::get_alternative_mod_default( $mod_key );
			$this->add_control(
				new Control(
					$mod_key,
					[
						'transport' => $this->selective_refresh,
						'default'   => $default_values,
					],
					[
						'priority'              => $priority += 2,
						'section'               => 'reme_typography_headings',
						'input_attrs'           => array(
							'size_units'             => [ 'em', 'px', 'rem' ],
							'weight_default'         => $default_values['fontWeight'],
							'size_default'           => $default_values['fontSize'],
							'line_height_default'    => $default_values['lineHeight'],
							'letter_spacing_default' => $default_values['letterSpacing'],
						),
						'type'                  => 'reme_typeface_control',
						'font_family_control'   => $mod_key_font_family,
						'live_refresh_selector' => $selectors[ $heading_id ],
						'live_refresh_css_prop' => [
							'cssVar' => [
								'vars'     => [
									'--' . $heading_id . 'texttransform' => 'textTransform',
									'--' . $heading_id . 'fontweight'    => 'fontWeight',
									'--' . $heading_id . 'fontsize'      => [
										'key'        => 'fontSize',
										'responsive' => true,
									],
									'--' . $heading_id . 'lineheight'    => [
										'key'        => 'lineHeight',
										'responsive' => true,
									],
									'--' . $heading_id . 'letterspacing' => [
										'key'        => 'letterSpacing',
										'suffix'     => 'px',
										'responsive' => true,
									],
								],
								'selector' => 'body',
							],
						],
					],
					'\ReMe\Customizer\Controls\React\Typography'
				)
			);
		}
	}

	/**
	 * Add controls for blog typography.
	 */
	private function controls_typography_blog() {
		$controls = array(
			'reme_archive_typography_post_title'         => array(
				'label'                 => __( 'Post title', 'reme' ),
				'category_label'        => __( 'Typography', 'reme' ),
				'priority'              => 500,
				'font_family_control'   => 'reme_headings_font_family',
				'live_refresh_selector' => '.blog .blog-entry-title, .archive .blog-entry-title',
				'section'               => 'reme_blog_archive_layout',
			),
			'reme_archive_typography_post_excerpt'       => array(
				'label'                 => __( 'Post excerpt', 'reme' ),
				'priority'              => 510,
				'font_family_control'   => 'reme_body_font_family',
				'live_refresh_selector' => '.blog .entry-summary, .archive .entry-summary, .blog .post-pages-links',
				'section'               => 'reme_blog_archive_layout',
			),
			'reme_archive_typography_post_meta'          => array(
				'label'                 => __( 'Post meta', 'reme' ),
				'priority'              => 520,
				'font_family_control'   => 'reme_body_font_family',
				'live_refresh_selector' => '.blog .rm-meta-list li, .archive .rm-meta-list li',
				'section'               => 'reme_blog_archive_layout',
			),
			'reme_single_post_typography_post_title'     => array(
				'label'                 => __( 'Post title', 'reme' ),
				'category_label'        => __( 'Typography', 'reme' ),
				'priority'              => 500,
				'font_family_control'   => 'reme_headings_font_family',
				'live_refresh_selector' => '.single h1.entry-title',
				'section'               => 'reme_single_post_layout',
			),
			'reme_single_post_typography_post_meta'      => array(
				'label'                 => __( 'Post meta', 'reme' ),
				'priority'              => 510,
				'font_family_control'   => 'reme_body_font_family',
				'live_refresh_selector' => '.single .rm-meta-list li',
				'section'               => 'reme_single_post_layout',
			),
			'reme_single_post_typography_comments_title' => array(
				'label'                 => __( 'Comments reply title', 'reme' ),
				'priority'              => 520,
				'font_family_control'   => 'reme_headings_font_family',
				'live_refresh_selector' => '.single .comment-reply-title',
				'section'               => 'reme_single_post_layout',
			),
		);

		foreach ( $controls as $control_id => $control_settings ) {
			$settings = array(
				'label'            => $control_settings['label'],
				'section'          => $control_settings['section'],
				'priority'         => $control_settings['priority'],
				'class'            => esc_attr( 'typography-blog-' . $control_id ),
				'accordion'        => true,
				'controls_to_wrap' => 1,
				'expanded'         => false,
			);
			if ( array_key_exists( 'category_label', $control_settings ) ) {
				$settings['category_label'] = $control_settings['category_label'];
			}

			$this->add_control(
				new Control(
					$control_id . '_accordion_wrap',
					array(
						'sanitize_callback' => 'sanitize_text_field',
						'transport'         => $this->selective_refresh,
					),
					$settings,
					'ReMe\Customizer\Controls\Heading'
				)
			);

			$this->add_control(
				new Control(
					$control_id,
					[
						'transport' => $this->selective_refresh,
					],
					[
						'priority'              => $control_settings['priority'] += 1,
						'section'               => $control_settings['section'],
						'type'                  => 'reme_typeface_control',
						'font_family_control'   => $control_settings['font_family_control'],
						'live_refresh_selector' => true,
						'live_refresh_css_prop' => [
							'cssVar' => [
								'vars'     => [
									'--texttransform' => 'textTransform',
									'--fontweight'    => 'fontWeight',
									'--fontsize'      => [
										'key'        => 'fontSize',
										'responsive' => true,
									],
									'--lineheight'    => [
										'key'        => 'lineHeight',
										'responsive' => true,
									],
									'--letterspacing' => [
										'key'        => 'letterSpacing',
										'suffix'     => 'px',
										'responsive' => true,
									],
								],
								'selector' => $control_settings['live_refresh_selector'],
							],
						],
						'refresh_on_reset'      => true,
						'input_attrs'           => array(
							'default_is_empty'       => true,
							'size_units'             => [ 'em', 'px', 'rem' ],
							'weight_default'         => 'none',
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
					],
					'\ReMe\Customizer\Controls\React\Typography'
				)
			);
		}
	}

	/**
	 * Add section for extra inline controls
	 *
	 * @return void
	 */
	private function section_extra() {
		$this->wpc->add_section(
			new Typography_Extra_Section(
				$this->wpc,
				'typography_extra_section',
				[
					'priority' => 9999, // upsell priority(10000) - 1
					'panel'    => 'reme_typography',
				]
			)
		);
	}
}

