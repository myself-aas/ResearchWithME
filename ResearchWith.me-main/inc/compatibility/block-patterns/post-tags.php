<?php
/**
 * Post tags pattern.
 *
 * A row of post tags for article pages.
 *
 * @package ReMe
 */

return array(
	'title'       => __( 'Post Tags', 'reme' ),
	'description' => __( 'A row of post tags for article pages.', 'reme' ),
	'content'     => '<!-- wp:group {\"className\":\"reme-post-tags\",\"layout\":{\"type\":\"constrained\"}} --><div class=\"wp-block-group reme-post-tags\"><!-- wp:paragraph {\"textColor\":\"rm-secondary-accent\",\"style\":{\"typography\":{\"fontSize\":\"12px\",\"letterSpacing\":\"1px\",\"textTransform\":\"uppercase\",\"fontWeight\":\"700\"}},\"spacing\":{\"marginBottom\":\"8px\"}} --><p class=\"has-rm-secondary-accent-color has-text-color\" style=\"margin-bottom:8px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase\">Tags</p><!-- /wp:paragraph -->\\n\\n<!-- wp:group {\"style\":{\"spacing\":{\"blockGap\":\"8px\"}},\"layout\":{\"type\":\"flex\",\"wrap\":\"wrap\"}} --><div class=\"wp-block-group is-layout-flex wp-container-6\" style=\"flex-wrap:wrap\"><!-- wp:paragraph {\"textColor\":\"reme-text-color\",\"style\":{\"typography\":{\"fontSize\":\"13px\"}},\"spacing\":{\"marginBottom\":\"0\",\"marginRight\":\"10px\"}} --><p class=\"has-reme-text-color-color has-text-color\" style=\"margin-bottom:0;margin-right:10px;font-size:13px\">technology</p><!-- /wp:paragraph -->\\n\\n<!-- wp:paragraph {\"textColor\":\"reme-text-color\",\"style\":{\"typography\":{\"fontSize\":\"13px\"}},\"spacing\":{\"marginBottom\":\"0\",\"marginRight\":\"10px\"}} --><p class=\"has-reme-text-color-color has-text-color\" style=\"margin-bottom:0;margin-right:10px;font-size:13px\">science</p><!-- /wp:paragraph -->\\n\\n<!-- wp:paragraph {\"textColor\":\"reme-text-color\",\"style\":{\"typography\":{\"fontSize\":\"13px\"}},\"spacing\":{\"marginBottom\":\"0\",\"marginRight\":\"10px\"}} --><p class=\"has-reme-text-color-color has-text-color\" style=\"margin-bottom:0;margin-right:10px;font-size:13px\">essay</p><!-- /wp:paragraph -->\\n\\n<!-- wp:paragraph {\"textColor\":\"reme-text-color\",\"style\":{\"typography\":{\"fontSize\":\"13px\"}},\"spacing\":{\"marginBottom\":\"0\"}} --><p class=\"has-reme-text-color-color has-text-color\" style=\"margin-bottom:0;font-size:13px\">notes</p><!-- /wp:paragraph --></div><!-- /wp:group --></div><!-- /wp:group -->',
	'categories'  => array( 'text' ),
);
