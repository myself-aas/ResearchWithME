<?php
/**
 * Footer class for Header Footer Grid.
 *
 * Name:    Header Footer Grid
 * Author:  Bogdan Preda <bogdan.preda@themeisle.com>
 *
 * @version 1.0.0
 * @package HFG
 */

namespace HFG\Core\Builder;

use HFG\Main;
use WP_Customize_Manager;

/**
 * Class Footer
 *
 * @package HFG\Core\Builder
 */
class Footer extends Abstract_Builder {

	/**
	 * Builder name.
	 */
	const BUILDER_NAME = 'footer';

	/**
	 * Footer constructor.
	 *
	 * @since   1.0.0
	 * @access  public
	 */
	public function init() {
		$this->set_property( 'title', __( 'Footer', 'reme' ) );
		$this->set_property( 'columns_layout', true );
		$this->set_property(
			'description',
			apply_filters(
				'hfg_footer_panel_description',
				sprintf(
					/* translators: %s builder type */
					esc_html__( 'Design your %s by dragging, dropping and resizing all the elements in real-time.', 'reme' ),
					$this->get_property( 'title' )
				)
			)
		);

		$copyright_quicklink_config = [
			'label' => esc_html__( 'Change Copyright', 'reme' ),
			'icon'  => 'dashicons-nametag',
		];

		$this->set_property(
			'instructions_array',
			array(
				'description' => sprintf(
				/* translators: 1: builder, 2: builder symbol */
					esc_attr__( 'Welcome to the %1$s builder! Click the %2$s button to add a new component or follow the Quick Links.', 'reme' ),
					$this->get_property( 'title' ),
					'+'
				),
				'quickLinks'  => array(
					'footer_copyright_content'            => $copyright_quicklink_config,
					'hfg_footer_layout_bottom_background' => array(
						'label' => esc_html__( 'Change Footer Color', 'reme' ),
						'icon'  => 'dashicons-admin-appearance',
					),
				),
			)
		);
		$this->devices = [
			'desktop' => __( 'Desktop', 'reme' ),
			'mobile'  => __( 'Mobile', 'reme' ),
		];

		/**
		 * Fix legacy search widget display in footer
		 * Only applies for versions < 5.8
		 */
		add_filter(
			'dynamic_sidebar_params',
			function ( $params ) {
				$processed_params        = [];
				$has_legacy_search_style = apply_filters( 'reme_has_legacy_search_style_filter', false );
				foreach ( $params as $param ) {
					if ( isset( $param['before_widget'] ) && strpos( $param['before_widget'], 'widget_search' ) !== false && $has_legacy_search_style === false ) {
						$param['before_widget'] = '<style type="text/css">.widget_search .search-form .search-submit, .widget_search .search-form .search-field { height: auto; }</style>' . $param['before_widget'];
						add_filter( 'reme_has_legacy_search_style_filter', '__return_true' );
					}
					array_push( $processed_params, $param );
				}

				return $processed_params;
			}
		);

		/**
		 * Add mobile footer layout if not present using the same layout from desktop if mobile is empty.
		 * This will apply from ReMe 3.5.8 and offer backward compatibility for users that have not set a mobile footer layout.
		 *
		 * @since 3.5.8
		 */
		add_filter(
			'theme_mod_hfg_footer_layout_v2',
			function ( $value ) {
				if ( is_string( $value ) ) {
					$maybe_parse_json = json_decode( $value, true );
					if ( ! empty( $maybe_parse_json['mobile'] ) ) {
						return $value;
					}
					$maybe_parse_json['mobile'] = $maybe_parse_json['desktop'];
					return wp_json_encode( $maybe_parse_json );
				}
				return $value;
			}
		);

		add_action( 'reme_after_slot_component', [ $this, 'add_footer_component' ], 10, 3 );
	}


	/**
	 * Called to register component controls.
	 *
	 * @param WP_Customize_Manager $wp_customize The Customize Manager.
	 *
	 * @return WP_Customize_Manager
	 * @since   4.0.1
	 * @access  public
	 */
	public function customize_register( WP_Customize_Manager $wp_customize ) {
		$this->customize_global_footer( $wp_customize );

		$wp_customize->add_section(
			'reme_footer_copyright_section',
			[
				'title'    => __( 'Change Copyright', 'reme' ),
				'priority' => 200,
				'panel'    => 'hfg_footer',
			]
		);

		$wp_customize->add_setting(
			'footer_copyright_content',
			[
				'default'           => $this->get_copyright_default(),
				'sanitize_callback' => 'wp_kses_post',
			]
		);

		$wp_customize->add_control(
			'footer_copyright_content',
			[
				'label'   => __( 'Text', 'reme' ),
				'section' => 'reme_footer_copyright_section',
				'type'    => 'textarea',
				'setting' => 'footer_copyright_content',
			]
		);

		return parent::customize_register( $wp_customize );
	}

