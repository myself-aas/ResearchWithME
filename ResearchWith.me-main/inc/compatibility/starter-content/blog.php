<?php
/**
 * Blog starter content for ResearchWith.me.
 *
 * General blog landing page: latest articles introduction.
 *
 * @package ReMe\Compatibility\Starter_Content
 */

$post_content = <<<'HTML'
<!-- wp:group {"align":"full","backgroundColor":"rm-site-bg","style":{"spacing":{"padding":{"top":"80px","bottom":"80px","left":"24px","right":"24px"}}},"layout":{"type":"constrained","contentSize":"840px"}} -->
<div class="wp-block-group alignfull has-rm-site-bg-background-color has-background" style="padding-top:80px;padding-right:24px;padding-bottom:80px;padding-left:24px"><!-- wp:heading {"textAlign":"center","level":1,"textColor":"reme-text-color","style":{"typography":{"fontSize":"42px","fontWeight":"800"}},"spacing":{"margin":{"bottom":"16px"}}} -->
<h1 class="wp-block-heading has-text-align-center has-reme-text-color-color has-text-color" style="margin-bottom:16px;font-size:42px;font-weight:800">Latest articles</h1>
<!-- /wp:heading -->

<!-- wp:paragraph {"align":"center","textColor":"rm-c-2","style":{"typography":{"fontSize":"18px","lineHeight":"1.7"}}} -->
<p class="has-text-align-center has-rm-c-2-color has-text-color" style="font-size:18px;line-height:1.7">Notes, essays, and field reports from research, technology, science, culture, and public policy.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group -->
HTML;

return [
	'post_type'    => 'page',
	'post_name'    => 'blog',
	'post_title'   => _x( 'Blog', 'Theme starter content', 'reme' ),
	'post_content' => str_replace(
		[ '{{theme_uri}}', '{{home_url}}' ],
		[ trailingslashit( get_template_directory_uri() ), trailingslashit( home_url() ) ],
		$post_content
	),
];
