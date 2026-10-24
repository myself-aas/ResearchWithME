<?php
/**
 * Plugin orchestrator.
 *
 * @package RWM_PDF_Editions
 */

namespace RWM_PDF\Includes;

defined( 'ABSPATH' ) || exit;

/**
 * Class RWM_PDF_Plugin
 */
final class RWM_PDF_Plugin {

	/**
	 * Singleton instance.
	 *
	 * @var RWM_PDF_Plugin|null
	 */
	private static $instance = null;

	/**
	 * Editions module.
	 *
	 * @var RWM_PDF_Editions
	 */
	private $editions;

	/**
	 * Settings module.
	 *
	 * @var RWM_PDF_Settings
	 */
	private $settings;

	/**
	 * Abilities module.
	 *
	 * @var RWM_PDF_Abilities
	 */
	private $abilities;

	/**
	 * Retrieve the singleton.
	 *
	 * @return RWM_PDF_Plugin
	 */
	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	/**
	 * Constructor.
	 */
	private function __construct() {
		$this->editions  = new RWM_PDF_Editions();
		$this->settings  = new RWM_PDF_Settings();
		$this->abilities = new RWM_PDF_Abilities();

		$this->editions->init();
		$this->abilities->init();

		if ( is_admin() ) {
			$this->settings->init();
		}

		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_front_end_assets' ) );
	}

	/**
	 * Enqueue the small front-end stylesheet and edition list styling.
	 *
	 * @return void
	 */
	public function enqueue_front_end_assets() {
		wp_enqueue_style(
			'rwm-pdf-editions',
			RWM_PDF_URL . 'assets/css/pdf-editions.css',
			array(),
			RWM_PDF_VERSION
		);

		$css = '
			.rwm-pdf-download{margin:28px 0;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
			.rwm-pdf-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 22px;background:var(--rm-primary-accent,#2563EB);color:#fff;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px}
			.rwm-pdf-btn:hover,.rwm-pdf-btn:focus{background:var(--rm-secondary-accent,#1D4ED8);color:#fff}
			.rwm-pdf-meta{font-size:12px;color:#64748B}
			.rwm-editions-list{list-style:none;margin:0;padding:0}
			.rwm-edition-item{margin:0 0 10px}
			.rwm-edition-item a{display:flex;justify-content:space-between;gap:12px;padding:14px 18px;border:1px solid var(--rm-c-1,#E2E8F0);border-radius:8px;background:var(--rm-light-bg,#F8FAFC);text-decoration:none}
			.rwm-edition-title{font-weight:700;color:var(--rm-c-0,#0F172A)}
			.rwm-edition-meta{font-size:13px;color:#64748B}
		';
		wp_add_inline_style( 'rwm-pdf-editions', $css );
	}
}
