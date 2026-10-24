<?php
/**
 * Typed display settings for the blog archive and single post, shared by
 * reme/appearance-update (writes) and reme/site-get-state (reads).
 *
 * Every field maps to a Customizer setting the theme already registers and is
 * validated against the same values that setting's sanitize callback accepts.
 *
 * @package ReMe\Abilities
 */

namespace ReMe\Abilities;

use WP_Error;

/**
 * Class Display_Fields
 *
 * @package ReMe\Abilities
 */
class Display_Fields {

	/**
	 * Group names.
	 */
	const GROUPS = array( 'blog', 'single' );

	/**
	 * Field definitions for a group.
	 *
	 * Supported types: enum, bool, int, responsive_int, order, string.
	 *
	 * @param string $group Group name.
	 * @return array<string,array<string,mixed>>
	 */
	public static function get_fields( $group ) {
		$fields = array();

		if ( 'blog' === $group ) {
			$fields = array(
				'layout'                 => array(
					'mod'         => 'reme_blog_archive_layout',
					'type'        => 'enum',
					'choices'     => array( 'list', 'covers', 'grid' ),
					'stored'      => array( 'list' => 'default' ),
					'default'     => 'grid',
					'description' => 'Post cards layout.',
				),
				'columns'                => array(
					'mod'         => 'reme_grid_layout',
					'type'        => 'responsive_int',
					'min'         => 1,
					'max'         => 4,
					'default'     => array(
						'desktop' => 3,
						'tablet'  => 2,
						'mobile'  => 1,
					),
					'description' => 'Grid/covers columns per device (1-4).',
				),
				'content_width'          => array(
					'mod'         => 'reme_blog_archive_content_width',
					'type'        => 'int',
					'min'         => 50,
					'max'         => 100,
					'description' => 'Content width in percent when a sidebar is shown. Used when advanced layout options are enabled.',
				),
				'hide_archive_title'     => array(
					'mod'     => 'reme_archive_hide_title',
					'type'    => 'bool',
					'default' => false,
				),
				'masonry'                => array(
					'mod'     => 'reme_enable_masonry',
					'type'    => 'bool',
					'default' => false,
				),
				'featured_post'          => array(
					'mod'     => 'reme_enable_featured_post',
					'type'    => 'bool',
					'default' => false,
				),
				'featured_post_target'   => array(
					'mod'     => 'reme_featured_post_target',
					'type'    => 'enum',
					'choices' => array( 'sticky', 'latest' ),
					'default' => 'latest',
				),
				'content_order'          => array(
					'mod'         => 'reme_post_content_ordering',
					'type'        => 'order',
					'choices'     => array( 'thumbnail', 'title-meta', 'excerpt' ),
					'description' => 'Ordered list of the visible post card elements.',
				),
				'excerpt_length'         => array(
					'mod'         => 'reme_post_excerpt_length',
					'type'        => 'int',
					'min'         => 0,
					'max'         => 300,
					'default'     => 25,
					'description' => 'Excerpt length in words.',
				),
				'card_style'             => array(
					'mod'     => 'reme_enable_card_style',
					'type'    => 'bool',
					'default' => false,
				),
				'author_avatar'          => array(
					'mod'     => 'reme_author_avatar',
					'type'    => 'bool',
					'default' => false,
				),
				'show_last_updated_date' => array(
					'mod'     => 'reme_show_last_updated_date',
					'type'    => 'bool',
					'default' => false,
				),
			);
		}

		if ( 'single' === $group ) {
			$fields = array(
				'header_layout'           => array(
					'mod'     => 'reme_post_header_layout',
					'type'    => 'enum',
					'choices' => array( 'normal', 'cover' ),
					'default' => 'normal',
				),
				'content_width'           => array(
					'mod'         => 'reme_single_post_content_width',
					'type'        => 'int',
					'min'         => 50,
					'max'         => 100,
					'description' => 'Content width in percent when a sidebar is shown. Used when advanced layout options are enabled.',
				),
				'elements_order'          => array(
					'mod'         => 'reme_layout_single_post_elements_order',
					'type'        => 'order',
					'choices'     => array( 'thumbnail', 'title-meta', 'content', 'tags', 'post-navigation', 'comments' ),
					'description' => 'Ordered list of the visible single post elements.',
				),
				'cover_meta_before_title' => array(
					'mod'     => 'reme_post_cover_meta_before_title',
					'type'    => 'bool',
					'default' => false,
				),
				'page_hide_title'         => array(
					'mod'         => 'reme_page_hide_title',
					'type'        => 'bool',
					'default'     => false,
					'description' => 'Hide the title on single pages.',
				),
			);
		}

		/**
		 * Filters the typed display fields of a group.
		 *
		 * Extensions can add their own fields here. A field may carry an
		 * `unavailable` message, in which case writes to it fail with that
		 * message.
		 *
		 * @param array<mixed>  $fields Field definitions keyed by input name.
		 * @param string $group  Group name: blog or single.
		 */
		return (array) apply_filters( 'reme_ability_display_fields', $fields, $group );
	}

	/**
	 * JSON schema for a group.
	 *
	 * @param string $group       Group name.
	 * @param string $description Group description.
	 * @return array<mixed>
	 */
	public static function get_group_schema( $group, $description ) {
		$properties = array();

		foreach ( self::get_fields( $group ) as $name => $field ) {
			$properties[ $name ] = self::get_field_schema( $field );
		}

		return array(
			'type'        => 'object',
			'description' => $description,
			'properties'  => $properties,
		);
	}

