<?php
/**
 * Post intro pattern.
 *
 * A styled introduction or lead paragraph for blog posts.
 *
 * @package ReMe
 */

return array(
	'title'       => __( 'Post Intro', 'reme' ),
	'description' => __( 'A styled introduction or lead paragraph for blog posts.', 'reme' ),
	'content'     => '<!-- wp:group {\"className\":\"reme-post-intro\",\"style\":{\"spacing\":{\"padding\":{\"top\":\"24px\",\"right\":\"24px\",\"bottom\":\"24px\",\"left\":\"24px\"}},\"border\":{\"radius\":\"8px\",\"width\":\"1px\",\"style\":\"solid\"}},\"layout\":{\"type\":\"constrained\"}} --><div class=\"wp-block-group reme-post-intro\" style=\"border-style:solid;border-width:1px;border-radius:8px;padding-top:24px;padding-right:24px;padding-bottom:24px;padding-left:24px\"><!-- wp:heading {\"level\":3,\"textColor\":\"reme-text-color\",\"style\":{\"typography\":{\"fontSize\":\"18px\",\"fontWeight\":\"700\"}},\"spacing\":{\"marginBottom\":\"12px\"}} --><h3 class=\"wp-block-heading has-reme-text-color-color has-text-color\" style=\"margin-bottom:12px;font-size:18px;font-weight:700\">In short</h3><!-- /wp:heading -->\\n\\n<!-- wp:paragraph {\"textColor\":\"rm-c-2\",\"style\":{\"typography\":{\"fontSize\":\"15px\",\"lineHeight\":\"1.75\"}},\"spacing\":{\"marginBottom\":\"0\"}} --><p class=\"has-rm-c-2-color has-text-color\" style=\"margin-bottom:0;font-size:15px;line-height:1.75\">The lead paragraph of the post, summarizing what follows and why it matters.</p><!-- /wp:paragraph --></div><!-- /wp:group -->',
	'categories'  => array( 'text' ),
);
