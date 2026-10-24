<?php
/**
 * Contact starter content for ResearchWith.me.
 *
 * General contact page: how to reach the publisher and corrections policy.
 *
 * @package ReMe\Compatibility\Starter_Content
 */

$post_content = <<<'HTML'
<!-- wp:group {"align":"full","backgroundColor":"rm-site-bg","className":"folio-hero","style":{"spacing":{"padding":{"top":"100px","bottom":"80px","left":"24px","right":"24px"}}},"layout":{"type":"constrained","contentSize":"860px"}} -->
<div class="wp-block-group alignfull folio-hero has-rm-site-bg-background-color has-background" style="padding-top:100px;padding-right:24px;padding-bottom:80px;padding-left:24px"><!-- wp:paragraph {"align":"center","textColor":"rm-secondary-accent","style":{"typography":{"fontSize":"13px","letterSpacing":"2px","textTransform":"uppercase","fontWeight":"700"},"spacing":{"margin":{"bottom":"14px"}}}} -->
<p class="has-text-align-center has-rm-secondary-accent-color has-text-color" style="margin-bottom:14px;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Editorial office &amp; inquiries</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"textAlign":"center","level":1,"textColor":"reme-text-color","style":{"typography":{"fontSize":"48px","lineHeight":"1.15","fontWeight":"800","letterSpacing":"-1px"}}} -->
<h1 class="wp-block-heading has-text-align-center has-reme-text-color-color has-text-color" style="font-size:48px;font-weight:800;letter-spacing:-1px;line-height:1.15">Get in touch</h1>
<!-- /wp:heading -->

<!-- wp:paragraph {"align":"center","textColor":"rm-c-2","style":{"typography":{"fontSize":"18px","lineHeight":"1.7"},"spacing":{"margin":{"top":"20px"}}}} -->
<p class="has-text-align-center has-rm-c-2-color has-text-color" style="margin-top:20px;font-size:18px;line-height:1.7">Tips, corrections, and questions are welcome. We reply to every message.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group -->

<!-- wp:group {"align":"full","backgroundColor":"rm-light-bg","style":{"spacing":{"padding":{"top":"80px","bottom":"80px","left":"24px","right":"24px"}}},"layout":{"type":"constrained","contentSize":"1160px"}} -->
<div class="wp-block-group alignfull has-rm-light-bg-background-color has-background" style="padding-top:80px;padding-right:24px;padding-bottom:80px;padding-left:24px"><!-- wp:heading {"textAlign":"center","level":2,"textColor":"reme-text-color","style":{"typography":{"fontSize":"36px","fontWeight":"800"},"spacing":{"margin":{"bottom":"12px"}}}} -->
<h2 class="wp-block-heading has-text-align-center has-reme-text-color-color has-text-color" style="margin-bottom:12px;font-size:36px;font-weight:800">How to reach us</h2>
<!-- /wp:heading -->

<!-- wp:columns {"style":{"spacing":{"blockGap":{"left":"48px","top":"36px"}}}} -->
<div class="wp-block-columns"><!-- wp:column {"width":"45%"} -->
<div class="wp-block-column" style="flex-basis:45%"><!-- wp:heading {"level":3,"textColor":"reme-text-color","style":{"typography":{"fontSize":"24px","fontWeight":"700"},"spacing":{"margin":{"bottom":"16px"}}}} -->
<h3 class="wp-block-heading has-reme-text-color-color has-text-color" style="margin-bottom:16px;font-size:24px;font-weight:700">Corrections policy</h3>
<!-- /wp:heading -->

<!-- wp:paragraph {"textColor":"rm-c-2","style":{"typography":{"fontSize":"15px","lineHeight":"1.7"},"spacing":{"margin":{"bottom":"12px"}}}} -->
<p class="has-rm-c-2-color has-text-color" style="margin-bottom:12px;font-size:15px;line-height:1.7">We correct factual errors in public and note the change at the bottom of the post. If something looks wrong, send a note with the URL and the correct source.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column -->

<!-- wp:column {"width":"55%"} -->
<div class="wp-block-column" style="flex-basis:55%"><!-- wp:group {"style":{"spacing":{"padding":{"top":"32px","right":"32px","bottom":"32px","left":"32px"}},"border":{"radius":"10px"}},"backgroundColor":"rm-site-bg"} -->
<div class="wp-block-group has-rm-site-bg-background-color has-background" style="border-radius:10px;padding-top:32px;padding-right:32px;padding-bottom:32px;padding-left:32px"><!-- wp:heading {"level":3,"textColor":"reme-text-color","style":{"typography":{"fontSize":"22px","fontWeight":"700"},"spacing":{"margin":{"bottom":"14px"}}}} -->
<h3 class="wp-block-heading has-reme-text-color-color has-text-color" style="margin-bottom:14px;font-size:22px;font-weight:700">Editorial contacts</h3>
<!-- /wp:heading -->

<!-- wp:paragraph {"textColor":"rm-c-2","style":{"typography":{"fontSize":"15px","lineHeight":"1.7"},"spacing":{"margin":{"bottom":"16px"}}}} -->
<p class="has-rm-c-2-color has-text-color" style="margin-bottom:16px;font-size:15px;line-height:1.7"><strong>Tips and pitches:</strong> hello@researchwith.me<br><strong>Corrections:</strong> corrections@researchwith.me<br><strong>Other:</strong> contact@researchwith.me</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph {"textColor":"reme-text-color","style":{"typography":{"fontSize":"14px","lineHeight":"1.6"}}} -->
<p class="has-reme-text-color-color has-text-color" style="font-size:14px;line-height:1.6">Typical response time is 3 to 5 business days.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group --></div>
<!-- /wp:column --></div>
<!-- /wp:columns --></div>
<!-- /wp:group -->
HTML;

return [
	'post_type'    => 'page',
	'post_name'    => 'contact',
	'post_title'   => _x( 'Contact', 'Theme starter content', 'reme' ),
	'post_content' => str_replace(
		[ '{{theme_uri}}', '{{home_url}}' ],
		[ trailingslashit( get_template_directory_uri() ), trailingslashit( home_url() ) ],
		$post_content
	),
];
