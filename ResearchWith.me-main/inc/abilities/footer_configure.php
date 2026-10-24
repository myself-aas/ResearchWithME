<?php
/**
 * Ability: reme/footer-configure.
 *
 * Footer counterpart to header-configure. Rows/slots are driven by discovery
 * (the footer builder is not symmetric to the header).
 *
 * @package ReMe\Abilities
 */

namespace ReMe\Abilities;

/**
 * Class Footer_Configure
 *
 * @package ReMe\Abilities
 */
class Footer_Configure extends Abstract_Ability {
	use Builder_Configure;

	/**
	 * {@inheritDoc}
	 */
	protected function get_id() {
		return 'footer-configure';
	}

	/**
	 * {@inheritDoc}
	 */
	protected function get_label() {
		return __( 'Configure footer', 'reme' );
	}

	/**
	 * {@inheritDoc}
	 */
	protected function get_description() {
		/* translators: Keep "header-list-components" and "builder=footer" untranslated; they are an ability name and a parameter. */
		return __( 'Place or remove footer components, style rows and edit the copyright text. Get component ids from header-list-components (builder=footer).', 'reme' );
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
								'enum' => array( 'top', 'main', 'bottom' ),
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
								'enum' => array( 'top', 'main', 'bottom' ),
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
				'copyright' => array(
					'type'        => 'string',
					'description' => 'Footer copyright text. Basic HTML is allowed.',
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
		$builder = $this->get_builder( 'footer' );
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
				if ( isset( $style['row'] ) ) {
					$this->apply_row_style( 'footer', $style['row'], $style );
				}
			}
		}

		if ( ! $dry_run && isset( $input['copyright'] ) ) {
			set_theme_mod( 'footer_copyright_content', wp_kses_post( (string) $input['copyright'] ) );
		}

		if ( ! $dry_run ) {
			set_theme_mod( $this->layout_mod( 'footer' ), wp_json_encode( $layout ) );
		}

		return array(
			'layout_summary' => array( 'rows' => $this->summarize( $layout ) ),
			'warnings'       => $warnings,
		);
	}

}
