<?php
/**
 * ReMe functions.php file
 *
 * Author:          Andrei Baicus <andrei@themeisle.com>
 * Created on:      17/08/2018
 *
 * @package ReMe
 */

define( 'REME_VERSION', '1.0.0' );
define( 'REME_INC_DIR', trailingslashit( get_template_directory() ) . 'inc/' );
define( 'REME_ASSETS_URL', trailingslashit( get_template_directory_uri() ) . 'assets/' );
define( 'REME_MAIN_DIR', get_template_directory() . '/' );
define( 'REME_BASENAME', basename( REME_MAIN_DIR ) );
define( 'REME_PLUGINS_DIR', plugin_dir_path( dirname( __DIR__ ) ) . 'plugins/' );

if ( ! defined( 'REME_DEBUG' ) ) {
	define( 'REME_DEBUG', false );
}
define( 'REME_NEW_DYNAMIC_STYLE', true );
/**
 * Buffer which holds errors during theme inititalization.
 *
 * @var WP_Error $_reme_bootstrap_errors
 */
global $_reme_bootstrap_errors;

$_reme_bootstrap_errors = new WP_Error();

if ( version_compare( PHP_VERSION, '7.0' ) < 0 ) {
	$_reme_bootstrap_errors->add(
		'minimum_php_version',
		sprintf(
		/* translators: %s message to upgrade PHP to the latest version */
			__( "Hey, we've noticed that you're running an outdated version of PHP which is no longer supported. Make sure your site is fast and secure, by %1\$s. ReMe's minimal requirement is PHP%2\$s.", 'reme' ),
			sprintf(
			/* translators: %s message to upgrade PHP to the latest version */
				'<a href="https://wordpress.org/support/upgrade-php/">%s</a>',
				__( 'upgrading PHP to the latest version', 'reme' )
			),
			'7.0'
		)
	);
}
/**
 * A list of files to check for existence before bootstrapping.
 *
 * @var non-falsy-string[] Files to check for existence.
 */
$_files_to_check = defined( 'REME_IGNORE_SOURCE_CHECK' ) ? [] : [
	REME_MAIN_DIR . 'vendor/autoload.php',
	REME_MAIN_DIR . 'style-main-new.css',
	REME_MAIN_DIR . 'assets/js/build/modern/frontend.js',
	REME_MAIN_DIR . 'assets/apps/customizer-controls/build/controls.js',
];
foreach ( $_files_to_check as $_file_to_check ) {
	if ( ! is_file( $_file_to_check ) ) {
		$_reme_bootstrap_errors->add(
			'build_missing',
			sprintf(
			/* translators: %s: commands to run the theme */
				__( 'You appear to be running the ReMe theme from source code. Please finish installation by running %s.', 'reme' ), // phpcs:ignore WordPress.Security.EscapeOutput
				'<code>composer install --no-dev &amp;&amp; yarn install --frozen-lockfile &amp;&amp; yarn run build</code>'
			)
		);
		break;
	}
}
/**
 * Adds notice bootstraping errors.
 *
 * @internal
 * @global WP_Error $_reme_bootstrap_errors
 */
function _reme_bootstrap_errors() {
	global $_reme_bootstrap_errors;
	printf( '<div class="notice notice-error"><p>%1$s</p></div>', $_reme_bootstrap_errors->get_error_message() ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
}

if ( $_reme_bootstrap_errors->has_errors() ) {
	/**
	 * Add notice for PHP upgrade.
	 */
	add_filter( 'template_include', '__return_null', 99 );
	switch_theme( WP_DEFAULT_THEME );
	unset( $_GET['activated'] ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
	add_action( 'admin_notices', '_reme_bootstrap_errors' );

	return;
}

require_once 'globals/migrations.php';
require_once 'globals/utilities.php';
require_once 'globals/hooks.php';
require_once 'globals/sanitize-functions.php';
require_once get_template_directory() . '/start.php';

/**
 * If the new widget editor is available,
 * we re-assign the widgets to hfg_footer
 */
if ( reme_is_new_widget_editor() ) {
	/**
	 * Re-assign the widgets to hfg_footer
	 *
	 * @param array  $section_args The section arguments.
	 * @param string $section_id The section ID.
	 * @param string $sidebar_id The sidebar ID.
	 *
	 * @return mixed
	 */
	function reme_customizer_custom_widget_areas( $section_args, $section_id, $sidebar_id ) {
		if ( strpos( $section_id, 'widgets-footer' ) ) {
			$section_args['panel'] = 'hfg_footer';
		}

		return $section_args;
	}

	add_filter( 'customizer_widgets_section_args', 'reme_customizer_custom_widget_areas', 10, 3 );
}

require_once get_template_directory() . '/header-footer-grid/loader.php';
