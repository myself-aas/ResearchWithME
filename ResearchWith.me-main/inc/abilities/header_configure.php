<?php
/**
 * Ability: reme/header-configure.
 *
 * Structural header builder edit. Component ids are validated against
 * header-list-components.
 *
 * @package ReMe\Abilities
 */

namespace ReMe\Abilities;

/**
 * Class Header_Configure
 *
 * @package ReMe\Abilities
 */
class Header_Configure extends Abstract_Ability {
	use Builder_Configure;

	/**
	 * {@inheritDoc}
	 */
	protected function get_id() {
		return 'header-configure';
	}

	/**
	 * {@inheritDoc}
	 */
	protected function get_label() {
		return __( 'Configure header', 'reme' );
	}

	/**
	 * {@inheritDoc}
	 */
	protected function get_description() {
		/* translators: Keep "header-list-components" untranslated; it is an ability name. */
		return __( 'Place or remove header components and style rows. Get component ids from header-list-components first.', 'reme' );
	}

	/**
	 * {@inheritDoc}
	 */
	protected function get_annotations() {
		return array(
			'readonly'    => false,
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
				'place'     => array(
					'type'        => 'array',
					'description' => 'Components to place.',
					'items'       => array(
						'type'       => 'object',
						'required'   => array( 'component', 'row', 'slot' ),
						'properties' => array(
							'component' => array( 'type' => 'string' ),
							'row'       => array(
								'type' => 'string',
								'enum' => array( 'top', 'main', 'bottom', 'mobile-sidebar' ),
							),
							'slot'      => array(
								'type' => 'string',
								'enum' => self::$builder_slots,
							),
							'device'    => array(
								'type'    => 'string',
								'enum'    => array( 'desktop', 'mobile' ),
								'default' => 'desktop',
							),
						),
					),
				),
				'remove'    => array(
					'type'        => 'array',
					'description' => 'Components to remove.',
					'items'       => array(
						'type'       => 'object',
						'required'   => array( 'component' ),
						'properties' => array(
							'component' => array( 'type' => 'string' ),
							'device'    => array(
								'type' => 'string',
								'enum' => array( 'desktop', 'mobile' ),
							),
						),
					),
				),
				'row_style' => array(
					'type'        => 'array',
					'description' => 'Per-row styling.',
					'items'       => array(
						'type'       => 'object',
						'required'   => array( 'row' ),
						'properties' => array(
							'row'        => array(
								'type' => 'string',
								'enum' => array( 'top', 'main', 'bottom', 'sidebar' ),
							),
							'height'     => array(
								'type'                 => 'object',
								'additionalProperties' => true,
							),
							'background' => array(
								'type'                 => 'object',
								'additionalProperties' => true,
							),
							'text_color' => array( 'type' => 'string' ),
						),
					),
				),
				'dry_run'   => array(
					'type'        => 'boolean',
					'description' => 'Preview the resulting layout without saving.',
					'default'     => false,
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
				'layout_summary' => array(
					'type'                 => 'object',
					'additionalProperties' => true,
				),
				'warnings'       => array(
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
		$builder = $this->get_builder( 'header' );
		if ( null === $builder ) {
			return $this->error( 'hfg_unavailable', __( 'The header/footer builder is not available.', 'reme' ), 501 );
		}

		$warnings = array();
		$valid    = $this->component_ids( $builder );
		$layout   = $this->read_layout( $builder );
		$dry_run  = ! empty( $input['dry_run'] );

		if ( ! empty( $input['place'] ) && is_array( $input['place'] ) ) {
			foreach ( $input['place'] as $entry ) {
				if ( ! isset( $entry['component'], $entry['row'], $entry['slot'] ) ) {
					continue;
				}
				if ( ! in_array( $entry['component'], $valid, true ) ) {
					$warnings[] = sprintf(
						/* translators: %s: component id */
						__( 'Unknown component "%s"; skipped.', 'reme' ),
						$entry['component']
					);
					continue;
				}
				$device = isset( $entry['device'] ) ? $entry['device'] : 'desktop';
				$this->place( $layout, $entry['component'], $entry['row'], $entry['slot'], $device );
			}
		}

		if ( ! empty( $input['remove'] ) && is_array( $input['remove'] ) ) {
			foreach ( $input['remove'] as $entry ) {
				if ( ! isset( $entry['component'] ) ) {
					continue;
				}
				$this->remove( $layout, $entry['component'], isset( $entry['device'] ) ? $entry['device'] : null );
			}
		}

		if ( ! $dry_run && ! empty( $input['row_style'] ) && is_array( $input['row_style'] ) ) {
			foreach ( $input['row_style'] as $style ) {
				if ( ! isset( $style['row'] ) ) {
					continue;
				}
				$this->apply_row_style( 'header', $style['row'], $style );
			}
		}

		if ( ! $dry_run ) {
			set_theme_mod( $this->layout_mod( 'header' ), wp_json_encode( $layout ) );
		}

		return array(
			'layout_summary' => array( 'rows' => $this->summarize( $layout ) ),
			'warnings'       => $warnings,
		);
	}
}
