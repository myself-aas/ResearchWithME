<?php
/**
 * Home starter content for ResearchWith.me.
 *
 * General blog layout: hero, featured post, site stats, and topic cards.
 *
 * @package ReMe\Compatibility\Starter_Content
 */

$check_icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
$paper_icon = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>';

$post_content = <<<'HTML'
<!-- wp:group {"align":"full","backgroundColor":"rm-site-bg","className":"folio-hero","style":{"spacing":{"padding":{"top":"100px","bottom":"90px","left":"24px","right":"24px"}}},"layout":{"type":"constrained","contentSize":"1160px"}} -->
<div class="wp-block-group alignfull folio-hero has-rm-site-bg-background-color has-background" style="padding-top:100px;padding-right:24px;padding-bottom:90px;padding-left:24px"><!-- wp:columns {"verticalAlignment":"center","style":{"spacing":{"blockGap":{"left":"48px","top":"40px"}}}} -->
<div class="wp-block-columns are-vertically-aligned-center"><!-- wp:column {"verticalAlignment":"center","width":"58%"} -->
<div class="wp-block-column is-vertically-aligned-center" style="flex-basis:58%"><!-- wp:paragraph {"textColor":"rm-secondary-accent","style":{"typography":{"fontSize":"13px","letterSpacing":"2px","textTransform":"uppercase","fontWeight":"700"},"spacing":{"margin":{"bottom":"16px"}}}} -->
<p class="has-rm-secondary-accent-color has-text-color" style="margin-bottom:16px;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Independent Publishing &amp; Analysis</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":1,"textColor":"reme-text-color","style":{"typography":{"fontSize":"52px","lineHeight":"1.1","fontWeight":"800","letterSpacing":"-1px"}}} -->
<h1 class="wp-block-heading has-reme-text-color-color has-text-color" style="font-size:52px;font-weight:800;letter-spacing:-1px;line-height:1.1">Writing and analysis across research, tech, culture and more</h1>
<!-- /wp:heading -->

<!-- wp:paragraph {"textColor":"rm-c-2","style":{"typography":{"fontSize":"18px","lineHeight":"1.7"},"spacing":{"margin":{"top":"20px","bottom":"28px"}}}} -->
<p class="has-rm-c-2-color has-text-color" style="margin-top:20px;margin-bottom:28px;font-size:18px;line-height:1.7">Original essays, field notes, and commentary. No paywalls, no trackers — just writing worth your time.</p>
<!-- /wp:paragraph -->

<!-- wp:buttons {"style":{"spacing":{"blockGap":"14px"}}} -->
<div class="wp-block-buttons"><!-- wp:button {"backgroundColor":"reme-link-color","textColor":"rm-text-dark-bg","style":{"border":{"radius":"6px"},"spacing":{"padding":{"top":"14px","right":"28px","bottom":"14px","left":"28px"}},"elements":{"link":{"color":{"text":"var:preset|color|rm-text-dark-bg"}}}}} -->
<div class="wp-block-button"><a class="wp-block-button__link has-rm-text-dark-bg-color has-reme-link-color-background-color has-text-color has-background has-link-color" href="{{home_url}}work/" style="border-radius:6px;padding-top:14px;padding-right:28px;padding-bottom:14px;padding-left:28px">Browse the archive</a></div>
<!-- /wp:button -->

