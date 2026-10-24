<?php
/**
 * Monetization & Advertising Customizer Controls.
 *
 * Implements developer-friendly monetization options and custom code editor
 * hooks adhering to WordPress/better-code-editing and WordPress-Coding-Standards.
 *
 * @package ReMe\Customizer\Options
 */

namespace ReMe\Customizer\Options;

use ReMe\Customizer\Base_Customizer;
use ReMe\Customizer\Types\Control;
use ReMe\Customizer\Types\Section;
use ReMe\Views\Affiliate_Manager;

/**
 * Class Monetization
 *
 * @package ReMe\Customizer\Options
 */
class Monetization extends Base_Customizer {

	/**
	 * Add controls.
	 *
	 * @return void
	 */
	public function add_controls() {
		$this->add_monetization_section();
		$this->add_ad_settings();
		$this->add_affiliate_settings();
		add_action( 'customize_controls_enqueue_scripts', array( $this, 'enqueue_code_editor_scripts' ) );
	}

	/**
	 * Register the Monetization section in Customizer.
	 *
	 * @return void
	 */
	private function add_monetization_section() {
		$this->add_section(
			new Section(
				'reme_monetization',
				array(
					'priority' => 45,
					'title'    => __( 'Monetization & Ads', 'reme' ),
				)
			)
		);
	}

	/**
	 * Add Ad Network settings.
	 *
	 * @return void
	 */
	private function add_ad_settings() {
		// AdSense Publisher ID.
		$this->add_control(
			new Control(
				'reme_adsense_client_id',
				array(
					'sanitize_callback' => 'sanitize_text_field',
					'default'           => '',
				),
				array(
					'label'       => __( 'Google AdSense Publisher ID', 'reme' ),
					'description' => __( 'Example: ca-pub-1234567890123456', 'reme' ),
					'section'     => 'reme_monetization',
					'type'        => 'text',
					'priority'    => 10,
				)
			)
		);

		// In-Article Ad Toggle.
		$this->add_control(
			new Control(
				'reme_ads_in_article_enabled',
				array(
					'sanitize_callback' => 'reme_sanitize_checkbox',
					'default'           => false,
				),
				array(
					'label'       => __( 'Enable In-Article Ad Unit', 'reme' ),
					'description' => __( 'Automatically insert a responsive ad inside article content.', 'reme' ),
					'section'     => 'reme_monetization',
					'type'        => 'checkbox',
					'priority'    => 20,
				)
			)
		);

		// In-Article Ad Paragraph.
		$this->add_control(
			new Control(
				'reme_ads_in_article_paragraph',
				array(
					'sanitize_callback' => 'absint',
					'default'           => 3,
				),
				array(
					'label'       => __( 'Insert After Paragraph #', 'reme' ),
					'description' => __( 'Place the in-article ad slot after this paragraph number.', 'reme' ),
					'section'     => 'reme_monetization',
					'type'        => 'number',
					'input_attrs' => array(
						'min'  => 1,
						'max'  => 20,
						'step' => 1,
					),
					'priority'    => 25,
				)
			)
		);

		// In-Article Ad Slot ID.
		$this->add_control(
			new Control(
				'reme_in_article_ad_slot',
				array(
					'sanitize_callback' => 'sanitize_text_field',
					'default'           => '',
				),
				array(
					'label'       => __( 'In-Article Ad Slot ID', 'reme' ),
					'section'     => 'reme_monetization',
					'type'        => 'text',
					'priority'    => 30,
				)
			)
		);

		// After Content Ad Toggle.
		$this->add_control(
			new Control(
				'reme_ads_after_content_enabled',
				array(
					'sanitize_callback' => 'reme_sanitize_checkbox',
					'default'           => false,
				),
				array(
					'label'       => __( 'Enable Post-Content Ad Unit', 'reme' ),
					'description' => __( 'Display a leaderboard banner immediately after the article text.', 'reme' ),
					'section'     => 'reme_monetization',
					'type'        => 'checkbox',
					'priority'    => 40,
				)
			)
		);

		// Custom Ad Snippet (Developer Custom Code).
		$this->add_control(
			new Control(
				'reme_custom_ad_code',
				array(
					'sanitize_callback' => array( $this, 'sanitize_custom_code' ),
					'default'           => '',
				),
				array(
					'label'       => __( 'Custom Ad HTML / Script', 'reme' ),
					'description' => __( 'Custom code for Adsterra, Mediavine, or direct sponsors. Highlighted with CodeMirror.', 'reme' ),
					'section'     => 'reme_monetization',
					'type'        => 'textarea',
					'priority'    => 50,
					'input_attrs' => array(
						'id'    => 'reme_custom_ad_code_editor',
						'rows'  => 6,
						'class' => 'code',
					),
				)
			)
		);
	}

	/**
	 * Add Affiliate Marketing settings.
	 *
	 * @return void
	 */
	private function add_affiliate_settings() {
		// Custom FTC Disclosure text.
		$this->add_control(
			new Control(
				'reme_affiliate_disclosure_text',
				array(
					'sanitize_callback' => 'wp_kses_post',
					'default'           => Affiliate_Manager::DEFAULT_DISCLOSURE,
				),
				array(
					'label'       => __( 'FTC Affiliate Disclosure Notice', 'reme' ),
					'description' => __( 'Displayed automatically at the top of posts containing affiliate links or product reviews.', 'reme' ),
					'section'     => 'reme_monetization',
					'type'        => 'textarea',
					'priority'    => 60,
				)
			)
		);
	}

	/**
	 * Sanitize custom ad code.
	 *
	 * Allows script and iframe tags for users with unfiltered_html.
	 *
	 * @param string $code Raw ad code.
	 *
	 * @return string Sanitized code.
	 */
	public function sanitize_custom_code( $code ) {
		if ( current_user_can( 'unfiltered_html' ) ) {
			return $code;
		}

		return wp_kses_post( $code );
	}

	/**
	 * Enqueue WordPress Better Code Editing (CodeMirror) for custom ad code field.
	 *
	 * @return void
	 */
	public function enqueue_code_editor_scripts() {
		if ( ! function_exists( 'wp_enqueue_code_editor' ) ) {
			return;
		}

		$settings = wp_enqueue_code_editor( array( 'type' => 'text/html' ) );
		if ( false === $settings ) {
			return;
		}

		$script = sprintf(
			'jQuery(document).ready(function($) {
				wp.codeEditor.initialize("reme_custom_ad_code_editor", %s);
			});',
			wp_json_encode( $settings )
		);

		wp_add_inline_script( 'code-editor', $script );
	}
}
