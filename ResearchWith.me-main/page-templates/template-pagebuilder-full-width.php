<?php
/**
 * Template Name: Page Builder Full Width (ReMe)
 *
 * The template for the page builder full-width.
 *
 * It contains header, footer and 100% content width.
 *
 * @package ReMe
 */
add_action(
	'body_class',
	function ( $class ) {
		$class[] = 'rm-template';
		return $class;
	}
);

get_header();
if ( have_posts() ) {
	while ( have_posts() ) {
		the_post();
		get_template_part( 'template-parts/content', 'pagebuilder' );
	}
}
get_footer();
