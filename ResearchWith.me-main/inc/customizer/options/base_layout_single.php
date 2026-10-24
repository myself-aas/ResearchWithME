<?php
/**
 * Common functionalities for pages and posts.
 *
 * @package ReMe\Customizer\Options
 */

namespace ReMe\Customizer\Options;

use ReMe\Customizer\Base_Customizer;
use ReMe\Customizer\Defaults\Layout;
use ReMe\Customizer\Defaults\Single_Post;
use ReMe\Customizer\Types\Control;
use ReMe\Customizer\Types\Section;
use ReMe\Core\Settings\Config;

/**
 * Class Base_Layout_Single
 *
 * @package ReMe\Customizer\Options
 */
abstract class Base_Layout_Single extends Base_Customizer {
	use Single_Post;
	use Layout;
	/**
	 * Post type slug
	 *
	 * @var string
	 */
	private $post_type;

	/**
	 * Controls section
	 *
	 * @var string
	 */
	public $section;

	/**
	 * Cover selector
	 *
	 * @var string
	 */
	private $cover_selector;

	/**
	 * Is post type post.
	 *
	 * @var bool
	 */
	protected $is_post = false;

	/**
	 * Get the value for the $post_type.
	 *
	 * @return mixed
	 */
	abstract public function get_post_type();

	/**
	 * Get the value for the $post_type.
	 *
	 * @return mixed
	 */
	abstract public function get_cover_selector();

	/**
	 * Base_Layout_Single constructor.
	 */
	public function __construct() {
		$this->post_type      = $this->get_post_type();
		$this->cover_selector = $this->get_cover_selector();
		$this->section        = 'reme_single_' . $this->post_type . '_layout';

		$this->is_post = $this->post_type === 'post';
	}

	/**
	 * Get the label for sections.
	 */
	private function get_section_label() {
		$labels = [
			'post' => esc_html__( 'Single Post', 'reme' ),
			'page' => esc_html__( 'Page', 'reme' ),
		];

		if ( array_key_exists( $this->post_type, $labels ) ) {
			return $labels[ $this->post_type ];
		}

		return '';
	}

	/**
	 * Function that should be extended to add customizer controls.
	 *
	 * @return void
	 */
	public function add_controls() {
		$this->create_section();
		$this->add_header_layout_subsection();
		$this->add_header_layout_controls();
		$this->content_vspacing();
	}

	/**
	 * Create the section
	 */
	private function create_section() {
		$this->add_section(
			new Section(
				'reme_single_' . $this->post_type . '_layout',
				[
					'priority' => 40,
					'title'    => $this->get_section_label(),
					'panel'    => $this->post_type === 'post' ? 'reme_blog' : 'reme_layout',
				]
			)
		);
	}

	/**
	 * Add header layout accordion.
	 */
	private function add_header_layout_subsection() {
		if ( $this->is_post ) {
			return;
		}

		$this->add_control(
			new Control(
				'reme_' . $this->post_type . '_header_layout_heading',
				[
					'sanitize_callback' => 'sanitize_text_field',
				],
				[
					'label'            => esc_html__( 'Header Layout', 'reme' ),
					'section'          => $this->section,
					'priority'         => 5,
					'class'            => 'header_layout-accordion',
					'expanded'         => true,
					'accordion'        => true,
					'controls_to_wrap' => 15,
				],
				'ReMe\Customizer\Controls\Heading'
			)
		);
	}

