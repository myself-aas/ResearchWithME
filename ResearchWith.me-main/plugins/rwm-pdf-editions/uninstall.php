<?php
/**
 * Uninstall routine for ResearchWith.me PDF & Special Editions.
 *
 * Adheres to WordPress.org plugin guidelines.
 *
 * @package RWM_PDF_Editions
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

// Delete plugin options.
delete_option( 'rwm_pdf_settings' );
delete_option( 'rwm_pdf_special_editions_index' );
delete_option( 'rwm_pdf_rewrite_version' );

// Clear any transients created by the plugin.
delete_transient( 'rwm_pdf_editions_cache' );
