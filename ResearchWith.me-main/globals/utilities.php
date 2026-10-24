<?php
/**
 * Author:          Andrei Baicus <andrei@themeisle.com>
 * Created on:      17/10/2018
 *
 * @package utilities.php
 */

use HFG\Core\Components\Utility\SearchIconButton;

/**
 * Check if we're delivering AMP
 *
 * Function(is_amp_endpoint) is deprecated since AMP v2.0, use amp_is_request instead of it since v2.0
 *
 * @return bool
 */
function reme_is_amp() {
	return ( function_exists( 'amp_is_request' ) && amp_is_request() ) || ( function_exists( 'is_amp_endpoint' ) && is_amp_endpoint() );
}

/**
 * Show body attrs.
 */
function reme_body_attrs() {
	$body_attrs = apply_filters( 'reme_body_data_attrs', 'id="reme_body" ' );
	echo( $body_attrs ); //phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
}

/**
 * Get hooks by location
 *
 * @return array $hooks - hooks locations and name
 */
function reme_hooks() {

	$hooks = array(
		'header'     => array(
			'reme_html_start_before',
			'reme_head_start_after',
			'reme_head_end_before',
			'reme_body_start_after',
			'reme_before_header_hook',
			'reme_before_header_wrapper_hook',
			'reme_after_header_hook',
			'reme_after_header_wrapper_hook',
			'reme_before_mobile_menu_content',
			'reme_after_mobile_menu_content',
		),
		'footer'     => array(
			'reme_before_footer_hook',
			'reme_after_footer_hook',
			'reme_body_end_before',
		),
		'post'       => array(
			'reme_before_post_content',
			'reme_after_post_content',
		),
		'page'       => array(
			'reme_before_page_header',
			'reme_before_page_comments',
		),
		'single'     => array(
			'reme_before_content',
			'reme_after_content',
		),
		'sidebar'    => array(
			'reme_before_sidebar_content',
			'reme_after_sidebar_content',
		),
		'blog'       => array(
			'reme_before_loop',
			'reme_before_posts_loop',
			'reme_after_posts_loop',
			'reme_loop_entry_before',
			'reme_loop_entry_after',
			'reme_middle_posts_loop',
		),
		'pagination' => array(
			'reme_before_pagination',
		),
	);

	$hooks['download-archive'] = array(
		'reme_before_download_archive',
		'reme_after_download_archive',
	);

	$hooks['single-download'] = array(
		'reme_before_download_content',
		'reme_after_download_content',
	);

	return apply_filters( 'reme_hooks_list', $hooks );
}

/**
 * Cart icon markup.
 *
 * @param bool   $echo should be echoed.
 * @param int    $size icon size.
 * @param string $cart_icon Cart icon.
 *
 * @return string|null
 */
