<?php
/**
 * About starter content for ResearchWith.me.
 *
 * General about page: site introduction, author card, and publishing principles.
 *
 * @package ReMe\Compatibility\Starter_Content
 */

$post_content = <<<'HTML'
<!-- wp:group {"align":"full","backgroundColor":"rm-site-bg","className":"folio-hero","style":{"spacing":{"padding":{"top":"100px","bottom":"80px","left":"24px","right":"24px"}}},"layout":{"type":"constrained","contentSize":"860px"}} -->
<div class="wp-block-group alignfull folio-hero has-rm-site-bg-background-color has-background" style="padding-top:100px;padding-right:24px;padding-bottom:80px;padding-left:24px"><!-- wp:paragraph {"align":"center","textColor":"rm-secondary-accent","style":{"typography":{"fontSize":"13px","letterSpacing":"2px","textTransform":"uppercase","fontWeight":"700"},"spacing":{"marginBottom":"14px"}} --><p class="has-text-align-center has-rm-secondary-accent-color has-text-color" style="margin-bottom:14px;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase">About this blog</p><!-- /wp:paragraph -->

<!-- wp:heading {"textAlign":"center","level":1,"textColor":"reme-text-color","style":{"typography":{"fontSize":"48px","lineHeight":"1.15","fontWeight":"800","letterSpacing":"-1px"}}} --><h1 class="wp-block-heading has-text-align-center has-reme-text-color-color has-text-color" style="font-size:48px;font-weight:800;letter-spacing:-1px;line-height:1.15">Notes from the front lines of research and technology</h1><!-- /wp:heading -->

<!-- wp:paragraph {"align":"center","textColor":"rm-c-2","style":{"typography":{"fontSize":"18px","lineHeight":"1.7"},"spacing":{"marginTop":"20px"}} --><p class="has-text-align-center has-rm-c-2-color has-text-color" style="margin-top:20px;font-size:18px;line-height:1.7">Independent writing and analysis across research, technology, science, culture, and public policy. No paywalls, no trackers.</p><!-- /wp:paragraph --></div><!-- /wp:group -->

<!-- wp:group {"align":"full","backgroundColor":"rm-light-bg","style":{"spacing":{"padding":{"top":"80px","bottom":"80px","left":"24px","right":"24px"}}},"layout":{"type":"constrained","contentSize":"1160px"}} --><div class="wp-block-group alignfull has-rm-light-bg-background-color has-background" style="padding-top:80px;padding-right:24px;padding-bottom:80px;padding-left:24px"><!-- wp:columns {"style":{"spacing":{"blockGap":{"left":"48px","top":"36px"}}}} --><div class="wp-block-columns"><!-- wp:column {"width":"38%"} --><div class="wp-block-column" style="flex-basis:38%"><!-- wp:group {"style":{"spacing":{"padding":{"top":"32px","right":"28px","bottom":"32px","left":"28px"}},"border":{"radius":"10px"}},"backgroundColor":"rm-site-bg"} --><div class="wp-block-group has-rm-site-bg-background-color has-background" style="border-radius:10px;padding-top:32px;padding-right:28px;padding-bottom:32px;padding-left:28px"><!-- wp:heading {"level":3,"textColor":"reme-text-color","style":{"typography":{"fontSize":"22px","fontWeight":"700"},"spacing":{"marginBottom":"6px"}} --><h3 class="wp-block-heading has-reme-text-color-color has-text-color" style="margin-bottom:6px;font-size:22px;font-weight:700">Behind the blog</h3><!-- /wp:heading -->

<!-- wp:paragraph {"textColor":"rm-secondary-accent","style":{"typography":{"fontSize":"14px","fontWeight":"600"},"spacing":{"marginBottom":"16px"}} --><p class="has-rm-secondary-accent-color has-text-color" style="margin-bottom:16px;font-size:14px;font-weight:600">Author &amp; publisher</p><!-- /wp:paragraph -->

<!-- wp:paragraph {"textColor":"rm-c-2","style":{"typography":{"fontSize":"14px","lineHeight":"1.6"},"spacing":{"marginBottom":"14px"}} --><p class="has-rm-c-2-color has-text-color" style="margin-bottom:14px;font-size:14px;line-height:1.6">A longtime observer of research, software, and public infrastructure, writing in public since 2016.</p><!-- /wp:paragraph -->

<!-- wp:paragraph {"textColor":"reme-text-color","style":{"typography":{"fontSize":"14px","lineHeight":"1.6"}}} --><p class="has-reme-text-color-color has-text-color" style="font-size:14px;line-height:1.6">Everything here is written and edited by hand. Corrections and feedback are always welcome.</p><!-- /wp:paragraph --></div><!-- /wp:group --></div><!-- /wp:column -->

<!-- wp:column {"width":"62%"} --><div class="wp-block-column" style="flex-basis:62%"><!-- wp:heading {"level":2,"textColor":"reme-text-color","style":{"typography":{"fontSize":"28px","fontWeight":"700"},"spacing":{"marginBottom":"16px"}} --><h2 class="wp-block-heading has-reme-text-color-color has-text-color" style="margin-bottom:16px;font-size:28px;font-weight:700">Publishing principles</h2><!-- /wp:heading -->

<!-- wp:paragraph {"textColor":"rm-c-2","style":{"typography":{"fontSize":"16px","lineHeight":"1.7"},"spacing":{"marginBottom":"20px"}} --><p class="has-rm-c-2-color has-text-color" style="margin-bottom:20px;font-size:16px;line-height:1.7">We write in the open, correct mistakes in public, and link to sources whenever we can. Posts are opinion pieces unless clearly reported.</p><!-- /wp:paragraph -->

<!-- wp:heading {"level":3,"textColor":"reme-text-color","style":{"typography":{"fontSize":"22px","fontWeight":"700"},"spacing":{"marginTop":"24px","marginBottom":"12px"}} --><h3 class="wp-block-heading has-reme-text-color-color has-text-color" style="margin-top:24px;margin-bottom:12px;font-size:22px;font-weight:700">What you will find here</h3><!-- /wp:heading -->

<!-- wp:list {"style":{"typography":{"fontSize":"15px","lineHeight":"1.8"}},"spacing":{"marginBottom":"20px"}} --><ul class="wp-block-list" style="font-size:15px;line-height:1.8;margin-bottom:20px"><li>Short-form notes on new papers and releases.</li><li>Longer essays on technology and public policy.</li><li>Field reports from research and fieldwork.</li></ul><!-- /wp:list --></div><!-- /wp:column --></div><!-- /wp:columns --></div><!-- /wp:group -->
HTML;

$post = array(
	'post_title'   => _x( 'About', 'Theme starter content', 'reme' ),
	'post_name'    => 'about',
	'post_content' => $post_content,
	'post_type'    => 'page',
	'post_status'  => 'publish',
	'post_excerpt' => _x( 'About this independent blog.', 'Theme starter content', 'reme' ),
	'menu_order'   => 1,
);

return $post;