	/**
	 * Registers the footer options section, the counterpart of the global header settings.
	 *
	 * @param WP_Customize_Manager $wp_customize The Customize Manager.
	 *
	 * @return void
	 */
	private function customize_global_footer( WP_Customize_Manager $wp_customize ) {
		$wp_customize->add_section(
			'reme_global_footer_settings',
			[
				'title'    => __( 'Footer Options', 'reme' ),
				'priority' => 201,
				'panel'    => 'hfg_footer',
			]
		);

		$wp_customize->add_setting(
			'reme_disable_footer',
			[
				'default'           => false,
				'transport'         => 'refresh',
				'sanitize_callback' => 'reme_sanitize_checkbox',
			]
		);

		$wp_customize->add_control(
			'reme_disable_footer',
			[
				'label'    => esc_html__( 'Disable Footer', 'reme' ),
				'section'  => 'reme_global_footer_settings',
				'type'     => 'reme_toggle_control',
				'priority' => 5,
			]
		);
	}

	/**
	 * Add footer component.
	 *
	 * @param string $builder Builder slug.
	 * @param string $row Row slug.
	 * @param string $slot Slot name.
	 *
	 * @return void
	 */
	public function add_footer_component( $builder, $row, $slot ) {
		if ( $builder !== self::BUILDER_NAME ) {
			return;
		}

		if ( $row !== 'bottom' ) {
			return;
		}

		if ( $slot !== 'left' ) {
			return;
		}

		$value = get_theme_mod( 'footer_copyright_content', $this->get_copyright_default() );

		$output  = '<div class="builder-item cr"><div class="item--inner"><div class="component-wrap"><div>';
		$output .= wp_kses_post( $value );
		$output .= '</div></div></div></div>';

		echo wp_kses_post( $output );
	}

	/**
	 * Method called via hook.
	 *
	 * @since   1.0.0
	 * @access  public
	 */
	public function load_template() {

		Main::get_instance()->load( 'footer-wrapper' );
	}

	/**
	 * Render builder row.
	 *
	 * @param string $device_id The device id.
	 * @param string $row_id The row id.
	 * @param array  $row_details Row data.
	 */
	public function render_row( $device_id, $row_id, $row_details ) {
		Main::get_instance()->load( 'footer-row-wrapper' );
	}

	/**
	 * Get builder id.
	 *
	 * @return string Builder id.
	 */
	public function get_id() {
		return self::BUILDER_NAME;
	}

	/**
	 * Overrides parent method to limit rows.
	 *
	 * @return array
	 * @since   1.0.0
	 * @access  protected
	 */
	protected function get_rows() {
		if ( reme_is_new_builder() ) {
			return [
				'top'    => array(
					'title'       => __( 'Footer Top', 'reme' ),
					'description' => $this->get_property( 'description' ),
				),
				'main'   => array(
					'title'       => __( 'Footer Main', 'reme' ),
					'description' => $this->get_property( 'description' ),
				),
				'bottom' => array(
					'title'       => __( 'Footer Bottom', 'reme' ),
					'description' => $this->get_property( 'description' ),
				),
			];
		}

		return [
			'top'    => array(
				'title'       => __( 'Footer Top', 'reme' ),
				'description' => $this->get_property( 'description' ),
			),
			'bottom' => array(
				'title'       => __( 'Footer Bottom', 'reme' ),
				'description' => $this->get_property( 'description' ),
			),
		];
	}

	/**
	 * Get the default copyright text.
	 * 
	 * @return string
	 */
	private function get_copyright_default() {
		return sprintf(
		/* translators: %1$s is the site name, %2$s is WordPress */
			__( '%1$s | Powered by %2$s', 'reme' ),
			'<p>' . esc_html( get_bloginfo( 'name' ) ),
			'<a href="https://wordpress.org" rel="nofollow">WordPress</a></p>'
		);
	}
}
