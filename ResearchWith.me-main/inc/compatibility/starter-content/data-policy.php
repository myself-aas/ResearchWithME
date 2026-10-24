<?php
/**
 * Data & privacy policy starter content for ResearchWith.me.
 *
 * General site data policy: what is collected, how content is licensed.
 *
 * @package ReMe\Compatibility\Starter_Content
 */

$post_content = <<<'HTML'
<!-- wp:group {"align":"full","backgroundColor":"rm-site-bg","className":"folio-hero","style":{"spacing":{"padding":{"top":"100px","bottom":"80px","left":"24px","right":"24px"}}},"layout":{"type":"constrained","contentSize":"860px"}} -->
<div class="wp-block-group alignfull folio-hero has-rm-site-bg-background-color has-background" style="padding-top:100px;padding-right:24px;padding-bottom:80px;padding-left:24px"><!-- wp:paragraph {"align":"center","textColor":"rm-secondary-accent","style":{"typography":{"fontSize":"13px","letterSpacing":"2px","textTransform":"uppercase","fontWeight":"700"}},"spacing":{"marginBottom":"14px"}} --><p class="has-text-align-center has-rm-secondary-accent-color has-text-color" style="margin-bottom:14px;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Data policy</p><!-- /wp:paragraph -->

<!-- wp:heading {"textAlign":"center","level":1,"textColor":"reme-text-color","style":{"typography":{"fontSize":"48px","lineHeight":"1.15","fontWeight":"800","letterSpacing":"-1px"}}} --><h1 class="wp-block-heading has-text-align-center has-reme-text-color-color has-text-color" style="font-size:48px;font-weight:800;letter-spacing:-1px;line-height:1.15">Site data &amp; content policy</h1><!-- /wp:heading -->

<!-- wp:paragraph {"align":"center","textColor":"rm-c-2","style":{"typography":{"fontSize":"18px","lineHeight":"1.7"}},"spacing":{"marginTop":"20px"}} --><p class="has-text-align-center has-rm-c-2-color has-text-color" style="margin-top:20px;font-size:18px;line-height:1.7">What this site collects, how content is licensed, and what you can reuse.</p><!-- /wp:paragraph --></div><!-- /wp:group -->

<!-- wp:group {"align":"full","backgroundColor":"rm-light-bg","style":{"spacing":{"padding":{"top":"80px","bottom":"80px","left":"24px","right":"24px"}}},"layout":{"type":"constrained","contentSize":"1160px"}} --><div class="wp-block-group alignfull has-rm-light-bg-background-color has-background" style="padding-top:80px;padding-right:24px;padding-bottom:80px;padding-left:24px"><!-- wp:heading {"level":2,"textColor":"reme-text-color","style":{"typography":{"fontSize":"32px","fontWeight":"800"}},"spacing":{"marginBottom":"36px"}} --><h2 class="wp-block-heading has-reme-text-color-color has-text-color" style="margin-bottom:36px;font-size:32px;font-weight:800">What we collect</h2><!-- /wp:heading -->

<!-- wp:list {"style":{"typography":{"fontSize":"16px","lineHeight":"1.8"}},"spacing":{"marginBottom":"36px"}} --><ul class="wp-block-list" style="font-size:16px;line-height:1.8;margin-bottom:36px"><li>No tracking scripts or third-party cookies.</li><li>No personal data is sold or shared with advertisers.</li><li>Email addresses collected for newsletters are used only for that purpose.</li></ul><!-- /wp:list -->

<!-- wp:heading {"level":2,"textColor":"reme-text-color","style":{"typography":{"fontSize":"32px","fontWeight":"800"}},"spacing":{"marginTop":"48px","marginBottom":"36px"}} --><h2 class="wp-block-heading has-reme-text-color-color has-text-color" style="margin-top:48px;margin-bottom:36px;font-size:32px;font-weight:800">Licensing</h2><!-- /wp:heading -->

<!-- wp:paragraph {"textColor":"rm-c-2","style":{"typography":{"fontSize":"16px","lineHeight":"1.7"}},"spacing":{"marginBottom":"0"}} --><p class="has-rm-c-2-color has-text-color" style="margin-bottom:0;font-size:16px;line-height:1.7">Writing is published under standard copyright unless a post states otherwise. Excerpts may be reused with attribution and a link back to the original post.</p><!-- /wp:paragraph --></div><!-- /wp:group -->
HTML;

$post = array(
	'post_title'   => _x( 'Data Policy', 'Theme starter content', 'reme' ),
	'post_name'    => 'data-policy',
	'post_content' => $post_content,
	'post_type'    => 'page',
	'post_status'  => 'publish',
	'post_excerpt' => _x( 'Site data and content licensing policy.', 'Theme starter content', 'reme' ),
	'menu_order'   => 7,
);

return $post;