<!-- wp:button {"textColor":"reme-text-color","borderColor":"rm-c-2","className":"is-style-outline folio-btn-outline","style":{"border":{"radius":"6px","width":"1px"},"spacing":{"padding":{"top":"14px","right":"28px","bottom":"14px","left":"28px"}},"elements":{"link":{"color":{"text":"var:preset|color|reme-text-color"}}}} -->
<div class="wp-block-button is-style-outline folio-btn-outline"><a class="wp-block-button__link has-reme-text-color-color has-text-color has-link-color has-border-color has-rm-c-2-border-color wp-element-button" href="{{home_url}}contact/" style="border-width:1px;border-radius:6px;padding-top:14px;padding-right:28px;padding-bottom:14px;padding-left:28px">Get in touch</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:column -->

<!-- wp:column {"verticalAlignment":"center","width":"42%"} -->
<div class="wp-block-column is-vertically-aligned-center" style="flex-basis:42%"><!-- wp:group {"style":{"spacing":{"padding":{"top":"32px","right":"32px","bottom":"32px","left":"32px"}},"border":{"radius":"12px","width":"1px","style":"solid"}},"borderColor":"rm-c-1","backgroundColor":"rm-light-bg"} -->
<div class="wp-block-group has-border-color has-rm-c-1-border-color has-rm-light-bg-background-color has-background" style="border-style:solid;border-width:1px;border-radius:12px;padding-top:32px;padding-right:32px;padding-bottom:32px;padding-left:32px"><!-- wp:paragraph {"textColor":"rm-secondary-accent","style":{"typography":{"fontSize":"12px","fontWeight":"700","textTransform":"uppercase","letterSpacing":"1.5px"},"spacing":{"margin":{"bottom":"8px"}}}} -->
<p class="has-rm-secondary-accent-color has-text-color" style="margin-bottom:8px;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">Featured post</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3,"textColor":"reme-text-color","style":{"typography":{"fontSize":"20px","lineHeight":"1.4","fontWeight":"700"},"spacing":{"margin":{"bottom":"12px"}}}} -->
<h3 class="wp-block-heading has-reme-text-color-color has-text-color" style="margin-bottom:12px;font-size:20px;font-weight:700;line-height:1.4">The Long View on Open Infrastructure</h3>
<!-- /wp:heading -->

<!-- wp:paragraph {"textColor":"rm-c-2","style":{"typography":{"fontSize":"13px"},"spacing":{"margin":{"bottom":"16px"}}}} -->
<p class="has-rm-c-2-color has-text-color" style="margin-bottom:16px;font-size:13px">Technology &bull; Oct 2026</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph {"textColor":"reme-text-color","style":{"typography":{"fontSize":"14px","lineHeight":"1.6"},"spacing":{"margin":{"bottom":"20px"}}}} -->
<p class="has-reme-text-color-color has-text-color" style="margin-bottom:20px;font-size:14px;line-height:1.6">Why public digital infrastructure needs long-term stewardship, not just venture-funded launches.</p>
<!-- /wp:paragraph -->

<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button {"backgroundColor":"rm-secondary-accent","textColor":"rm-text-dark-bg","style":{"typography":{"fontSize":"13px"},"border":{"radius":"4px"},"spacing":{"padding":{"top":"8px","right":"18px","bottom":"8px","left":"18px"}}}} -->
<div class="wp-block-button has-custom-font-size" style="font-size:13px"><a class="wp-block-button__link has-rm-text-dark-bg-color has-rm-secondary-accent-background-color has-text-color has-background" href="{{home_url}}work/" style="border-radius:4px;padding-top:8px;padding-right:18px;padding-bottom:8px;padding-left:18px">Read more &rarr;</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:group --></div>
<!-- /wp:column --></div>
<!-- /wp:columns --></div>
<!-- /wp:group -->

<!-- wp:group {"align":"full","backgroundColor":"rm-light-bg","style":{"spacing":{"padding":{"top":"60px","bottom":"60px","left":"24px","right":"24px"}}},"layout":{"type":"constrained","contentSize":"1160px"}} -->
<div class="wp-block-group alignfull has-rm-light-bg-background-color has-background" style="padding-top:60px;padding-right:24px;padding-bottom:60px;padding-left:24px"><!-- wp:columns {"style":{"spacing":{"blockGap":{"left":"32px","top":"24px"}}}} -->
<div class="wp-block-columns"><!-- wp:column {"width":"25%"} -->
<div class="wp-block-column" style="flex-basis:25%"><!-- wp:heading {"level":4,"textColor":"reme-text-color","style":{"typography":{"fontSize":"36px","fontWeight":"800"},"spacing":{"margin":{"bottom":"4px"}}}} -->
<h4 class="wp-block-heading has-reme-text-color-color has-text-color" style="margin-bottom:4px;font-size:36px;font-weight:800">500+</h4>
<!-- /wp:heading -->

