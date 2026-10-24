<?php
/**
 * The template for displaying comments.
 *
 * @package reme
 */
if ( post_password_required() ) {
	return;
}

?>

<div id="comments" class="<?php echo esc_attr( apply_filters( 'reme_comments_area_class', 'comments-area' ) ); ?>">
	<?php do_action( 'reme_do_comment_area' ); ?>
</div>