	/**
	 * Add controls for header layout.
	 */
	private function add_header_layout_controls() {

		$this->add_control(
			new Control(
				'reme_' . $this->post_type . '_header_layout',
				[
					'sanitize_callback' => 'wp_filter_nohtml_kses',
					'default'           => 'normal',
				],
				[
					'label'    => $this->is_post ? esc_html__( 'Header Layout', 'reme' ) : '',
					'section'  => $this->section,
					'priority' => 10,
					'choices'  => [
						'normal' => [
							'name'  => esc_html__( 'Normal', 'reme' ),
							'image' => 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODUiIGhlaWdodD0iMTE4IiB2aWV3Qm94PSIwIDAgODUgMTE4IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogICAgPHJlY3QgeD0iMi4yNSIgeT0iMi40NjM4NyIgd2lkdGg9IjgwIiBoZWlnaHQ9IjExMyIgZmlsbD0id2hpdGUiLz4KICAgIDxyZWN0IHg9IjE3LjI1IiB5PSIxNC42MDQ1IiB3aWR0aD0iNTAiIGhlaWdodD0iMzQuNTUzNyIgZmlsbD0iIzc4QjZGRiIgZmlsbC1vcGFjaXR5PSIwLjQiLz4KICAgIDxsaW5lIHgxPSIxNy4yNSIgeTE9IjYyLjY5MjQiIHgyPSI2Ny4wNzkyIiB5Mj0iNjIuNjkyNCIgc3Ryb2tlPSIjQzRDNEM0IiBzdHJva2Utd2lkdGg9IjIiLz4KICAgIDxsaW5lIHgxPSIxNy4yNSIgeTE9IjY3Ljc2OTUiIHgyPSIyNS4yNSIgeTI9IjY3Ljc2OTUiIHN0cm9rZT0iI0M0QzRDNCIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICA8bGluZSB4MT0iMTcuMjUiIHkxPSI1Ny40OTcxIiB4Mj0iNTEuMDA1MyIgeTI9IjU3LjQ5NzEiIHN0cm9rZT0iI0M0QzRDNCIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICA8bGluZSB4MT0iMTcuMjUiIHkxPSI4Ny4zODA5IiB4Mj0iNjcuMDc5MiIgeTI9Ijg3LjM4MDkiIHN0cm9rZT0iI0M0QzRDNCIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICA8bGluZSB4MT0iMTcuMjUiIHkxPSI5Mi41NzYyIiB4Mj0iNjcuMDc5MiIgeTI9IjkyLjU3NjIiIHN0cm9rZT0iI0M0QzRDNCIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICA8bGluZSB4MT0iMTcuMjUiIHkxPSI5OC4wNjE1IiB4Mj0iNjcuMDc5MiIgeTI9Ijk4LjA2MTUiIHN0cm9rZT0iI0M0QzRDNCIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjwvc3ZnPgo=',
						],
						'cover'  => [
							'name'  => esc_html__( 'Cover', 'reme' ),
							'image' => 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODYiIGhlaWdodD0iMTIwIiB2aWV3Qm94PSIwIDAgODYgMTIwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogICAgPHJlY3QgeD0iMyIgeT0iMy40NjM4NyIgd2lkdGg9IjgwIiBoZWlnaHQ9IjExMyIgZmlsbD0id2hpdGUiLz4KICAgIDxyZWN0IHg9IjMiIHk9IjMuNDYzODciIHdpZHRoPSI4MCIgaGVpZ2h0PSI1MS4zNjM2IiBmaWxsPSIjNzhCNkZGIiBmaWxsLW9wYWNpdHk9IjAuNCIvPgogICAgPGxpbmUgeDE9IjE5IiB5MT0iNjcuNDI4NyIgeDI9IjY4LjgyOTIiIHkyPSI2Ny40Mjg3IiBzdHJva2U9IiNDNEM0QzQiIHN0cm9rZS13aWR0aD0iMiIvPgogICAgPGxpbmUgeDE9IjE5IiB5MT0iODMuNzExOSIgeDI9IjY4LjgyOTIiIHkyPSI4My43MTE5IiBzdHJva2U9IiNDNEM0QzQiIHN0cm9rZS13aWR0aD0iMiIvPgogICAgPGxpbmUgeDE9IjE5IiB5MT0iNzIuNjI0IiB4Mj0iNjguODI5MiIgeTI9IjcyLjYyNCIgc3Ryb2tlPSIjQzRDNEM0IiBzdHJva2Utd2lkdGg9IjIiLz4KICAgIDxsaW5lIHgxPSIxOSIgeTE9Ijg4LjkwNzIiIHgyPSI2OC44MjkyIiB5Mj0iODguOTA3MiIgc3Ryb2tlPSIjQzRDNEM0IiBzdHJva2Utd2lkdGg9IjIiLz4KICAgIDxsaW5lIHgxPSIxOSIgeTE9Ijc4LjEwODQiIHgyPSI2OC44MjkyIiB5Mj0iNzguMTA4NCIgc3Ryb2tlPSIjQzRDNEM0IiBzdHJva2Utd2lkdGg9IjIiLz4KICAgIDxsaW5lIHgxPSIxOSIgeTE9Ijk0LjM5MjYiIHgyPSI2OC44MjkyIiB5Mj0iOTQuMzkyNiIgc3Ryb2tlPSIjQzRDNEM0IiBzdHJva2Utd2lkdGg9IjIiLz4KICAgIDxsaW5lIHgxPSIxOSIgeTE9IjgzLjcxMTkiIHgyPSI0OCIgeTI9IjgzLjcxMTkiIHN0cm9rZT0iI0M0QzRDNCIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICA8bGluZSB4MT0iMTkiIHkxPSI5OS45OTYxIiB4Mj0iNDgiIHkyPSI5OS45OTYxIiBzdHJva2U9IiNDNEM0QzQiIHN0cm9rZS13aWR0aD0iMiIvPgogICAgPGxpbmUgeDE9IjE5IiB5MT0iNDQuNDg5MyIgeDI9IjUyLjc1NTMiIHkyPSI0NC40ODkzIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiLz4KICAgIDxsaW5lIHgxPSIxOSIgeTE9IjM4Ljg4NTciIHgyPSI2OSIgeTI9IjM4Ljg4NTciIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIvPgogICAgPHJlY3QgeD0iMS41IiB5PSIxLjk2Mzg3IiB3aWR0aD0iODMiIGhlaWdodD0iMTE2IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjMiLz4KPC9zdmc+Cg==',
						],
					],
				],
				'\ReMe\Customizer\Controls\React\Radio_Image'
			)
		);

		$this->add_control(
			new Control(
				'reme_' . $this->post_type . '_cover_height',
				[
					'sanitize_callback' => 'reme_sanitize_range_value',
					'transport'         => $this->selective_refresh,
					'default'           => '{ "mobile": 250, "tablet": 320, "desktop": 400 }',
				],
				[
					'label'                 => esc_html__( 'Cover height', 'reme' ),
					'section'               => $this->section,
					'type'                  => $this->is_post ? 'hidden' : 'reme_responsive_range_control',
					'input_attrs'           => [
						'max'        => 700,
						'units'      => [ 'px', 'vh', 'em', 'rem' ],
						'defaultVal' => [
							'mobile'  => 250,
							'tablet'  => 320,
							'desktop' => 400,
							'suffix'  => [
								'mobile'  => 'px',
								'tablet'  => 'px',
								'desktop' => 'px',
							],
						],
					],
					'priority'              => 15,
					'live_refresh_selector' => true,
					'live_refresh_css_prop' => [
						'cssVar' => [
							'responsive' => true,
							'vars'       => '--height',
							'selector'   => $this->cover_selector,
							'suffix'     => 'px',
						],
					],
					'active_callback'       => [ $this, 'is_cover_layout' ],
				],
				'\ReMe\Customizer\Controls\React\Responsive_Range'
			)
		);

		$this->add_control(
			new Control(
				'reme_' . $this->post_type . '_cover_padding',
				[
					'sanitize_callback' => [ $this, 'sanitize_spacing_array' ],
					'transport'         => $this->selective_refresh,
					'default'           => $this->padding_default( 'cover' ),
				],
				[
					'label'                 => esc_html__( 'Cover padding', 'reme' ),
					'section'               => $this->section,
					'input_attrs'           => [
						'units' => [ 'px', 'em', 'rem' ],
						'min'   => 0,
					],
					'default'               => $this->padding_default( 'cover' ),
					'priority'              => 20,
					'live_refresh_selector' => true,
					'live_refresh_css_prop' => [
						'cssVar' => array(
							'vars'       => '--padding',
							'selector'   => $this->cover_selector,
							'responsive' => true,
						),
					],
					'active_callback'       => [ $this, 'is_cover_layout' ],
					'type'                  => $this->is_post ? 'hidden' : 'reme_spacing',
				],
				'\ReMe\Customizer\Controls\React\Spacing'
			)
		);

		$this->add_control(
			new Control(
				'reme_' . $this->post_type . '_title_alignment',
				[
					'sanitize_callback' => 'reme_sanitize_alignment',
					'transport'         => $this->selective_refresh,
					'default'           => self::post_title_alignment(),
				],
				[
					'label'                 => esc_html__( 'Title Alignment', 'reme' ),
					'section'               => $this->section,
					'priority'              => 30,
					'choices'               => $this->get_title_alignment_choices(),
					'show_labels'           => true,
					'type'                  => $this->is_post ? 'hidden' : 'reme_responsive_radio_buttons_control',
					'live_refresh_selector' => true,
					'live_refresh_css_prop' => [
						'cssVar' => [
							'vars'       => [
								'--textalign',
								'--justify',
							],
							'valueRemap' => [
								'--justify' => [
									'left'   => 'flex-start',
									'center' => 'center',
									'right'  => 'flex-end',
								],
							],
							'responsive' => true,
							'selector'   => $this->cover_selector . ',' . $this->cover_selector . ' .container, ' . ( $this->post_type === 'post' ? '.entry-header' : '.rm-page-title-wrap' ),
						],
					],
					'active_callback'       => $this->post_type === 'post' ? '__return_true' : function() {
						return ! get_theme_mod( 'reme_page_hide_title', false );
					},
				],
				'\ReMe\Customizer\Controls\React\Responsive_Radio_Buttons'
			)
		);

		$this->add_control(
			new Control(
				'reme_' . $this->post_type . '_title_position',
				[
					'sanitize_callback' => 'reme_sanitize_position',
					'transport'         => $this->selective_refresh,
					'default'           => [
						'mobile'  => 'center',
						'tablet'  => 'center',
						'desktop' => 'center',
					],
				],
				[
					'label'                 => esc_html__( 'Title Position', 'reme' ),
					'section'               => $this->section,
					'priority'              => 35,
					'choices'               => [
						'flex-start' => [
							'tooltip' => esc_html__( 'Top', 'reme' ),
							'icon'    => 'arrow-up',
						],
						'center'     => [
							'tooltip' => esc_html__( 'Middle', 'reme' ),
							'icon'    => 'sort',
						],
						'flex-end'   => [
							'tooltip' => esc_html__( 'Bottom', 'reme' ),
							'icon'    => 'arrow-down',
						],
					],
					'type'                  => $this->is_post ? 'hidden' : 'reme_responsive_radio_buttons_control',
					'live_refresh_selector' => true,
					'live_refresh_css_prop' => [
						'cssVar' => [
							'vars'       => '--valign',
							'responsive' => true,
							'selector'   => $this->cover_selector,
						],
					],
					'show_labels'           => true,
					'active_callback'       => function() {
						return $this->post_type === 'post' ? $this->is_cover_layout() : $this->is_cover_layout() && ! get_theme_mod( 'reme_page_hide_title', false );
					},
				],
				'\ReMe\Customizer\Controls\React\Responsive_Radio_Buttons'
			)
		);

		$this->add_control(
			new Control(
				'reme_' . $this->post_type . '_cover_background_color',
				[
					'sanitize_callback' => 'reme_sanitize_colors',
					'default'           => 'var(--rm-dark-bg)',
					'transport'         => $this->selective_refresh,
				],
				[
					'label'                 => esc_html__( 'Cover overlay color', 'reme' ),
					'section'               => $this->section,
					'priority'              => 45,
					'input_attrs'           => [
						'allow_gradient' => true,
					],
					'live_refresh_selector' => true,
					'live_refresh_css_prop' => [
						'cssVar' => array(
							'vars'     => '--bgcolor',
							'selector' => $this->cover_selector . ' .rm-overlay',
						),
					],
					'active_callback'       => [ $this, 'is_cover_layout' ],
				],
				'ReMe\Customizer\Controls\React\Color'
			)
		);

		$this->add_control(
			new Control(
				'reme_' . $this->post_type . '_cover_text_color',
				[
					'sanitize_callback' => 'reme_sanitize_colors',
					'default'           => 'var(--rm-text-dark-bg)',
					'transport'         => $this->selective_refresh,
				],
				[
					'label'                 => esc_html__( 'Cover text color', 'reme' ),
					'section'               => $this->section,
					'priority'              => 50,
					'live_refresh_selector' => true,
					'live_refresh_css_prop' => [
						'cssVar' => [
							'vars'     => '--color',
							'selector' => $this->cover_selector . ' .rm-title-meta-wrap',
						],
					],
					'active_callback'       => function() {
						return $this->post_type === 'post' ? $this->is_cover_layout() : $this->is_cover_layout() && ! get_theme_mod( 'reme_page_hide_title', false );
					},
				],
				'ReMe\Customizer\Controls\React\Color'
			)
		);

		$this->add_control(
			new Control(
				'reme_' . $this->post_type . '_cover_overlay_opacity',
				[
					'sanitize_callback' => 'reme_sanitize_range_value',
					'transport'         => $this->selective_refresh,
					'default'           => 50,
				],
				[
					'label'                 => esc_html__( 'Overlay opacity', 'reme' ) . '(%)',
					'section'               => $this->section,
					'input_attrs'           => [
						'min'        => 0,
						'max'        => 100,
						'step'       => 1,
						'defaultVal' => 50,
					],
					'priority'              => 55,
					'type'                  => $this->is_post ? 'hidden' : 'reme_range_control',
					'live_refresh_selector' => true,
					'live_refresh_css_prop' => [
						'cssVar' => [
							'vars'     => '--opacity',
							'selector' => $this->cover_selector . ' .rm-overlay',
						],
					],
					'active_callback'       => [ $this, 'is_cover_layout' ],
				],
				'ReMe\Customizer\Controls\React\Range'
			)
		);

		$this->add_control(
			new Control(
				'reme_' . $this->post_type . '_cover_hide_thumbnail',
				[
					'sanitize_callback' => 'reme_sanitize_checkbox',
					'default'           => false,
				],
				[
					'label'           => esc_html__( 'Hide featured image', 'reme' ),
					'section'         => $this->section,
					'type'            => $this->is_post ? 'hidden' : 'reme_toggle_control',
					'priority'        => 60,
					'active_callback' => [ $this, 'is_cover_layout' ],
				],
				'ReMe\Customizer\Controls\Checkbox'
			)
		);

		$this->add_control(
			new Control(
				'reme_' . $this->post_type . '_cover_blend_mode',
				[
					'default'           => 'normal',
					'sanitize_callback' => 'reme_sanitize_blend_mode',
					'transport'         => $this->selective_refresh,
				],
				[
					'label'                 => esc_html__( 'Blend mode', 'reme' ),
					'section'               => $this->section,
					'priority'              => 65,
					'type'                  => $this->is_post ? 'hidden' : 'select',
					'choices'               => $this->get_blend_mode_choices(),
					'live_refresh_selector' => true,
					'live_refresh_css_prop' => [
						'cssVar' => [
							'vars'     => '--blendmode',
							'selector' => $this->cover_selector . ' .rm-overlay',
						],
					],
					'active_callback'       => [ $this, 'is_cover_layout' ],
				]
			)
		);

		$this->add_control(
			new Control(
				'reme_' . $this->post_type . '_cover_container',
				[
					'default'           => 'contained',
					'sanitize_callback' => 'reme_sanitize_container_layout',
				],
				[
					'label'           => esc_html__( 'Cover container', 'reme' ),
					'section'         => $this->section,
					'priority'        => 70,
					'type'            => $this->is_post ? 'hidden' : 'select',
					'choices'         => $this->get_container_width_choices(),
					'active_callback' => function() {
						return $this->post_type === 'post' ? $this->is_cover_layout() : $this->is_cover_layout() && ! get_theme_mod( 'reme_page_hide_title', false );
					},
				]
			)
		);

		$this->add_boxed_layout_controls(
			$this->post_type . '_cover_title',
			[
				'priority'               => 75,
				'section'                => $this->section,
				'has_text_color'         => false,
				'padding_default'        => $this->padding_default( 'cover' ),
				'background_default'     => 'var(--rm-dark-bg)',
				'boxed_selector'         => $this->cover_selector . ' .rm-is-boxed.rm-title-meta-wrap',
				'toggle_active_callback' => function() {
					return $this->post_type === 'post' ? $this->is_cover_layout() : $this->is_cover_layout() && ! get_theme_mod( 'reme_page_hide_title', false );
				},
				'active_callback'        => function() {
					$is_cover = $this->post_type === 'post' ? $this->is_cover_layout() : $this->is_cover_layout() && ! get_theme_mod( 'reme_page_hide_title', false );
					return $is_cover && get_theme_mod( 'reme_' . $this->post_type . '_cover_title_boxed_layout', false );
				},
			]
		);
	}