<!-- wp:paragraph {"textColor":"rm-c-2","style":{"typography":{"fontSize":"14px"}}} -->
<p class="has-rm-c-2-color has-text-color" style="font-size:14px">Articles &amp; essays</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column -->

<!-- wp:column {"width":"25%"} -->
<div class="wp-block-column" style="flex-basis:25%"><!-- wp:heading {"level":4,"textColor":"reme-text-color","style":{"typography":{"fontSize":"36px","fontWeight":"800"},"spacing":{"margin":{"bottom":"4px"}}}} -->
<h4 class="wp-block-heading has-reme-text-color-color has-text-color" style="margin-bottom:4px;font-size:36px;font-weight:800">100%</h4>
<!-- /wp:heading -->

<!-- wp:paragraph {"textColor":"rm-c-2","style":{"typography":{"fontSize":"14px"}}} -->
<p class="has-rm-c-2-color has-text-color" style="font-size:14px">Free to read</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column -->

<!-- wp:column {"width":"25%"} -->
<div class="wp-block-column" style="flex-basis:25%"><!-- wp:heading {"level":4,"textColor":"reme-text-color","style":{"typography":{"fontSize":"36px","fontWeight":"800"},"spacing":{"margin":{"bottom":"4px"}}}} -->
<h4 class="wp-block-heading has-reme-text-color-color has-text-color" style="margin-bottom:4px;font-size:36px;font-weight:800">12</h4>
<!-- /wp:heading -->

<!-- wp:paragraph {"textColor":"rm-c-2","style":{"typography":{"fontSize":"14px"}}} -->
<p class="has-rm-c-2-color has-text-color" style="font-size:14px">Topics</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column -->

<!-- wp:column {"width":"25%"} -->
<div class="wp-block-column" style="flex-basis:25%"><!-- wp:heading {"level":4,"textColor":"reme-text-color","style":{"typography":{"fontSize":"36px","fontWeight":"800"},"spacing":{"margin":{"bottom":"4px"}}}} -->
<h4 class="wp-block-heading has-reme-text-color-color has-text-color" style="margin-bottom:4px;font-size:36px;font-weight:800">Weekly</h4>
<!-- /wp:heading -->

<!-- wp:paragraph {"textColor":"rm-c-2","style":{"typography":{"fontSize":"14px"}}} -->
<p class="has-rm-c-2-color has-text-color" style="font-size:14px">New posts</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column --></div>
<!-- /wp:columns --></div>
<!-- /wp:group -->

<!-- wp:group {"align":"full","backgroundColor":"rm-site-bg","style":{"spacing":{"padding":{"top":"80px","bottom":"80px","left":"24px","right":"24px"}}},"layout":{"type":"constrained","contentSize":"1160px"}} -->
<div class="wp-block-group alignfull has-rm-site-bg-background-color has-background" style="padding-top:80px;padding-right:24px;padding-bottom:80px;padding-left:24px"><!-- wp:heading {"textAlign":"center","level":2,"textColor":"reme-text-color","style":{"typography":{"fontSize":"36px","fontWeight":"800"},"spacing":{"margin":{"bottom":"12px"}}}} -->
<h2 class="wp-block-heading has-text-align-center has-reme-text-color-color has-text-color" style="margin-bottom:12px;font-size:36px;font-weight:800">Topics</h2>
<!-- /wp:heading -->

<!-- wp:paragraph {"align":"center","textColor":"rm-c-2","style":{"typography":{"fontSize":"16px"},"spacing":{"margin":{"bottom":"48px"}}}} -->
<p class="has-text-align-center has-rm-c-2-color has-text-color" style="margin-bottom:48px;font-size:16px">Notes spanning technology, science, culture, economics, and public policy.</p>
<!-- /wp:paragraph -->

