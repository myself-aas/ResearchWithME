<?php
/**
 * Author:          Uriahs Victor
 * Created on:      14/07/2021 (d/m/y)
 *
 * @package ReMe
 */
namespace ReMe\Compatibility;

/**
 * Class Easy_Digital_Downloads
 *
 * @package ReMe\Compatibility
 */
class Easy_Digital_Downloads {

	/**
	 * Function that is run after instantiation.
	 *
	 * @return void
	 */
	public function init() {
		if ( ! class_exists( 'Easy_Digital_Downloads', false ) ) {
			return;
		}
		add_action( 'wp_enqueue_scripts', array( $this, 'dequeue_edd_styles' ) );
		$edd_settings_filter = 'edd_settings_misc';
		// For EDD 2.x, use the `edd_settings_styles` filter.
		if ( defined( 'EDD_VERSION' ) && version_compare( '2.10.999', EDD_VERSION, '>' ) ) {
			$edd_settings_filter = 'edd_settings_styles';
		}
		add_filter( $edd_settings_filter, array( $this, 'edd_settings_styles' ) );
		add_filter( 'body_class', array( $this, 'add_body_class' ) );
	}

	/**
	 * Add reme easy digital downloads body class.
	 *
	 * @param array $classes Current classes on body.
	 */
	public function add_body_class( $classes ) {

		if ( edd_is_checkout() ||
		edd_is_success_page() ||
		edd_is_failed_transaction_page() ||
		edd_is_purchase_history_page() ||
		is_post_type_archive( 'download' ) ||
		get_post_type() == 'download' ||
		is_tax( 'download_category' ) ||
		is_tax( 'download_tag' )
		) {
			$classes[] = 'rm-edd';
		}

		return $classes;

	}

	/**
	 * Dequeue the EDD default styles as we have our own.
	 *
	 * @return void
	 */
	public function dequeue_edd_styles() {
		wp_dequeue_style( 'edd-styles' );
	}

	/**
	 * Filter the settings from EDD's "Styles" tab
	 *
	 * @param mixed $settings EDD style settings.
	 * @return array
	 */
	public function edd_settings_styles( $settings ) {
		/*
		 * Settings with type 'descriptive_text' are automatically stripped by EDD
		 * So this field is not saved to the DB on save changes.
		 *
		 * see edd_settings_sanitize()
		 */
		$settings['main'] = array(
			'reme_controlled' => array(
				'id'   => 'reme_controlled',
				'name' => esc_html__( 'Controlled by ReMe', 'reme' ),
				'desc' => esc_html__( 'ReMe Theme controls base style settings of Easy Digital Downloads. Additional settings from other extensions might appear below.', 'reme' ),
				'type' => 'descriptive_text',
			),
		);

		return $settings;
	}

}