	/**
	 * Add content spacing control.
	 */
	private function content_vspacing() {

		$this->add_control(
			new Control(
				'reme_' . $this->post_type . '_page_settings_heading',
				[
					'sanitize_callback' => 'sanitize_text_field',
				],
				[
					'label'            => esc_html__( 'Page', 'reme' ) . ' ' . esc_html__( 'Settings', 'reme' ),
					'section'          => $this->section,
					'priority'         => 90,
					'class'            => 'page-settings-accordion',
					'expanded'         => false,
					'accordion'        => true,
					'controls_to_wrap' => 2,
				],
				'ReMe\Customizer\Controls\Heading'
			)
		);

		$this->add_control(
			new Control(
				'reme_' . $this->post_type . '_inherit_vspacing',
				[
					'sanitize_callback' => 'reme_sanitize_vspace_type',
					'default'           => 'inherit',
				],
				[
					'label'              => esc_html__( 'Content Vertical Spacing', 'reme' ),
					'section'            => $this->section,
					'priority'           => 95,
					'choices'            => [
						'inherit'  => [
							'tooltip' => esc_html__( 'Inherit', 'reme' ),
							'icon'    => 'text',
						],
						'specific' => [
							'tooltip' => esc_html__( 'Custom', 'reme' ),
							'icon'    => 'text',
						],
					],
					'footer_description' => [
						'inherit' => [
							'template'         => esc_html__( 'Customize the default vertical spacing <ctaButton>here</ctaButton>.', 'reme' ),
							'control_to_focus' => Config::MODS_CONTENT_VSPACING,
						],
					],
				],
				'\ReMe\Customizer\Controls\React\Radio_Buttons'
			)
		);

		$default_value = get_theme_mod( Config::MODS_CONTENT_VSPACING, $this->content_vspacing_default() );
		$this->add_control(
			new Control(
				'reme_' . $this->post_type . '_content_vspacing',
				[
					'default'   => $default_value,
					'transport' => $this->selective_refresh,
				],
				[
					'label'                 => __( 'Custom Value', 'reme' ),
					'sanitize_callback'     => [ $this, 'sanitize_spacing_array' ],
					'section'               => $this->section,
					'input_attrs'           => [
						'units'     => [ 'px', 'vh' ],
						'axis'      => 'vertical',
						'dependsOn' => [ 'reme_' . $this->post_type . '_inherit_vspacing' => 'specific' ],
					],
					'default'               => $default_value,
					'priority'              => 100,
					'live_refresh_selector' => true,
					'live_refresh_css_prop' => [
						'cssVar'      => [
							'vars'       => '--c-vspace',
							'selector'   => 'body.' . $this->post_type . ' .reme-main',
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
	 * Fuction used for active_callback control property.
	 *
	 * @return bool
	 */
	abstract public static function is_cover_layout();

	/**
	 * @return array[]
	 */
	protected function get_title_alignment_choices(): array {
		return [
			'left'   => [
				'tooltip' => esc_html__( 'Left', 'reme' ),
				'icon'    => 'editor-alignleft',
			],
			'center' => [
				'tooltip' => esc_html__( 'Center', 'reme' ),
				'icon'    => 'editor-aligncenter',
			],
			'right'  => [
				'tooltip' => esc_html__( 'Right', 'reme' ),
				'icon'    => 'editor-alignright',
			],
		];
	}

	/**
	 * @return array
	 */
	protected function get_blend_mode_choices(): array {
		return [
			'normal'      => esc_html__( 'Normal', 'reme' ),
			'multiply'    => esc_html__( 'Multiply', 'reme' ),
			'screen'      => esc_html__( 'Screen', 'reme' ),
			'overlay'     => esc_html__( 'Overlay', 'reme' ),
			'darken'      => esc_html__( 'Darken', 'reme' ),
			'lighten'     => esc_html__( 'Lighten', 'reme' ),
			'color-dodge' => esc_html__( 'Color Dodge', 'reme' ),
			'saturation'  => esc_html__( 'Saturation', 'reme' ),
			'color'       => esc_html__( 'Color', 'reme' ),
			'difference'  => esc_html__( 'Difference', 'reme' ),
			'exclusion'   => esc_html__( 'Exclusion', 'reme' ),
			'hue'         => esc_html__( 'Hue', 'reme' ),
			'luminosity'  => esc_html__( 'Luminosity', 'reme' ),
		];
	}

	/**
	 * @return array
	 */
	public function get_container_width_choices(): array {
		return [
			'contained'  => esc_html__( 'Contained', 'reme' ),
			'full-width' => esc_html__( 'Full width', 'reme' ),
		];
	}
}
