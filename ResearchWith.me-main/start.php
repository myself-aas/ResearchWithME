<?php
/**
 * Start file handles bootstrap.
 *
 * @package ReMe
 */

/**
 * Run theme functionality
 */
function reme_run() {
	$vendor_file = trailingslashit( get_template_directory() ) . 'vendor/autoload.php';
	if ( is_readable( $vendor_file ) ) {
		require_once $vendor_file;
	}

	require_once 'autoloader.php';
	$autoloader = new \ReMe\Autoloader();
	$autoloader->add_namespace( 'ReMe', get_template_directory() . '/inc/' );

	$autoloader->register();

	if ( class_exists( '\\ReMe\\Core\\Core_Loader' ) ) {
		new \ReMe\Core\Core_Loader();
	}
}

reme_run();
