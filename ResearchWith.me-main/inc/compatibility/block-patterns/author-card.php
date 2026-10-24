<?php
/**
 * Author card pattern.
 *
 * An author profile card with avatar, name, role and short bio. Used on
 * author pages, about pages and team sections.
 *
 * @package ReMe
 */

return array(
	'title'       => __( 'Author Card', 'reme' ),
	'description' => __( 'An author card with avatar, name, role and short bio.', 'reme' ),
	'content'     => '<!-- wp:group {\"className\":\"reme-author-card\",\"style\":{\"spacing\":{\"padding\":{\"top\":\"24px\",\"right\":\"24px\",\"bottom\":\"24px\",\"left\":\"24px\"}},\"border\":{\"radius\":\"12px\",\"width\":\"1px\",\"style\":\"solid\"}},\"layout\":{\"type\":\"constrained\"}} --><div class=\"wp-block-group reme-author-card\" style=\"border-style:solid;border-width:1px;border-radius:12px;padding-top:24px;padding-right:24px;padding-bottom:24px;padding-left:24px\"><!-- wp:group {\"style\":{\"spacing\":{\"blockGap\":\"16px\"}},\"layout\":{\"type\":\"flex\"}} --><div class=\"wp-block-group is-layout-flex wp-container-4\"><!-- wp:image {\"sizeSlug\":\"full\",\"style\":{\"border\":{\"radius\":\"50%\"}}} --><figure class=\"wp-block-image size-full\"><img src=\"{{site_url}}/wp-content/uploads/2026/01/author-avatar.jpg\" alt=\"Author Name\" style=\"border-radius:50%;width:120px;height:120px;object-fit:cover\"/></figure><!-- /wp:image -->\\n\\n<!-- wp:group {\"style\":{\"spacing\":{\"blockGap\":\"8px\"}}} --><div class=\"wp-block-group\"><!-- wp:heading {\"level\":3,\"textColor\":\"reme-text-color\",\"style\":{\"typography\":{\"fontSize\":\"20px\",\"fontWeight\":\"700\"}},\"spacing\":{\"marginBottom\":\"6px\"}} --><h3 class=\"wp-block-heading has-reme-text-color-color has-text-color\" style=\"margin-bottom:6px;font-size:20px;font-weight:700\">Author Name</h3><!-- /wp:heading -->\\n\\n<!-- wp:paragraph {\"textColor\":\"rm-secondary-accent\",\"style\":{\"typography\":{\"fontSize\":\"14px\",\"fontWeight\":\"600\"}},\"spacing\":{\"marginBottom\":\"14px\"}} --><p class=\"has-rm-secondary-accent-color has-text-color\" style=\"margin-bottom:14px;font-size:14px;font-weight:600\">Writer &amp; publisher</p><!-- /wp:paragraph --></div><!-- /wp:group --></div><!-- /wp:group -->\\n\\n<!-- wp:paragraph {\"textColor\":\"rm-c-2\",\"style\":{\"typography\":{\"fontSize\":\"13px\",\"lineHeight\":\"1.6\"}},\"spacing\":{\"marginTop\":\"16px\",\"marginBottom\":\"0\"}} --><p class=\"has-rm-c-2-color has-text-color\" style=\"margin-top:16px;margin-bottom:0;font-size:13px;line-height:1.6\">A short author biography goes here, describing their interests and background.</p><!-- /wp:paragraph --></div><!-- /wp:group -->',
	'categories'  => array( 'text' ),
);
