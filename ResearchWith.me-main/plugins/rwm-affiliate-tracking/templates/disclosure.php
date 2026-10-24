<?php
/**
 * Affiliate Disclosure page template.
 *
 * @package RWM_Affiliate_Tracking
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>

<div class="reme-affiliate-disclosure-page">
	<h1><?php esc_html_e( 'Affiliate Disclosure', 'rwm-affiliate-tracking' ); ?></h1>
	<p><?php esc_html_e( 'ResearchWith.me participates in affiliate marketing programs. This means that when you click on links to various products and services on this site and make a purchase, we may earn a commission at no additional cost to you.', 'rwm-affiliate-tracking' ); ?></p>
	<p><?php esc_html_e( 'All affiliate links are clearly marked with rel="sponsored" and comply with FTC disclosure guidelines. We only recommend products and services that we believe provide value to our readers.', 'rwm-affiliate-tracking' ); ?></p>
	<p><?php esc_html_e( 'Commissions earned help support the operation of ResearchWith.me.', 'rwm-affiliate-tracking' ); ?></p>
</div>

<?php get_footer(); ?>
