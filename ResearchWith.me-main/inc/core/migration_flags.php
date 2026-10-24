<?php
/**
 * Settings handler.
 *
 * @since 4.0.0
 * @package ReMe
 */

namespace ReMe\Core;

/**
 * Class Migration_Flags
 *
 * @package ReMe\Core
 */
class Migration_Flags {
	/**
	 * Previous version of the theme in semver format.
	 *
	 * @var string
	 */
	private $last_version;
	/**
	 * Current version of the theme in semver format.
	 *
	 * @var string
	 */
	private $current_version;
	/**
	 * User since version in semver format.
	 *
	 * @var string
	 */
	private $user_since;

	const REME_VERSION_OPTION = 'reme_version';
	const USER_SINCE_VERSION  = 'reme_user_since';

	/**
	 * Migration_Flags constructor.
	 *
	 * @param string $current_version - the current version of the theme.
	 */
	public function __construct( $current_version ) {
		$this->last_version    = get_option( self::REME_VERSION_OPTION );
		$this->user_since      = get_option( self::USER_SINCE_VERSION );
		$this->current_version = $current_version;
	}

	/**
	 * Run the migrations.
	 */
	public function run() {
		// This exists since v4.0.0. If it's not set, we're dealing with a new user, but we don't know since what version.
		if ( ! $this->last_version && ! $this->user_since ) {
			update_option( self::USER_SINCE_VERSION, $this->is_new_user() ? $this->current_version : 'unknown' );

			$this->end_migration();

			return;
		}

		// We didn't set the user_since version when initially implemented, but we have the last version.
		if ( ! $this->last_version && $this->user_since ) {
			update_option( self::USER_SINCE_VERSION, $this->user_since );
		}

		// Skip if the current version is lower than the last one
		if ( version_compare( $this->current_version, $this->last_version, '<=' ) ) {
			return;
		}

		// Do migrations here.

		$this->end_migration();
	}

	/**
	 * Arbitrarilly determine if the user is new for v4 based on the presence of some essential theme mods.
	 *
	 * @return bool
	 */
	private function is_new_user() {
		$all_mods = get_theme_mods();

		$mods = [
			'hfg_header_layout',
			'hfg_header_layout_v2',
			'hfg_footer_layout',
			'hfg_footer_layout_v2',
			'reme_blog_archive_layout',
			'reme_headings_font_family',
			'reme_body_font_family',
			'reme_global_colors',
			'reme_button_appearance',
			'reme_secondary_button_appearance',
			'reme_typeface_general',
			'reme_form_fields_padding',
			'reme_default_sidebar_layout',
			'reme_advanced_layout_options',
		];

		$is_new_user = true;

		foreach ( $mods as $mod_to_check ) {
			if ( isset( $all_mods[ $mod_to_check ] ) ) {
				$is_new_user = false;
				break;
			}
		}

		return $is_new_user;
	}

	/**
	 * End the migration. Set the option to the current version.
	 */
	private function end_migration() {
		update_option( self::REME_VERSION_OPTION, $this->current_version );
	}

	/**
	 * Checks if this is a new user after a certain version.
	 *
	 * @param string $version - the version in semver format.
	 *
	 * @return bool
	 */
	public static function is_new_user_after( $version ) {
		$new_user_since = get_option( self::USER_SINCE_VERSION );

		if ( $new_user_since === 'unknown' ) {
			return false;
		}

		return version_compare( $new_user_since, $version, '>' );
	}

	/**
	 * Checks if the theme recorded the version this site started on.
	 *
	 * The theme was forked from ReMe 4.2.17, so every site it tracks gets the
	 * defaults ReMe introduced up to that release.
	 *
	 * @return bool
	 */
	public static function is_tracked_user() {
		$new_user_since = get_option( self::USER_SINCE_VERSION );

		return ! empty( $new_user_since ) && $new_user_since !== 'unknown';
	}

	/**
	 * Checks if the user should get the defaults introduced in ReMe 4.0.
	 */
	public static function is_new_user_after_v4() {
		return self::is_tracked_user();
	}

	/**
	 * Checks if the user should get the defaults introduced in ReMe 4.1.
	 */
	public static function is_new_user_after_v41() {
		return self::is_tracked_user();
	}
}