<!-- wp:columns {"style":{"spacing":{"blockGap":{"left":"32px","top":"32px"}}}} -->
<div class="wp-block-columns"><!-- wp:column {"style":{"spacing":{"padding":{"top":"28px","right":"28px","bottom":"28px","left":"28px"}},"border":{"radius":"8px","width":"1px","style":"solid"}},"borderColor":"rm-c-1","backgroundColor":"rm-site-bg"} -->
<div class="wp-block-column has-border-color has-rm-c-1-border-color has-rm-site-bg-background-color has-background" style="border-style:solid;border-width:1px;border-radius:8px;padding-top:28px;padding-right:28px;padding-bottom:28px;padding-left:28px"><!-- wp:heading {"level":3,"textColor":"reme-text-color","style":{"typography":{"fontSize":"20px","fontWeight":"700"},"spacing":{"margin":{"bottom":"10px"}}}} -->
<h3 class="wp-block-heading has-reme-text-color-color has-text-color" style="margin-bottom:10px;font-size:20px;font-weight:700">Technology</h3>
<!-- /wp:heading -->

<!-- wp:paragraph {"textColor":"rm-c-2","style":{"typography":{"fontSize":"15px","lineHeight":"1.6"}}} -->
<p class="has-rm-c-2-color has-text-color" style="font-size:15px;line-height:1.6">Software, open infrastructure, and the tools that shape how we work.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column -->

<!-- wp:column {"style":{"spacing":{"padding":{"top":"28px","right":"28px","bottom":"28px","left":"28px"}},"border":{"radius":"8px","width":"1px","style":"solid"}},"borderColor":"rm-c-1","backgroundColor":"rm-site-bg"} -->
<div class="wp-block-column has-border-color has-rm-c-1-border-color has-rm-site-bg-background-color has-background" style="border-style:solid;border-width:1px;border-radius:8px;padding-top:28px;padding-right:28px;padding-bottom:28px;padding-left:28px"><!-- wp:heading {"level":3,"textColor":"reme-text-color","style":{"typography":{"fontSize":"20px","fontWeight":"700"},"spacing":{"margin":{"bottom":"10px"}}}} -->
<h3 class="wp-block-heading has-reme-text-color-color has-text-color" style="margin-bottom:10px;font-size:20px;font-weight:700">Science</h3>
<!-- /wp:heading -->

<!-- wp:paragraph {"textColor":"rm-c-2","style":{"typography":{"fontSize":"15px","lineHeight":"1.6"}}} -->
<p class="has-rm-c-2-color has-text-color" style="font-size:15px;line-height:1.6">Research notes and explainers from the natural and physical sciences.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column -->

<!-- wp:column {"style":{"spacing":{"padding":{"top":"28px","right":"28px","bottom":"28px","left":"28px"}},"border":{"radius":"8px","width":"1px","style":"solid"}},"borderColor":"rm-c-1","backgroundColor":"rm-site-bg"} -->
<div class="wp-block-column has-border-color has-rm-c-1-border-color has-rm-site-bg-background-color has-background" style="border-style:solid;border-width:1px;border-radius:8px;padding-top:28px;padding-right:28px;padding-bottom:28px;padding-left:28px"><!-- wp:heading {"level":3,"textColor":"reme-text-color","style":{"typography":{"fontSize":"20px","fontWeight":"700"},"spacing":{"margin":{"bottom":"10px"}}}} -->
<h3 class="wp-block-heading has-reme-text-color-color has-text-color" style="margin-bottom:10px;font-size:20px;font-weight:700">Environment</h3>
<!-- /wp:heading -->

<!-- wp:paragraph {"textColor":"rm-c-2","style":{"typography":{"fontSize":"15px","lineHeight":"1.6"}}} -->
<p class="has-rm-c-2-color has-text-color" style="font-size:15px;line-height:1.6">Climate, energy, and empirical policy models.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column --></div>
<!-- /wp:columns --></div>
<!-- /wp:group -->
HTML;

return [
	'post_type'    => 'page',
	'post_name'    => 'home',
	'post_title'   => _x( 'Home', 'Theme starter content', 'reme' ),
	'post_content' => str_replace(
		[ '{{theme_uri}}', '{{home_url}}' ],
		[ trailingslashit( get_template_directory_uri() ), trailingslashit( home_url() ) ],
		$post_content
	),
];
