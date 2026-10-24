<?php
/**
 * Ability: reme/site-set-performance.
 *
 * Toggles the performance options that ship with the theme.
 *
 * @package ReMe\Abilities
 */

namespace ReMe\Abilities;

use ReMe\Core\Settings\Config;

/**
 * Class Site_Set_Performance
 *
 * @package ReMe\Abilities
 */
class Site_Set_Performance extends Abstract_Ability {

	/**
	 * Map of friendly input keys to their underlying option keys.
	 */
	const OPTION_MAP = array(
		'local_google_fonts' => Config::OPTION_LOCAL_GOOGLE_FONTS_HOSTING,
	);

	/**
	 * {@inheritDoc}
	 */
	protected function get_id() {
		return 'site-set-performance';
	}

	/**
	 * {@inheritDoc}
	 */
	protected function get_label() {
		return __( 'Set performance options', 'reme' );
	}

	/**
	 * {@inheritDoc}
	 */
	protected function get_description() {
		return __( 'Toggle ReMe performance optimizations: remove emoji scripts, remove oEmbed scripts, locally host Google fonts, and lazy-render off-screen content.', 'reme' );
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
				'local_google_fonts' => array(
					'type'        => 'boolean',
					'description' => 'Host external (Google) fonts locally.',
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

		foreach ( self::OPTION_MAP as $key => $option ) {
			if ( ! array_key_exists( $key, $input ) ) {
				continue;
			}

			update_option( $option, (bool) $input[ $key ] );
			$updated[] = $key;
		}

		if ( empty( $updated ) ) {
			return $this->error( 'no_changes', __( 'No recognized settings were provided.', 'reme' ) );
		}

		return array( 'updated' => $updated );
	}
}
