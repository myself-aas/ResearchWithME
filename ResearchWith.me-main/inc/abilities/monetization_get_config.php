<?php
/**
 * Ability: reme/monetization-get-config.
 *
 * Retrieves current advertising and affiliate configuration.
 *
 * @package ReMe\Abilities
 */

namespace ReMe\Abilities;

use ReMe\Views\Ads_Manager;
use ReMe\Views\Affiliate_Manager;

/**
 * Class Monetization_Get_Config
 *
 * @package ReMe\Abilities
 */
class Monetization_Get_Config extends Abstract_Ability {

	/**
	 * {@inheritDoc}
	 */
	protected function get_id() {
		return 'monetization-get-config';
	}

	/**
	 * {@inheritDoc}
	 */
	protected function get_label() {
		return __( 'Get Monetization Configuration', 'reme' );
	}

	/**
	 * {@inheritDoc}
	 */
	protected function get_description() {
		return __( 'Retrieve current advertising (AdSense, Adsterra, Mediavine) and affiliate marketing settings for the theme.', 'reme' );
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
				'noop' => array(
					'type'        => 'boolean',
					'description' => 'Optional compatibility flag.',
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
				'ads'       => array(
					'type'       => 'object',
					'properties' => array(
						'adsense_client_id'      => array( 'type' => 'string' ),
						'in_article_enabled'     => array( 'type' => 'boolean' ),
						'in_article_paragraph'   => array( 'type' => 'integer' ),
						'in_article_network'     => array( 'type' => 'string' ),
						'in_article_slot'        => array( 'type' => 'string' ),
						'after_content_enabled'  => array( 'type' => 'boolean' ),
					),
				),
				'affiliate' => array(
					'type'       => 'object',
					'properties' => array(
						'disclosure_text'        => array( 'type' => 'string' ),
					),
				),
			),
		);
	}

	/**
	 * {@inheritDoc}
	 */
	protected function run( array $input ) {
		return array(
			'ads'       => array(
				'adsense_client_id'     => (string) get_theme_mod( 'reme_adsense_client_id', '' ),
				'in_article_enabled'    => (bool) get_theme_mod( 'reme_ads_in_article_enabled', false ),
				'in_article_paragraph'  => (int) get_theme_mod( 'reme_ads_in_article_paragraph', 3 ),
				'in_article_network'    => (string) get_theme_mod( 'reme_in_article_ad_network', 'adsense' ),
				'in_article_slot'       => (string) get_theme_mod( 'reme_in_article_ad_slot', '' ),
				'after_content_enabled' => (bool) get_theme_mod( 'reme_ads_after_content_enabled', false ),
			),
			'affiliate' => array(
				'disclosure_text'       => (string) get_theme_mod( 'reme_affiliate_disclosure_text', Affiliate_Manager::DEFAULT_DISCLOSURE ),
			),
		);
	}
}
