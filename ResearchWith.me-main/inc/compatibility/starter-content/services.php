<?php
/**
 * Services starter content for ResearchWith.me.
 *
 * General services page: writing, editing, and analysis offerings.
 *
 * @package ReMe\Compatibility\Starter_Content
 */

$post_content = <<<'HTML'
<!-- wp:group {"align":"full","backgroundColor":"rm-site-bg","className":"folio-hero","style":{"spacing":{"padding":{"top":"100px","bottom":"80px","left":"24px","right":"24px"}}},"layout":{"type":"constrained","contentSize":"860px"}} -->
<div class="wp-block-group alignfull folio-hero has-rm-site-bg-background-color has-background" style="padding-top:100px;padding-right:24px;padding-bottom:80px;padding-left:24px"><!-- wp:paragraph {"align":"center","textColor":"rm-secondary-accent","style":{"typography":{"fontSize":"13px","letterSpacing":"2px","textTransform":"uppercase","fontWeight":"700"},"spacing":{"margin":{"bottom":"14px"}}}} -->
<p class="has-text-align-center has-rm-secondary-accent-color has-text-color" style="margin-bottom:14px;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Writing &amp; analysis</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"textAlign":"center","level":1,"textColor":"reme-text-color","style":{"typography":{"fontSize":"48px","lineHeight":"1.15","fontWeight":"800","letterSpacing":"-1px"}}} -->
<h1 class="wp-block-heading has-text-align-center has-reme-text-color-color has-text-color" style="font-size:48px;font-weight:800;letter-spacing:-1px;line-height:1.15">Services</h1>
<!-- /wp:heading -->

<!-- wp:paragraph {"align":"center","textColor":"rm-c-2","style":{"typography":{"fontSize":"18px","lineHeight":"1.7"},"spacing":{"margin":{"top":"20px"}}}} -->
<p class="has-text-align-center has-rm-c-2-color has-text-color" style="margin-top:20px;font-size:18px;line-height:1.7">Independent writing, research, and editorial services for teams working in public.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group -->

<!-- wp:group {"align":"full","backgroundColor":"rm-light-bg","style":{"spacing":{"padding":{"top":"80px","bottom":"80px","left":"24px","right":"24px"}}},"layout":{"type":"constrained","contentSize":"1160px"}} -->
<div class="wp-block-group alignfull has-rm-light-bg-background-color has-background" style="padding-top:80px;padding-right:24px;padding-bottom:80px;padding-left:24px"><!-- wp:heading {"textAlign":"center","level":2,"textColor":"reme-text-color","style":{"typography":{"fontSize":"36px","fontWeight":"800"},"spacing":{"margin":{"bottom":"12px"}}}} -->
<h2 class="wp-block-heading has-text-align-center has-reme-text-color-color has-text-color" style="margin-bottom:12px;font-size:36px;font-weight:800">What we offer</h2>
<!-- /wp:heading -->

<!-- wp:columns {"style":{"spacing":{"blockGap":{"left":"32px","top":"32px"}}}} -->
<div class="wp-block-columns"><!-- wp:column {"style":{"spacing":{"padding":{"top":"32px","right":"28px","bottom":"32px","left":"28px"}},"border":{"radius":"8px"}},"backgroundColor":"rm-site-bg"} -->
<div class="wp-block-column has-rm-site-bg-background-color has-background" style="border-radius:8px;padding-top:32px;padding-right:28px;padding-bottom:32px;padding-left:28px"><!-- wp:heading {"level":3,"textColor":"reme-text-color","style":{"typography":{"fontSize":"20px","fontWeight":"700"},"spacing":{"margin":{"bottom":"10px"}}}} -->
<h3 class="wp-block-heading has-reme-text-color-color has-text-color" style="margin-bottom:10px;font-size:20px;font-weight:700">1. Essays &amp; explainers</h3>
<!-- /wp:heading -->

<!-- wp:paragraph {"textColor":"rm-c-2","style":{"typography":{"fontSize":"15px","lineHeight":"1.6"}}} -->
<p class="has-rm-c-2-color has-text-color" style="font-size:15px;line-height:1.6">Long-form writing that translates technical work for broader audiences, with sources linked throughout.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column -->

<!-- wp:column {"style":{"spacing":{"padding":{"top":"32px","right":"28px","bottom":"32px","left":"28px"}},"border":{"radius":"8px"}},"backgroundColor":"rm-site-bg"} -->
<div class="wp-block-column has-rm-site-bg-background-color has-background" style="border-radius:8px;padding-top:32px;padding-right:28px;padding-bottom:32px;padding-left:28px"><!-- wp:heading {"level":3,"textColor":"reme-text-color","style":{"typography":{"fontSize":"20px","fontWeight":"700"},"spacing":{"margin":{"bottom":"10px"}}}} -->
<h3 class="wp-block-heading has-reme-text-color-color has-text-color" style="margin-bottom:10px;font-size:20px;font-weight:700">2. Research &amp; field notes</h3>
<!-- /wp:heading -->

<!-- wp:paragraph {"textColor":"rm-c-2","style":{"typography":{"fontSize":"15px","lineHeight":"1.6"}}} -->
<p class="has-rm-c-2-color has-text-color" style="font-size:15px;line-height:1.6">On-the-ground reporting from research sites, conferences, and fieldwork, published as notes and photo essays.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column -->

<!-- wp:column {"style":{"spacing":{"padding":{"top":"32px","right":"28px","bottom":"32px","left":"28px"}},"border":{"radius":"8px"}},"backgroundColor":"rm-site-bg"} -->
<div class="wp-block-column has-rm-site-bg-background-color has-background" style="border-radius:8px;padding-top:32px;padding-right:28px;padding-bottom:32px;padding-left:28px"><!-- wp:heading {"level":3,"textColor":"reme-text-color","style":{"typography":{"fontSize":"20px","fontWeight":"700"},"spacing":{"margin":{"bottom":"10px"}}}} -->
<h3 class="wp-block-heading has-reme-text-color-color has-text-color" style="margin-bottom:10px;font-size:20px;font-weight:700">3. Editorial review</h3>
<!-- /wp:heading -->

<!-- wp:paragraph {"textColor":"rm-c-2","style":{"typography":{"fontSize":"15px","lineHeight":"1.6"}}} -->
<p class="has-rm-c-2-color has-text-color" style="font-size:15px;line-height:1.6">Fact-checking, copyediting, and structure reviews for teams publishing in public.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column --></div>
<!-- /wp:columns --></div>
<!-- /wp:group -->
HTML;

return [
	'post_type'    => 'page',
	'post_name'    => 'services',
	'post_title'   => _x( 'Services', 'Theme starter content', 'reme' ),
	'post_content' => str_replace(
		[ '{{theme_uri}}', '{{home_url}}' ],
		[ trailingslashit( get_template_directory_uri() ), trailingslashit( home_url() ) ],
		$post_content
	),
];
