<?php
/**
 * Citation block pattern.
 *
 * A formatted citation block for referencing a post or source, with title,
 * author, date and URL.
 *
 * @package ReMe
 */

return array(
	'title'       => __( 'Citation', 'reme' ),
	'description' => __( 'A citation block for referencing a post or source.', 'reme' ),
	'content'     => '<!-- wp:group {\"className\":\"reme-citation-block\",\"style\":{\"spacing\":{\"padding\":{\"top\":\"20px\",\"right\":\"20px\",\"bottom\":\"20px\",\"left\":\"20px\"}},\"border\":{\"radius\":\"8px\",\"width\":\"1px\",\"style\":\"solid\"}},\"layout\":{\"type\":\"constrained\"}} --><div class=\"wp-block-group reme-citation-block\" style=\"border-style:solid;border-width:1px;border-radius:8px;padding-top:20px;padding-right:20px;padding-bottom:20px;padding-left:20px\"><!-- wp:heading {\"level\":3,\"textColor\":\"reme-text-color\",\"style\":{\"typography\":{\"fontSize\":\"16px\",\"fontWeight\":\"700\"}},\"spacing\":{\"marginBottom\":\"12px\"}} --><h3 class=\"wp-block-heading has-reme-text-color-color has-text-color\" style=\"margin-bottom:12px;font-size:16px;font-weight:700\">Cite this post</h3><!-- /wp:heading -->\\n\\n<!-- wp:paragraph {\"style\":{\"typography\":{\"fontSize\":\"14px\",\"lineHeight\":\"1.7\"}},\"spacing\":{\"marginBottom\":\"12px\"}} --><p style=\"font-size:14px;line-height:1.7;margin-bottom:12px\">Author Name. (2026). Article Title. <em>Site Name</em>. {{home_url}}sample-article/</p><!-- /wp:paragraph -->\\n\\n<!-- wp:group {\"style\":{\"spacing\":{\"blockGap\":\"8px\"}},\"layout\":{\"type\":\"flex\"}} --><div class=\"wp-block-group is-layout-flex wp-container-6\"><!-- wp:paragraph {\"textColor\":\"rm-c-2\",\"style\":{\"typography\":{\"fontSize\":\"12px\"}},\"spacing\":{\"marginBottom\":\"0\"}} --><p class=\"has-rm-c-2-color has-text-color has-small-font-size\" style=\"margin-bottom:0;font-size:12px\"><strong>Published:</strong> 2026-10-24</p><!-- /wp:paragraph -->\\n\\n<!-- wp:paragraph {\"textColor\":\"rm-c-2\",\"style\":{\"typography\":{\"fontSize\":\"12px\"}},\"spacing\":{\"marginBottom\":\"0\"}} --><p class=\"has-rm-c-2-color has-text-color has-small-font-size\" style=\"margin-bottom:0;font-size:12px\"><strong>URL:</strong> <a href=\"{{home_url}}sample-article/\">{{home_url}}sample-article/</a></p><!-- /wp:paragraph --></div><!-- /wp:group --></div><!-- /wp:group -->',
	'categories'  => array( 'text' ),
);
