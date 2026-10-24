<?php
/**
 * Abilities loader.
 *
 * Registers the ReMe abilities with the WordPress Abilities API (WP 6.9+).
 * Extensions can change their schemas and handlers through filters instead of
 * registering them a second time.
 *
 * @package ReMe\Abilities
 */

namespace ReMe\Abilities;

/**
 * Class Loader
 *
 * @package ReMe\Abilities
 */
class Loader {

	/**
	 * The ability category slug shared by all ReMe abilities.
	 */
	const CATEGORY = 'reme';

	/**
	 * Ability classes, relative to this namespace, keyed by ability id.
	 */
	const ABILITIES = array(
		'reme/site-get-state'          => 'Site_Get_State',
		'reme/header-list-components'  => 'Header_List_Components',
		'reme/appearance-update'       => 'Appearance_Update',
		'reme/appearance-apply-preset' => 'Appearance_Apply_Preset',
		'reme/header-configure'        => 'Header_Configure',
		'reme/footer-configure'        => 'Footer_Configure',
		'reme/site-set-performance'    => 'Site_Set_Performance',
		'reme/site-set-theme-mod'      => 'Site_Set_Theme_Mod',
		'reme/page-layout-update'      => 'Page_Layout_Update',
		'reme/monetization-get-config' => 'Monetization_Get_Config',
		'reme/monetization-update'     => 'Monetization_Update',
	);

	/**
	 * Initialize the feature.
	 *
	 * @return void
	 */
	public function init() {
		if ( ! function_exists( 'wp_register_ability' ) ) {
			return;
		}

		add_action( 'wp_abilities_api_categories_init', array( $this, 'register_category' ) );
		add_action( 'wp_abilities_api_init', array( $this, 'register_abilities' ) );
	}

	/**
	 * Register the shared "reme" ability category.
	 *
	 * @return void
	 */
	public function register_category() {
		if ( ! function_exists( 'wp_register_ability_category' ) ) {
			return;
		}

		if ( function_exists( 'wp_has_ability_category' ) && wp_has_ability_category( self::CATEGORY ) ) {
			return;
		}

		wp_register_ability_category(
			self::CATEGORY,
			array(
				'label'       => __( 'ReMe', 'reme' ),
				'description' => __( 'Read and configure the ReMe theme.', 'reme' ),
			)
		);
	}

	/**
	 * Register the abilities.
	 *
	 * @return void
	 */
	public function register_abilities() {
		foreach ( self::ABILITIES as $id => $short_name ) {
			if ( function_exists( 'wp_has_ability' ) && wp_has_ability( $id ) ) {
				continue;
			}

			$class = __NAMESPACE__ . '\\' . $short_name;

			if ( ! class_exists( $class ) ) {
				continue;
			}

			$ability = new $class();
			$ability->register();
		}
	}
}
