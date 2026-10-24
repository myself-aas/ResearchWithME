<?php
/**
 * File Embed block render callback.
 *
 * @package ReMe
 */

defined( 'ABSPATH' ) || exit;

/**
 * Renders the reme/file-embed block.
 *
 * @param array $attributes Block attributes.
 * @param string $content Block content.
 * @return string Rendered block HTML.
 */
function reme_render_file_embed( $attributes, $content ) {
	$file_url   = ! empty( $attributes['fileUrl'] ) ? $attributes['fileUrl'] : '';
	$width      = ! empty( $attributes['width'] ) ? $attributes['width'] : '100%';
	$height     = ! empty( $attributes['height'] ) ? $attributes['height'] : '600px';
	$show_download = ! empty( $attributes['showDownload'] );

	if ( ! $file_url ) {
		return '<p>' . esc_html__( 'No file URL specified.', 'reme' ) . '</p>';
	}

	$file_url = esc_url( $file_url );
	$title    = esc_html__( 'Document', 'reme' );

	$output = '<div class="reme-file-embed" style="width:' . esc_attr( $width ) . ';">';
	$output .= '<iframe src="' . $file_url . '#view=FitH" width="' . esc_attr( $width ) . '" height="' . esc_attr( $height ) . '" style="border:none;" title="' . $title . '"></iframe>';

	if ( $show_download ) {
		$output .= '<p class="reme-file-download-link"><a href="' . $file_url . '">' . esc_html__( 'Open file', 'reme' ) . '</a></p>';
	}

	$output .= '</div>';

	return $output;
}
