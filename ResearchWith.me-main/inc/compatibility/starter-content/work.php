<?php
/**
 * Work / Portfolio starter content for ResearchWith.me.
 *
 * General portfolio page: featured work cards.
 *
 * @package ReMe\Compatibility\Starter_Content
 */

$post_content = <<<'HTML'
<!-- wp:group {"align":"full","backgroundColor":"rm-site-bg","className":"folio-hero","style":{"spacing":{"padding":{"top":"100px","bottom":"80px","left":"24px","right":"24px"}}},"layout":{"type":"constrained","contentSize":"880px"}} -->
<div class="wp-block-group alignfull folio-hero has-rm-site-bg-background-color has-background" style="padding-top:100px;padding-right:24px;padding-bottom:80px;padding-left:24px"><!-- wp:paragraph {"align":"center","textColor":"rm-secondary-accent","className":"folio-eyebrow","style":{"typography":{"fontSize":"13px","letterSpacing":"2px","textTransform":"uppercase","fontWeight":"700"},"spacing":{"margin":{"bottom":"14px"}}}} -->
<p class="has-text-align-center has-rm-secondary-accent-color has-text-color folio-eyebrow" style="margin-bottom:14px;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Selected work</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"textAlign":"center","level":1,"textColor":"reme-text-color","style":{"typography":{"fontSize":"48px","lineHeight":"1.15","fontWeight":"800","letterSpacing":"-1px"}}} -->
<h1 class="wp-block-heading has-text-align-center has-reme-text-color-color has-text-color" style="font-size:48px;font-weight:800;letter-spacing:-1px;line-height:1.15">Recent work and case studies</h1>
<!-- /wp:heading -->

<!-- wp:paragraph {"align":"center","textColor":"rm-c-2","style":{"typography":{"fontSize":"18px","lineHeight":"1.7"},"spacing":{"margin":{"top":"20px"}}}} -->
<p class="has-text-align-center has-rm-c-2-color has-text-color" style="margin-top:20px;font-size:18px;line-height:1.7">Field notes and write-ups from research, engineering, and fieldwork across sectors.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group -->

<!-- wp:group {"align":"full","backgroundColor":"rm-light-bg","style":{"spacing":{"padding":{"top":"80px","bottom":"80px","left":"24px","right":"24px"}}},"layout":{"type":"constrained","contentSize":"1160px"}} -->
<div class="wp-block-group alignfull has-rm-light-bg-background-color has-background" style="padding-top:80px;padding-right:24px;padding-bottom:80px;padding-left:24px"><!-- wp:heading {"textAlign":"center","level":2,"textColor":"reme-text-color","style":{"typography":{"fontSize":"36px","fontWeight":"800"},"spacing":{"margin":{"bottom":"12px"}}}} -->
<h2 class="wp-block-heading has-text-align-center has-reme-text-color-color has-text-color" style="margin-bottom:12px;font-size:36px;font-weight:800">Featured pieces</h2>
<!-- /wp:heading -->

<!-- wp:columns {"style":{"spacing":{"blockGap":{"left":"36px","top":"36px"}}}} -->
<div class="wp-block-columns"><!-- wp:column {"style":{"spacing":{"padding":{"top":"32px","right":"32px","bottom":"32px","left":"32px"}},"border":{"radius":"10px"}},"backgroundColor":"rm-site-bg"} -->
<div class="wp-block-column has-rm-site-bg-background-color has-background" style="border-radius:10px;padding-top:32px;padding-right:32px;padding-bottom:32px;padding-left:32px"><!-- wp:paragraph {"textColor":"rm-secondary-accent","style":{"typography":{"fontSize":"12px","fontWeight":"700","textTransform":"uppercase","letterSpacing":"1px"},"spacing":{"margin":{"bottom":"8px"}}}} -->
<p class="has-rm-secondary-accent-color has-text-color" style="margin-bottom:8px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Technology &bull; Oct 2026</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3,"textColor":"reme-text-color","style":{"typography":{"fontSize":"22px","fontWeight":"700","lineHeight":"1.35"},"spacing":{"margin":{"bottom":"10px"}}}} -->
<h3 class="wp-block-heading has-reme-text-color-color has-text-color" style="margin-bottom:10px;font-size:22px;font-weight:700;line-height:1.35">The long view on open infrastructure</h3>
<!-- /wp:heading -->

