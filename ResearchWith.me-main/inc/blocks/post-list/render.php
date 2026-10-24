<?php
/**
 * Post List block render callback.
 *
 * @package ReMe
 */

defined( 'ABSPATH' ) || exit;

/**
 * Renders the reme/post-list block.
 *
 * @param array $attributes Block attributes.
 * @param string $content Block content.
 * @return string Rendered block HTML.
 */
function reme_render_post_list( $attributes, $content ) {
	$post_type   = ! empty( $attributes['postType'] ) ? $attributes['postType'] : 'post';
	$author      = ! empty( $attributes['author'] ) ? $attributes['author'] : '';
	$category    = ! empty( $attributes['category'] ) ? $attributes['category'] : '';
	$tag         = ! empty( $attributes['tag'] ) ? $attributes['tag'] : '';
	$per_page    = ! empty( $attributes['postsPerPage'] ) ? (int) $attributes['postsPerPage'] : 6;
	$show_excerpt = ! empty( $attributes['showExcerpt'] );
	$show_date   = ! empty( $attributes['showDate'] );
	$show_authors = ! empty( $attributes['showAuthors'] );

	$query_args = array(
		'post_type'      => $post_type,
		'post_status'    => 'publish',
		'posts_per_page' => $per_page,
		'orderby'        => 'date',
		'order'          => 'DESC',
		'no_found_rows'  => true,
	);

	if ( $author ) {
		$query_args['author_name'] = $author;
	}

	if ( $category ) {
		$query_args['category_name'] = $category;
	}

	if ( $tag ) {
		$query_args['tag'] = $tag;
	}

	$query = new \WP_Query( $query_args );

	if ( ! $query->have_posts() ) {
		return '<p>' . esc_html__( 'No posts found.', 'reme' ) . '</p>';
	}

	$output = '<div class="reme-post-list">';
	$output .= '<div class="reme-post-list-grid">';

	while ( $query->have_posts() ) {
		$query->the_post();

		$output .= '<article class="reme-post-list-item">';
		$output .= '<h3 class="reme-post-list-title"><a href="' . esc_url( get_permalink() ) . '">' . wp_kses_post( get_the_title() ) . '</a></h3>';

		if ( $show_authors ) {
			$authors = get_the_author();
			if ( $authors ) {
				$output .= '<p class="reme-post-list-authors">' . esc_html( $authors ) . '</p>';
			}
		}

		if ( $show_date ) {
			$output .= '<p class="reme-post-list-date"><time datetime="' . esc_attr( get_the_date( DATE_W3C ) ) . '">' . esc_html( get_the_date() ) . '</time></p>';
		}

		if ( $show_excerpt ) {
			$output .= '<div class="reme-post-list-excerpt">' . get_the_excerpt() . '</div>';
		}

		$output .= '<a class="reme-post-list-link" href="' . esc_url( get_permalink() ) . '">' . esc_html__( 'Read more', 'reme' ) . '</a>';
		$output .= '</article>';
	}

	wp_reset_postdata();

	$output .= '</div>';
	$output .= '</div>';

	return $output;
}
