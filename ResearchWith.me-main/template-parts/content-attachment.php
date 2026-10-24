<?php
/**
 * Template part for displaying a media attachment.
 *
 * @package ReMe
 * @since   1.0.0
 */

$attachment_id = get_the_ID();
$attachment_url = wp_get_attachment_url( $attachment_id );
$attachment_mime = get_post_mime_type( $attachment_id );
?>

<article id="post-<?php echo esc_attr( $attachment_id ); ?>"
	class="<?php echo esc_attr( join( ' ', get_post_class( 'reme-single-attachment' ) ) ); ?>">

	<header class="entry-header">
		<h1 class="title entry-title"><?php echo wp_kses_post( get_the_title() ); ?></h1>
	</header>

	<div class="entry-content">
		<?php
		if ( str_starts_with( $attachment_mime, 'image/' ) ) :
			?>
			<div class="reme-attachment-image">
				<img src="<?php echo esc_url( $attachment_url ); ?>" alt="<?php echo esc_attr( get_the_title( $attachment_id ) ); ?>" />
			</div>
			<?php
		elseif ( str_starts_with( $attachment_mime, 'application/pdf' ) ) :
			?>
			<div class="reme-attachment-pdf">
				<iframe src="<?php echo esc_url( $attachment_url ); ?>#view=FitH" width="100%" height="600" style="border:none;" title="<?php echo esc_attr( get_the_title( $attachment_id ) ); ?>"></iframe>
				<p class="reme-attachment-download"><a href="<?php echo esc_url( $attachment_url ); ?>" download><?php esc_html_e( 'Download PDF', 'reme' ); ?></a></p>
			</div>
			<?php
		else :
			?>
			<div class="reme-attachment-file">
				<a href="<?php echo esc_url( $attachment_url ); ?>" download><?php echo esc_html( get_the_title( $attachment_id ) ); ?></a>
			</div>
			<?php
		endif;

		if ( ! empty( get_post_field( 'post_content', $attachment_id ) ) ) :
			the_content();
		endif;
		?>
	</div>

</article>