<!-- wp:paragraph {"textColor":"rm-c-2","style":{"typography":{"fontSize":"13px"},"spacing":{"margin":{"bottom":"14px"}}}} -->
<p class="has-rm-c-2-color has-text-color" style="margin-bottom:14px;font-size:13px">A case study on sustaining public digital infrastructure beyond the launch grant.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph {"textColor":"reme-text-color","style":{"typography":{"fontSize":"14px","lineHeight":"1.6"},"spacing":{"margin":{"bottom":"20px"}}}} -->
<p class="has-reme-text-color-color has-text-color" style="margin-bottom:20px;font-size:14px;line-height:1.6">Infrastructure projects are easy to fund and hard to keep alive. What happens after the pilot ends?</p>
<!-- /wp:paragraph -->

<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button {"backgroundColor":"rm-primary-accent","textColor":"rm-text-dark-bg","style":{"typography":{"fontSize":"13px"},"border":{"radius":"4px"},"spacing":{"padding":{"top":"8px","right":"16px","bottom":"8px","left":"16px"}}}} -->
<div class="wp-block-button has-custom-font-size" style="font-size:13px"><a class="wp-block-button__link has-rm-text-dark-bg-color has-rm-primary-accent-background-color has-text-color has-background" href="{{home_url}}contact/" style="border-radius:4px;padding-top:8px;padding-right:16px;padding-bottom:8px;padding-left:16px">Read more &rarr;</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:column -->

<!-- wp:column {"style":{"spacing":{"padding":{"top":"32px","right":"32px","bottom":"32px","left":"32px"}},"border":{"radius":"10px"}},"backgroundColor":"rm-site-bg"} -->
<div class="wp-block-column has-rm-site-bg-background-color has-background" style="border-radius:10px;padding-top:32px;padding-right:32px;padding-bottom:32px;padding-left:32px"><!-- wp:paragraph {"textColor":"rm-secondary-accent","style":{"typography":{"fontSize":"12px","fontWeight":"700","textTransform":"uppercase","letterSpacing":"1px"},"spacing":{"margin":{"bottom":"8px"}}}} -->
<p class="has-rm-secondary-accent-color has-text-color" style="margin-bottom:8px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Environment &bull; Sep 2026</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3,"textColor":"reme-text-color","style":{"typography":{"fontSize":"22px","fontWeight":"700","lineHeight":"1.35"},"spacing":{"margin":{"bottom":"10px"}}}} -->
<h3 class="wp-block-heading has-reme-text-color-color has-text-color" style="margin-bottom:10px;font-size:22px;font-weight:700;line-height:1.35">Carbon offsets under the microscope</h3>
<!-- /wp:heading -->

<!-- wp:paragraph {"textColor":"rm-c-2","style":{"typography":{"fontSize":"13px"},"spacing":{"margin":{"bottom":"14px"}}}} -->
<p class="has-rm-c-2-color has-text-color" style="margin-bottom:14px;font-size:13px">Field report from conservation zones in Latin America and Southeast Asia.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph {"textColor":"reme-text-color","style":{"typography":{"fontSize":"14px","lineHeight":"1.6"},"spacing":{"margin":{"bottom":"20px"}}}} -->
<p class="has-reme-text-color-color has-text-color" style="margin-bottom:20px;font-size:14px;line-height:1.6">Satellite telemetry against ground-truth sensors: what verification actually measures.</p>
<!-- /wp:paragraph -->

<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button {"backgroundColor":"rm-primary-accent","textColor":"rm-text-dark-bg","style":{"typography":{"fontSize":"13px"},"border":{"radius":"4px"},"spacing":{"padding":{"top":"8px","right":"16px","bottom":"8px","left":"16px"}}}} -->
<div class="wp-block-button has-custom-font-size" style="font-size:13px"><a class="wp-block-button__link has-rm-text-dark-bg-color has-rm-primary-accent-background-color has-text-color has-background" href="{{home_url}}contact/" style="border-radius:4px;padding-top:8px;padding-right:16px;padding-bottom:8px;padding-left:16px">Read more &rarr;</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:column --></div>
<!-- /wp:columns --></div>
<!-- /wp:group -->
HTML;

return [
	'post_type'    => 'page',
	'post_name'    => 'work',
	'post_title'   => _x( 'Work', 'Theme starter content', 'reme' ),
	'post_content' => str_replace(
		[ '{{theme_uri}}', '{{home_url}}' ],
		[ trailingslashit( get_template_directory_uri() ), trailingslashit( home_url() ) ],
		$post_content
	),
];
