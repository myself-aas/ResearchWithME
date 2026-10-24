<?php
/**
 * Ability: reme/monetization-update.
 *
 * Configures advertising network parameters and affiliate defaults.
 *
 * @package ReMe\Abilities
 */

namespace ReMe\Abilities;

/**
 * Class Monetization_Update
 *
 * @package ReMe\Abilities
 */
class Monetization_Update extends Abstract_Ability {

	/**
	 * {@inheritDoc}
	 */
	protected function get_id() {
		return 'monetization-update';
	}

	/**
	 * {@inheritDoc}
	 */
	protected function get_label() {
		return __( 'Update Monetization Settings', 'reme' );
	}

	/**
	 * {@inheritDoc}
	 */
	protected function get_description() {
		return __( 'Update advertising network configurations (Google AdSense publisher ID, in-article ad slotting) and affiliate disclosure parameters.', 'reme' );
	}

	/**
	 * {@inheritDoc}
	 */
	protected function get_capability() {
		return 'manage_options';
	}

	/**
	 * {@inheritDoc}
	 */
	protected function get_annotations() {
		return array(
			'destructive' => false,
			'idempotent'  => true,
		);
	}

	/**
	 * {@inheritDoc}
	 */
	protected function get_input_schema() {
		return array(
			'type'       => 'object',
			'properties' => array(
				'adsense_client_id'     => array(
					'type'        => 'string',
					'description' => 'Google AdSense client/publisher ID (e.g. ca-pub-1234567890).',
				),
				'in_article_enabled'    => array(
					'type'        => 'boolean',
					'description' => 'Toggle automatic in-article ad insertion.',
				),
				'in_article_paragraph'  => array(
					'type'        => 'integer',
					'description' => 'Paragraph number after which to inject in-article ad (default 3).',
				),
				'in_article_slot'       => array(
					'type'        => 'string',
					'description' => 'Ad slot ID for in-article ad unit.',
				),
				'after_content_enabled' => array(
					'type'        => 'boolean',
					'description' => 'Toggle ad placement below single post content.',
				),
				'disclosure_text'       => array(
					'type'        => 'string',
					'description' => 'Custom FTC affiliate disclosure notice text.',
				),
			),
		);
	}

	/**
	 * {@inheritDoc}
	 */
	protected function get_output_schema() {
		return array(
			'type'       => 'object',
			'properties' => array(
				'updated' => array(
					'type'  => 'array',
					'items' => array( 'type' => 'string' ),
				),
			),
		);
	}

	/**
	 * {@inheritDoc}
	 */
	protected function run( array $input ) {
		$updated = array();

		if ( array_key_exists( 'adsense_client_id', $input ) ) {
			set_theme_mod( 'reme_adsense_client_id', sanitize_text_field( $input['adsense_client_id'] ) );
			$updated[] = 'adsense_client_id';
		}

		if ( array_key_exists( 'in_article_enabled', $input ) ) {
			set_theme_mod( 'reme_ads_in_article_enabled', (bool) $input['in_article_enabled'] );
			$updated[] = 'in_article_enabled';
		}

		if ( array_key_exists( 'in_article_paragraph', $input ) ) {
			set_theme_mod( 'reme_ads_in_article_paragraph', max( 1, (int) $input['in_article_paragraph'] ) );
			$updated[] = 'in_article_paragraph';
		}

		if ( array_key_exists( 'in_article_slot', $input ) ) {
			set_theme_mod( 'reme_in_article_ad_slot', sanitize_text_field( $input['in_article_slot'] ) );
			$updated[] = 'in_article_slot';
		}

		if ( array_key_exists( 'after_content_enabled', $input ) ) {
			set_theme_mod( 'reme_ads_after_content_enabled', (bool) $input['after_content_enabled'] );
			$updated[] = 'after_content_enabled';
		}

		if ( array_key_exists( 'disclosure_text', $input ) ) {
			set_theme_mod( 'reme_affiliate_disclosure_text', wp_kses_post( $input['disclosure_text'] ) );
			$updated[] = 'disclosure_text';
		}

		if ( empty( $updated ) ) {
			return $this->error( 'no_changes', __( 'No recognized monetization settings were provided.', 'reme' ) );
		}

		return array( 'updated' => $updated );
	}
}