	/**
	 * JSON schema for one field.
	 *
	 * @param array<mixed> $field Field definition.
	 * @return array<mixed>
	 */
	private static function get_field_schema( array $field ) {
		$type   = isset( $field['type'] ) ? $field['type'] : 'string';
		$schema = array( 'type' => 'string' );

		switch ( $type ) {
			case 'enum':
				$schema['enum'] = array_values( $field['choices'] );
				break;
			case 'bool':
				$schema = array( 'type' => 'boolean' );
				break;
			case 'int':
				$schema = array(
					'type'    => 'integer',
					'minimum' => $field['min'],
					'maximum' => $field['max'],
				);
				break;
			case 'responsive_int':
				$device = array(
					'type'    => 'integer',
					'minimum' => $field['min'],
					'maximum' => $field['max'],
				);
				$schema = array(
					'type'       => 'object',
					'properties' => array(
						'mobile'  => $device,
						'tablet'  => $device,
						'desktop' => $device,
					),
				);
				break;
			case 'order':
				$schema = array(
					'type'  => 'array',
					'items' => array(
						'type' => 'string',
						'enum' => array_values( array_unique( $field['choices'] ) ),
					),
				);
				break;
		}

		if ( ! empty( $field['description'] ) ) {
			$schema['description'] = $field['description'];
		}

		return $schema;
	}

	/**
	 * Current values of a group, keyed by input name.
	 *
	 * @param string $group Group name.
	 * @return array<mixed>
	 */
	public static function read_group( $group ) {
		$values = array();

		foreach ( self::get_fields( $group ) as $name => $field ) {
			if ( ! empty( $field['unavailable'] ) ) {
				continue;
			}

			$default = isset( $field['default'] ) ? $field['default'] : null;
			$value   = get_theme_mod( $field['mod'], $default );

			switch ( $field['type'] ) {
				case 'bool':
					$value = (bool) $value;
					break;
				case 'int':
					$value = null === $value || '' === $value ? null : (int) $value;
					break;
				case 'responsive_int':
				case 'order':
					if ( is_string( $value ) ) {
						$decoded = json_decode( $value, true );
						$value   = is_array( $decoded ) ? $decoded : $default;
					}
					break;
				case 'enum':
					if ( ! empty( $field['stored'] ) ) {
						$friendly = array_search( $value, $field['stored'], true );
						$value    = false !== $friendly ? $friendly : $value;
					}
					break;
			}

			$values[ $name ] = $value;
		}

		return $values;
	}

	/**
	 * Validate a group input and return the theme_mods to write.
	 *
	 * Nothing is persisted here, so a single invalid field rejects the whole
	 * request before any setting changes.
	 *
	 * @param string       $group Group name.
	 * @param array<mixed> $input The group input.
	 * @return array<string,mixed>|WP_Error Theme mod values keyed by theme mod name.
	 */
	public static function prepare_group( $group, array $input ) {
		$fields = self::get_fields( $group );
		$mods   = array();

		foreach ( $input as $name => $value ) {
			if ( ! isset( $fields[ $name ] ) ) {
				return new WP_Error(
					'reme_ability_unknown_field',
					/* translators: %s: input field name */
					sprintf( __( 'Unknown field "%s".', 'reme' ), $group . '.' . $name ),
					array( 'status' => 400 )
				);
			}

			$field = $fields[ $name ];

			if ( ! empty( $field['unavailable'] ) ) {
				return new WP_Error( 'reme_ability_field_unavailable', (string) $field['unavailable'], array( 'status' => 403 ) );
			}

			$clean = self::sanitize_field( $field, $value, $group . '.' . $name );
			if ( is_wp_error( $clean ) ) {
				return $clean;
			}

			$mods[ $field['mod'] ] = $clean;
		}

		return $mods;
	}

	/**
	 * Validate one value and convert it to its stored form.
	 *
	 * @param array<mixed> $field Field definition.
	 * @param mixed        $value Input value.
	 * @param string       $path  Input path, for error messages.
	 * @return mixed|WP_Error
	 */
	private static function sanitize_field( array $field, $value, $path ) {
		$invalid = new WP_Error(
			'reme_ability_invalid_value',
			/* translators: %s: input field name */
			sprintf( __( 'Invalid value for "%s".', 'reme' ), $path ),
			array( 'status' => 400 )
		);

		switch ( $field['type'] ) {
			case 'enum':
				if ( ! is_string( $value ) || ! in_array( $value, $field['choices'], true ) ) {
					return $invalid;
				}

				return isset( $field['stored'][ $value ] ) ? $field['stored'][ $value ] : $value;
			case 'bool':
				return (bool) $value;
			case 'int':
				if ( ! is_numeric( $value ) || (int) $value < $field['min'] || (int) $value > $field['max'] ) {
					return $invalid;
				}

				return (int) $value;
			case 'responsive_int':
				if ( ! is_array( $value ) || empty( $value ) ) {
					return $invalid;
				}

				$current = get_theme_mod( $field['mod'], '' );
				$current = is_string( $current ) ? json_decode( $current, true ) : $current;
				$current = is_array( $current ) ? $current : $field['default'];

				foreach ( $value as $device => $number ) {
					if ( ! in_array( $device, array( 'mobile', 'tablet', 'desktop' ), true ) ) {
						return $invalid;
					}
					if ( ! is_numeric( $number ) || (int) $number < $field['min'] || (int) $number > $field['max'] ) {
						return $invalid;
					}
					$current[ $device ] = (int) $number;
				}

				return wp_json_encode( $current );
			case 'order':
				if ( ! is_array( $value ) || empty( $value ) ) {
					return $invalid;
				}

				foreach ( $value as $item ) {
					if ( ! in_array( $item, $field['choices'], true ) ) {
						return $invalid;
					}
				}

				return wp_json_encode( array_values( array_unique( $value ) ) );
			default:
				if ( ! is_scalar( $value ) ) {
					return $invalid;
				}

				return sanitize_text_field( (string) $value );
		}
	}
}