function reme_cart_icon( $echo = false, $size = 15, $cart_icon = '', $icon_custom = '' ) {
	$icon = '<svg width="' . $size . '" height="' . $size . '" viewBox="0 0 1792 1792" xmlns="http://www.w3.org/2000/svg"><path d="M704 1536q0 52-38 90t-90 38-90-38-38-90 38-90 90-38 90 38 38 90zm896 0q0 52-38 90t-90 38-90-38-38-90 38-90 90-38 90 38 38 90zm128-1088v512q0 24-16.5 42.5t-40.5 21.5l-1044 122q13 60 13 70 0 16-24 64h920q26 0 45 19t19 45-19 45-45 19h-1024q-26 0-45-19t-19-45q0-11 8-31.5t16-36 21.5-40 15.5-29.5l-177-823h-204q-26 0-45-19t-19-45 19-45 45-19h256q16 0 28.5 6.5t19.5 15.5 13 24.5 8 26 5.5 29.5 4.5 26h1201q26 0 45 19t19 45z"/></svg>';
	if ( $cart_icon === 'custom' ) {
		$icon = reme_kses_svg( $icon_custom );
	}

	$svg = '<span class="rm-icon rm-cart">' . $icon . '</span>';
	if ( $echo === false ) {
		return $svg;
	}
	echo( $svg ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	return null;
}

/**
 * Search Icon
 *
 * @param bool         $is_link should be wrapped in A tag.
 * @param bool         $echo should be echoed.
 * @param int          $size icon size.
 * @param bool         $amp_ready Should we add the AMP binding.
 * @param false|string $context Represents where the search icon is being used.
 *
 * @return string|null
 */
function reme_search_icon( $is_link = false, $echo = false, $size = 15, $amp_ready = false, $context = false ) {

	$icon_type = SearchIconButton::DEFAULT_ICON;

	if ( $context === 'hfg' ) {
		$hfg_icon_type = \HFG\component_setting( SearchIconButton::ICON_TYPE, SearchIconButton::DEFAULT_ICON );

		// For the possibility of \HFG\current_component returning false
		if ( $hfg_icon_type !== false ) {
			$icon_type = $hfg_icon_type;
		}
	}

	if ( $icon_type === SearchIconButton::CUSTOM_ICON ) {
		$svg = \HFG\component_setting( SearchIconButton::CUSTOM_ICON_SVG, SearchIconButton::DEFAULT_CUSTOM_ICON_SVG );
	} else {
		$svg = SearchIconButton::render_icon( $icon_type, $size );
	}

	$amp_state = '';
	if ( $amp_ready ) {
		$amp_state = 'on="tap:AMP.setState({visible: !visible})"' . ( $is_link ? '' : ' role="button"' ) . ' ';
	}
	// The icon is decorative — the wrapping control carries the name.
	if ( strpos( $svg, 'aria-hidden' ) === false ) {
		$svg = preg_replace( '/<svg /', '<svg aria-hidden="true" focusable="false" ', $svg, 1 );
	}
	// The trigger opens/closes the search dropdown: a real button with
	// the disclosure state, not a hash link.
	$start_tag = $is_link ? 'button type="button" aria-label="' . esc_attr__( 'Search', 'reme' ) . '" aria-expanded="false"' : 'span';
	$end_tag   = $is_link ? 'button' : 'span';
	$output    = '<' . $start_tag . ' class="rm-icon rm-search" ' . $amp_state . '>
				' . reme_kses_svg( $svg ) . '
			</' . $end_tag . '>';
	if ( $echo === false ) {
		return $output;
	}
	echo $output; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	return null;
}

/**
 *  Escape HTML strings containing SVG.
 *
 * @param string $input the input string.
 * @param array  $additional_args additional allowed.
 *
 * @return string
 */
function reme_custom_kses_escape( $input, $additional_args ) {
	$kses_defaults = wp_kses_allowed_html( 'post' );
	$allowed_tags  = array_merge( $kses_defaults, $additional_args );

	return wp_kses( $input, $allowed_tags );
}

/**
 * Get allowed tags for SVG tags.
 *
 * @return array
 */
function reme_get_svg_allowed_tags() {
	return array(
		'svg'      => array(
			'class'           => true,
			'aria-hidden'     => true,
			'aria-labelledby' => true,
			'role'            => true,
			'xmlns'           => true,
			'width'           => true,
			'fill'            => true,
			'fill-opacity'    => true,
			'height'          => true,
			'stroke'          => true,
			'viewbox'         => true, // <= Must be lower case!
		),
		'style'    => array(
			'type' => true,
		),
		'g'        => array(
			'fill'            => true,
			'transform'       => true,
			'style'           => true,
			'stroke'          => true,
			'stroke-linecap'  => true,
			'stroke-linejoin' => true,
			'stroke-width'    => true,
		),
		'circle'   => array(
			'cx'        => true,
			'cy'        => true,
			'r'         => true,
			'class'     => true,
			'style'     => true,
			'transform' => true,
		),
		'title'    => array( 'title' => true ),
		'path'     => array(
			'd'               => true,
			'fill'            => true,
			'fill-rule'       => true,
			'clip-rule'       => true,
			'style'           => true,
			'class'           => true,
			'transform'       => true,
			'stroke'          => true,
			'stroke-linecap'  => true,
			'stroke-linejoin' => true,
			'stroke-width'    => true,
		),
		'polyline' => array(
			'fill'            => true,
			'stroke'          => true,
			'stroke-linecap'  => true,
			'stroke-linejoin' => true,
			'stroke-width'    => true,
			'points'          => true,
		),
		'polygon'  => array(
			'class'     => true,
			'points'    => true,
			'style'     => true,
			'transform' => true,
		),
		'rect'     => array(
			'x'         => true,
			'y'         => true,
			'rx'        => true,
			'ry'        => true,
			'width'     => true,
			'height'    => true,
			'class'     => true,
			'style'     => true,
			'transform' => true,
		),
	);
}

/**
 * Escape SVG.
 *
 * @param string $input input string to escape.
 *
 * @return string
 */
function reme_kses_svg( $input ) {
	$svg_args = reme_get_svg_allowed_tags();

	return reme_custom_kses_escape( $input, $svg_args );
}

/**
 * Get standard fonts
 *
 * @param bool $with_variants should fetch variants.
 *
 * @return array
 */
function reme_get_standard_fonts( $with_variants = false ) {
	$fonts = array(
		'Arial, Helvetica, sans-serif'                     => array( '400', '700', '400italic', '700italic' ),
		'Arial Black, Gadget, sans-serif'                  => array( '900', '900italic' ),
		'Bookman Old Style, serif'                         => array( '400', '700', '400italic', '700italic' ),
		'Comic Sans MS, cursive'                           => array( '400', '700', '400italic', '700italic' ),
		'Courier, monospace'                               => array( '400', '700', '400italic', '700italic' ),
		'Georgia, serif'                                   => array( '400', '700', '400italic', '700italic' ),
		'Garamond, serif'                                  => array( '400', '700', '400italic', '700italic' ),
		'Impact, Charcoal, sans-serif'                     => array( '400', '700', '400italic', '700italic' ),
		'Lucida Console, Monaco, monospace'                => array( '400', '700', '400italic', '700italic' ),
		'Lucida Sans Unicode, Lucida Grande, sans-serif'   => array( '400', '700', '400italic', '700italic' ),
		'MS Sans Serif, Geneva, sans-serif'                => array( '400', '700', '400italic', '700italic' ),
		'MS Serif, New York, sans-serif'                   => array( '400', '700', '400italic', '700italic' ),
		'Palatino Linotype, Book Antiqua, Palatino, serif' => array( '400', '700', '400italic', '700italic' ),
		'Tahoma, Geneva, sans-serif'                       => array( '400', '700', '400italic', '700italic' ),
		'Times New Roman, Times, serif'                    => array( '400', '700', '400italic', '700italic' ),
		'Trebuchet MS, Helvetica, sans-serif'              => array( '400', '700', '400italic', '700italic' ),
		'Verdana, Geneva, sans-serif'                      => array( '400', '700', '400italic', '700italic' ),
		'Paratina Linotype'                                => array( '400', '700', '400italic', '700italic' ),
		'Trebuchet MS'                                     => array( '400', '700', '400italic', '700italic' ),
	);

	if ( $with_variants ) {
		return apply_filters( 'reme_standard_fonts_with_variants_array', $fonts );
	}

	return apply_filters( 'reme_standard_fonts_array', array_keys( $fonts ) );
}

/**
 * Include a PHP file that returns an array, tolerating its absence.
 *
 * @param string  $path     Absolute path to the file.
 * @param mixed[] $fallback Value to return when the file cannot be used.
 *
 * @return mixed[]
 */
function reme_require_array( $path, $fallback = array() ) {
	if ( ! is_file( $path ) || ! is_readable( $path ) ) {
		return $fallback;
	}

	$value = include $path;

	return is_array( $value ) ? $value : $fallback;
}

/**
 * Get asset meta from a generated asset file.
 *
 * @param string $path Absolute path to the generated asset file.
 *
 * @return mixed[]
 */
function reme_get_asset_meta( $path ) {
	$meta = reme_require_array( $path );

	if ( ! isset( $meta['dependencies'] ) || ! is_array( $meta['dependencies'] ) ) {
		$meta['dependencies'] = array();
	}

	if ( ! isset( $meta['version'] ) ) {
		$meta['version'] = REME_VERSION;
	}

	return $meta;
}

/**
 * Get all google fonts
 *
 * @param bool $with_variants should fetch variants.
 *
 * @return array
 */
function reme_get_google_fonts( $with_variants = false ) {
	$fonts = reme_require_array( REME_MAIN_DIR . 'globals/google-fonts.php' );

	if ( $with_variants ) {
		$fonts = apply_filters( 'reme_google_fonts_with_variants_array', $fonts );

		return is_array( $fonts ) ? $fonts : array();
	}

	return apply_filters( 'reme_google_fonts_array', array_keys( $fonts ) );
}

/**
 * Get the heading selectors array.
 *
 * @return array
 */
function reme_get_headings_selectors() {
	return apply_filters(
		'reme_headings_typeface_selectors',
		array(
			'h1' => \ReMe\Core\Settings\Config::$css_selectors_map[ \ReMe\Core\Settings\Config::CSS_SELECTOR_TYPEFACE_H1 ],
			'h2' => \ReMe\Core\Settings\Config::$css_selectors_map[ \ReMe\Core\Settings\Config::CSS_SELECTOR_TYPEFACE_H2 ],
			'h3' => \ReMe\Core\Settings\Config::$css_selectors_map[ \ReMe\Core\Settings\Config::CSS_SELECTOR_TYPEFACE_H3 ],
			'h4' => \ReMe\Core\Settings\Config::$css_selectors_map[ \ReMe\Core\Settings\Config::CSS_SELECTOR_TYPEFACE_H4 ],
			'h5' => \ReMe\Core\Settings\Config::$css_selectors_map[ \ReMe\Core\Settings\Config::CSS_SELECTOR_TYPEFACE_H5 ],
			'h6' => \ReMe\Core\Settings\Config::$css_selectors_map[ \ReMe\Core\Settings\Config::CSS_SELECTOR_TYPEFACE_H6 ],
		)
	);
}

/**
 * Get Global Colors Default
 *
 * @param bool $migrated get with migrated colors.
 *
 * @return array
 */
function reme_get_global_colors_default( $migrated = false ) {
	return [
		'activePalette' => 'base',
		'palettes'      => [
			'base'     => [
				'name'          => __( 'Base', 'reme' ),
				'allowDeletion' => false,
				'colors'        => [
					'rm-primary-accent'   => '#2f5aae',
					// Hover accent: darker than the primary so hover states
					// are perceivable; 8.9:1 on the site background.
					'rm-secondary-accent' => '#24478c',
					'rm-site-bg'          => '#ffffff',
					'rm-light-bg'         => '#f4f5f7',
					'rm-dark-bg'          => '#121212',
					'rm-text-color'       => '#272626',
					'rm-text-dark-bg'     => '#ffffff',
					// >= 4.5:1 on both rm-site-bg and rm-light-bg (the old
					// values sat at exactly 4.51:1 on white and failed on
					// the light background).
					'rm-c-1'              => '#824c9e',
					'rm-c-2'              => '#a4423a',
				],
			],
			'darkMode' => [
				'name'          => __( 'Dark Mode', 'reme' ),
				'allowDeletion' => false,
				'colors'        => [
					'rm-primary-accent'   => '#00c2ff',
					// Hover accent: lighter than the primary; 11.5:1 on the
					// dark site background.
					'rm-secondary-accent' => '#66d9ff',
					'rm-site-bg'          => '#121212',
					'rm-light-bg'         => '#1a1a1a',
					'rm-dark-bg'          => '#000000',
					'rm-text-color'       => '#ffffff',
					'rm-text-dark-bg'     => '#ffffff',
					// >= 4.5:1 on the dark site background (old values were
					// 4.1:1 and 4.2:1).
					'rm-c-1'              => '#1fa869',
					'rm-c-2'              => '#cd6d61',
				],
			],
		],
	];
}

/**
 * Checks that we are using the new builder.
 *
 * @return bool
 * @since 3.0.0
 */
function reme_is_new_builder() {
	return get_theme_mod( 'reme_migrated_builders', true );
}

/**
 * Checks that we are using the new skin.
 *
 * @return bool
 * @since 3.0.0
 */
function reme_is_new_skin() {
	return get_theme_mod( 'reme_new_skin', 'new' ) !== 'old';
}

/**
 * Checks if the instance was auto upgraded to the new skin.
 * It is used to allow rollback for auto-upgraded instances.
 *
 * @return bool
 * @since 3.6.x
 */
function reme_was_auto_migrated_to_new() {
	return get_theme_mod( 'reme_auto_migrated_to_new_skin', false );
}

/**
 * Check that we had old builder.
 *
 * @return bool
 * @since 3.0.0
 */
function reme_had_old_hfb() {
	return ( get_theme_mod( 'hfg_header_layout' ) !== false || get_theme_mod( 'hfg_footer_layout' ) ) !== false;
}

/**
 * Check that if new widget editor is available.
 *
 * @return bool
 * @since 3.0.0
 */
function reme_is_new_widget_editor() {
	return ( defined( 'GUTENBERG_VERSION' ) && version_compare( GUTENBERG_VERSION, '10.6.2', '>' ) ) || version_compare( substr( get_bloginfo( 'version' ), 0, 3 ), '5.8', '>=' );
}

/**
 * Check that the active WordPress version is greater than the passed value.
 *
 * @param string $version The default check is for `5.8` other values are accepted.
 *
 * @return bool
 * @since 3.0.5
 */
function reme_is_using_wp_version( $version = '5.8' ) {
	global $wp_version;
	return version_compare( $wp_version, $version, '>=' );
}

/**
 * Create pagination for Easy Digital Downloads Archive.
 */
function reme_edd_download_nav() {

	global $wp_query;

	$big          = 999999;
	$search_for   = array( $big, '#038;' );
	$replace_with = array( '%#%', '&' );

	$allowed_tags = array(
		'ul'   => array(
			'class' => array(),
		),
		'li'   => array(
			'class' => array(),
		),
		'a'    => array(
			'class' => array(),
			'href'  => array(),
		),
		'span' => array(
			'class' => array(),
		),
	);

	$pagination = paginate_links(
		array(
			'base'      => str_replace( $search_for, $replace_with, get_pagenum_link( $big ) ),
			'format'    => '?paged=%#%',
			'current'   => max( 1, get_query_var( 'paged' ) ),
			'total'     => $wp_query->max_num_pages,
			'prev_next' => true,
		)
	);
	?>

	<div id="edd_download_pagination" class="navigation">
		<?php
		echo wp_kses( $pagination, $allowed_tags );
		// TODO use pagination from pluggable class once we have infinite scroll supported for edd.
		?>
	</div>

	<?php

}

/**
 * Check if a value is of unknown type is zero.
 *
 * @param mixed $value Value to check.
 *
 * @return bool
 */
function reme_value_is_zero( $value ) {
	return floatval( $value ) === 0.0;
}


/**
 * Function that is called for triggering hooks on index.
 *
 * @param string $position Hook position.
 */
function reme_do_loop_hook( $position ) {
	if ( ! in_array( $position, [ 'before', 'after', 'entry_before', 'entry_after' ] ) ) {
		return;
	}

	$current_post_type = get_post_type();
	if ( in_array( $current_post_type, array( 'post', 'page', 'product' ), true ) ) {
		return;
	}

	/**
	 * Executes actions on archives.
	 *
	 * The dynamic portion of the hook name, $current_post_type, refers to the post type slug.
	 * The dynamic portion of the hook name, $position, refers to the hook placement. The accepted values are 'before'
	 * ,'after', 'entry_before' and 'entry_after'.
	 * This hook is not available for the following post types: post, page, product.
	 *
	 * Possible action names include:
	 * - reme_loop_attachment_before
	 * - reme_loop_acme_product_before
	 *
	 * @since 2.11
	 */
	do_action( "reme_loop_{$current_post_type}_{$position}" );
}

/**
 * Get meta default data
 *
 * @param string $field Meta field name.
 * @param string $default Default value.
 *
 * @return array
 */
function reme_get_default_meta_value( $field, $default ) {
	$new_control_data = [];

	$components = apply_filters(
		'reme_meta_filter',
		[
			'author'   => __( 'Author', 'reme' ),
			'category' => __( 'Category', 'reme' ),
			'date'     => __( 'Date', 'reme' ),
			'comments' => __( 'Comments', 'reme' ),
		]
	);

	$default_data = get_theme_mod( $field, $default );

	if ( is_string( $default_data ) ) {
		$default_data = json_decode( $default_data, true );
	}

	if ( ! is_array( $default_data ) ) {
		$default_data = [];
	}

	foreach ( $default_data as $meta_component ) {
		if ( array_key_exists( $meta_component, $components ) ) {
			$new_control_data[ $meta_component ] = (object) [
				'slug'           => $meta_component,
				'title'          => $components[ $meta_component ],
				'visibility'     => 'yes',
				'hide_on_mobile' => false,
				'blocked'        => 'yes',
			];
		}
	}

	foreach ( $components as $component_id => $label ) {
		if ( ! array_key_exists( $component_id, $new_control_data ) ) {
			$new_control_data[ $component_id ] = (object) [
				'slug'           => $component_id,
				'title'          => $label,
				'visibility'     => 'no',
				'hide_on_mobile' => false,
				'blocked'        => 'yes',
			];
		}
	}

	return array_values( $new_control_data );
}
