<?php
/**
 * Article hero pattern.
 *
 * A full-bleed hero section for article pages with title, meta line and
 * summary.
 *
 * @package ReMe
 */

return array(
	'title'       => __( 'Article Hero', 'reme' ),
	'description' => __( 'A full-bleed hero section for article pages.', 'reme' ),
	'content'     => '<!-- wp:group {\"align\":\"full\",\"backgroundColor\":\"rm-site-bg\",\"className\":\"reme-article-hero\",\"style\":{\"spacing\":{\"padding\":{\"top\":\"80px\",\"right\":\"24px\",\"bottom\":\"60px\",\"left\":\"24px\"}}},\"layout\":{\"type\":\"constrained\",\"contentSize\":\"1160px\"}} --><div class=\"wp-block-group alignfull reme-article-hero has-rm-site-bg-background-color has-background\" style=\"padding-top:80px;padding-right:24px;padding-bottom:60px;padding-left:24px\"><!-- wp:group {\"style\":{\"spacing\":{\"blockGap\":\"24px\"}},\"layout\":{\"type\":\"constrained\"}} --><div class=\"wp-block-group\"><!-- wp:paragraph {\"textColor\":\"rm-secondary-accent\",\"style\":{\"typography\":{\"fontSize\":\"12px\",\"letterSpacing\":\"2px\",\"textTransform\":\"uppercase\",\"fontWeight\":\"700\"}},\"spacing\":{\"marginBottom\":\"12px\"}} --><p class=\"has-rm-secondary-accent-color has-text-color\" style=\"margin-bottom:12px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase\">Featured article</p><!-- /wp:paragraph -->\\n\\n<!-- wp:heading {\"level\":1,\"textColor\":\"reme-text-color\",\"style\":{\"typography\":{\"fontSize\":\"48px\",\"lineHeight\":\"1.15\",\"fontWeight\":\"800\",\"letterSpacing\":\"-1px\"}},\"spacing\":{\"marginBottom\":\"16px\"}} --><h1 class=\"wp-block-heading has-reme-text-color-color has-text-color\" style=\"margin-bottom:16px;font-size:48px;line-height:1.15;font-weight:800;letter-spacing:-1px\">Article Title Goes Here</h1><!-- /wp:heading -->\\n\\n<!-- wp:group {\"style\":{\"spacing\":{\"blockGap\":\"10px\"}},\"layout\":{\"type\":\"flex\"}} --><div class=\"wp-block-group is-layout-flex wp-container-3\"><!-- wp:paragraph {\"textColor\":\"rm-c-2\",\"style\":{\"typography\":{\"fontSize\":\"14px\"}},\"spacing\":{\"marginBottom\":\"0\"}} --><p class=\"has-rm-c-2-color has-text-color\" style=\"margin-bottom:0;font-size:14px\"><strong>Category:</strong> Technology</p><!-- /wp:paragraph -->\\n\\n<!-- wp:paragraph {\"textColor\":\"rm-c-2\",\"style\":{\"typography\":{\"fontSize\":\"14px\"}},\"spacing\":{\"marginBottom\":\"0\"}} --><p class=\"has-rm-c-2-color has-text-color\" style=\"margin-bottom:0;font-size:14px\"><strong>Published:</strong> 2026-10-24</p><!-- /wp:paragraph --></div><!-- /wp:group -->\\n\\n<!-- wp:paragraph {\"textColor\":\"reme-text-color\",\"style\":{\"typography\":{\"fontSize\":\"15px\",\"lineHeight\":\"1.7\"}},\"spacing\":{\"marginTop\":\"24px\",\"marginBottom\":\"0\"}} --><p class=\"has-reme-text-color-color has-text-color\" style=\"margin-top:24px;margin-bottom:0;font-size:15px;line-height:1.7\">A short summary of the article that invites the reader to keep scrolling.</p><!-- /wp:paragraph --></div><!-- /wp:group --></div><!-- /wp:group -->',
	'categories'  => array( 'text' ),
);
