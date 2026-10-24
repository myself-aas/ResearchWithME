<?php
/**
 * Custom Block Loader for ReMe.
 *
 * Registers all custom Gutenberg blocks used by the ReMe theme.
 *
 * @package ReMe\Blocks
 */

namespace ReMe\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Block_Loader
 *
 * Registers block types, enqueues assets, and provides render callbacks.
 */
class Block_Loader {

	/**
	 * List of blocks to register.
	 *
	 * @var string[]
	 */
	private $blocks = array(
		'post-list',
		'file-embed',
	);

	/**
	 * Block directory path.
	 *
	 * @var string
	 */
	private $block_dir;

	/**
	 * Block directory URL.
	 *
	 * @var string
	 */
	private $block_url;

	/**
	 * Block version.
	 *
	 * @var string
	 */
	private $version;

	/**
	 * Block_Loader constructor.
	 */
	public function __construct() {
		$this->block_dir = trailingslashit( get_template_directory() ) . 'inc/blocks/';
		$this->block_url = trailingslashit( get_template_directory_uri() ) . 'inc/blocks/';
		$this->version   = defined( 'REME_VERSION' ) ? REME_VERSION : '1.0.0';

		add_action( 'init', array( $this, 'register_blocks' ), 0 );
		add_action( 'enqueue_block_assets', array( $this, 'enqueue_block_assets' ), 10 );
		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_block_editor_assets' ), 10 );
	}

	/**
	 * Register all custom blocks.
	 *
	 * @return void
	 */
	public function register_blocks() {
		if ( ! function_exists( 'register_block_type' ) ) {
			return;
		}

		foreach ( $this->blocks as $block ) {
			$block_path = $this->block_dir . $block . '/block.json';
			$render_path = $this->block_dir . $block . '/render.php';

			if ( ! is_file( $block_path ) ) {
				continue;
			}

			$block_json = json_decode( file_get_contents( $block_path ), true );

			if ( empty( $block_json ) || ! isset( $block_json['name'] ) ) {
				continue;
			}

			register_block_type(
				$block_json['name'],
				array(
					'render_callback' => is_file( $render_path ) ? $this->get_render_callback( $block ) : null,
				)
			);
		}
	}

	/**
	 * Get the render callback function name for a block.
	 *
	 * @param string $block Block slug.
	 * @return callable|null
	 */
	private function get_render_callback( $block ) {
		$map = array(
			'post-list'  => 'reme_render_post_list',
			'file-embed' => 'reme_render_file_embed',
		);

		return isset( $map[ $block ] ) ? $map[ $block ] : null;
	}

	/**
	 * Enqueue block assets for frontend rendering.
	 *
	 * @return void
	 */
	public function enqueue_block_assets() {
		wp_enqueue_style(
			'reme-blocks',
			$this->block_url . 'assets/css/blocks.css',
			array(),
			$this->version
		);
	}

	/**
	 * Enqueue block assets for the editor.
	 *
	 * @return void
	 */
	public function enqueue_block_editor_assets() {
		wp_enqueue_style(
			'reme-blocks-editor',
			$this->block_url . 'assets/css/blocks-editor.css',
			array(),
			$this->version
		);

		wp_enqueue_script(
			'reme-blocks-editor',
			$this->block_url . 'assets/js/blocks-editor.js',
			array( 'wp-blocks', 'wp-element', 'wp-components', 'wp-i18n' ),
			$this->version,
			true
		);
	}
}

new Block_Loader();
