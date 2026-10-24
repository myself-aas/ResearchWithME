<?php
/**
 * Settings screen for PDF & Special Editions.
 *
 * Built on the WordPress Settings API with explicit sanitization and
 * capability checks, per the wp-plugin-development skill guidance.
 *
 * @package RWM_PDF_Editions
 */

namespace RWM_PDF\Includes;

defined( 'ABSPATH' ) || exit;

/**
 * Class RWM_PDF_Settings
 */
class RWM_PDF_Settings {

	/**
	 * Option name.
	 */
	const OPTION = 'rwm_pdf_settings';

	/**
	 * Settings group.
	 */
	const GROUP = 'rwm_pdf_settings_group';

	/**
	 * Get merged options with defaults.
	 *
	 * @return array Options.
	 */
	public static function get_options() {
		$defaults = array(
			'default_enabled'  => 1,
			'default_license'  => 'CC-BY-4.0',
			'doi_prefix'       => '10.5555/rwm',
			'auto_button'      => 1,
			'auto_build'       => 0,
			'enabled_cadences' => array( 'monthly' ),
			'limit'            => 50,
			'tags'             => array(),
			'categories'       => array(),
			'featured_only'    => array(),
		);

		$options = get_option( self::OPTION, array() );

		return wp_parse_args( is_array( $options ) ? $options : array(), $defaults );
	}

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function init() {
		add_action( 'admin_menu', array( $this, 'add_menu' ) );
		add_action( 'admin_init', array( $this, 'register_settings' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_styles' ) );
		add_action( 'add_meta_boxes', array( $this, 'add_article_meta_box' ) );
		add_action( 'save_post', array( $this, 'save_article_meta' ) );
	}

	/**
	 * Register the settings page.
	 *
	 * @return void
	 */
	public function add_menu() {
		add_submenu_page(
			'edit.php?post_type=' . RWM_PDF_Editions::POST_TYPE,
			__( 'PDF & Editions Settings', 'rwm-pdf-editions' ),
			__( 'Settings', 'rwm-pdf-editions' ),
			'manage_options',
			'rwm-pdf-settings',
			array( $this, 'render_page' )
		);
	}

	/**
	 * Register settings, sections, and fields.
	 *
	 * @return void
	 */
	public function register_settings() {
		register_setting(
			self::GROUP,
			self::OPTION,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( $this, 'sanitize' ),
				'default'           => array(),
			)
		);

		add_settings_section(
			'rwm_pdf_articles',
			__( 'Article PDFs', 'rwm-pdf-editions' ),
			array( $this, 'section_articles_intro' ),
			'rwm-pdf-settings'
		);

		add_settings_section(
			'rwm_pdf_editions',
			__( 'Scheduled Special Editions', 'rwm-pdf-editions' ),
			array( $this, 'section_editions_intro' ),
			'rwm-pdf-settings'
		);

		$fields = array(
			array( 'default_enabled', __( 'Enable PDF downloads by default', 'rwm-pdf-editions' ), 'checkbox', 'rwm_pdf_articles' ),
			array( 'auto_button', __( 'Append download button to articles', 'rwm-pdf-editions' ), 'checkbox', 'rwm_pdf_articles' ),
			array( 'default_license', __( 'Default content license', 'rwm-pdf-editions' ), 'license', 'rwm_pdf_articles' ),
			array( 'doi_prefix', __( 'DOI prefix', 'rwm-pdf-editions' ), 'text', 'rwm_pdf_articles' ),
			array( 'auto_build', __( 'Automatically compile editions', 'rwm-pdf-editions' ), 'checkbox', 'rwm_pdf_editions' ),
			array( 'enabled_cadences', __( 'Enabled cadences', 'rwm-pdf-editions' ), 'cadences', 'rwm_pdf_editions' ),
			array( 'limit', __( 'Maximum articles per edition', 'rwm-pdf-editions' ), 'number', 'rwm_pdf_editions' ),
		);

		foreach ( $fields as $field ) {
			add_settings_field(
				'rwm_pdf_' . $field[0],
				$field[1],
				array( $this, 'render_field' ),
				'rwm-pdf-settings',
				$field[3],
				array(
					'key'  => $field[0],
					'type' => $field[2],
				)
			);
		}
	}

	/**
	 * Articles section description.
	 *
	 * @return void
	 */
	public function section_articles_intro() {
		echo '<p>' . esc_html__( 'Control per-article PDF generation, default licensing, and DOI minting.', 'rwm-pdf-editions' ) . '</p>';
	}

	/**
	 * Editions section description.
	 *
	 * @return void
	 */
	public function section_editions_intro() {
		echo '<p>' . esc_html__( 'Compiled editions run twice daily and build one record per closed period. Tag, category, and featured filters can be applied per cadence via the rwm_pdf_edition_query_args filter.', 'rwm-pdf-editions' ) . '</p>';
	}

	/**
	 * Render a settings field.
	 *
	 * @param array $args Field arguments.
	 *
	 * @return void
	 */
	public function render_field( $args ) {
		$options = self::get_options();
		$key     = $args['key'];
		$name    = self::OPTION . '[' . $key . ']';
		$value   = isset( $options[ $key ] ) ? $options[ $key ] : '';

		switch ( $args['type'] ) {
			case 'checkbox':
				printf(
					'<label><input type="checkbox" name="%1$s" value="1" %2$s /> %3$s</label>',
					esc_attr( $name ),
					checked( (bool) $value, true, false ),
					esc_html__( 'Enabled', 'rwm-pdf-editions' )
				);
				break;

			case 'number':
				printf(
					'<input type="number" min="1" max="100" name="%1$s" value="%2$d" class="small-text" />',
					esc_attr( $name ),
					(int) $value
				);
				break;

			case 'license':
				echo '<select name="' . esc_attr( $name ) . '">';
				foreach ( RWM_PDF_Licensing::LICENSES as $license_key => $license ) {
					printf(
						'<option value="%1$s" %2$s>%3$s</option>',
						esc_attr( $license_key ),
						selected( $value, $license_key, false ),
						esc_html( $license['name'] )
					);
				}
				echo '</select>';
				break;

			case 'cadences':
				$selected = is_array( $value ) ? $value : array();
				foreach ( RWM_PDF_Editions::CADENCES as $cadence_key => $cadence ) {
					printf(
						'<label style="display:inline-block;margin-right:14px;"><input type="checkbox" name="%1$s[]" value="%2$s" %3$s /> %4$s</label>',
						esc_attr( $name ),
						esc_attr( $cadence_key ),
						checked( in_array( $cadence_key, $selected, true ), true, false ),
						esc_html( $cadence['label'] )
					);
				}
				break;

			case 'text':
			default:
				printf(
					'<input type="text" name="%1$s" value="%2$s" class="regular-text" />',
					esc_attr( $name ),
					esc_attr( (string) $value )
				);
				break;
		}
	}

	/**
	 * Sanitize the submitted settings array.
	 *
	 * @param mixed $input Raw input.
	 *
	 * @return array Clean settings.
	 */
	public function sanitize( $input ) {
		$input = is_array( $input ) ? $input : array();

		$clean = array(
			'default_enabled'  => empty( $input['default_enabled'] ) ? 0 : 1,
			'auto_button'      => empty( $input['auto_button'] ) ? 0 : 1,
			'auto_build'       => empty( $input['auto_build'] ) ? 0 : 1,
			'default_license'  => isset( $input['default_license'] ) && isset( RWM_PDF_Licensing::LICENSES[ $input['default_license'] ] )
				? sanitize_key( $input['default_license'] )
				: 'CC-BY-4.0',
			'doi_prefix'       => isset( $input['doi_prefix'] ) ? preg_replace( '/[^0-9A-Za-z.\-\/]/', '', (string) $input['doi_prefix'] ) : '10.5555/rwm',
			'limit'            => isset( $input['limit'] ) ? max( 1, min( 100, absint( $input['limit'] ) ) ) : 50,
			'enabled_cadences' => array(),
			'tags'             => array(),
			'categories'       => array(),
			'featured_only'    => array(),
		);

		if ( isset( $input['enabled_cadences'] ) && is_array( $input['enabled_cadences'] ) ) {
			foreach ( $input['enabled_cadences'] as $cadence ) {
				if ( isset( RWM_PDF_Editions::CADENCES[ $cadence ] ) ) {
					$clean['enabled_cadences'][] = sanitize_key( $cadence );
				}
			}
		}

		return $clean;
	}

	/**
	 * Render the settings page.
	 *
	 * @return void
	 */
	public function render_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'PDF & Special Editions', 'rwm-pdf-editions' ); ?></h1>
			<form action="options.php" method="post">
				<?php
				settings_fields( self::GROUP );
				do_settings_sections( 'rwm-pdf-settings' );
				submit_button();
				?>
			</form>
			<hr />
			<h2><?php esc_html_e( 'Manual build', 'rwm-pdf-editions' ); ?></h2>
			<p><?php esc_html_e( 'Build the last closed period for a cadence right now.', 'rwm-pdf-editions' ); ?></p>
			<form method="post">
				<?php wp_nonce_field( 'rwm_pdf_manual_build', 'rwm_pdf_build_nonce' ); ?>
				<select name="rwm_pdf_cadence">
					<?php foreach ( RWM_PDF_Editions::CADENCES as $key => $cadence ) : ?>
						<option value="<?php echo esc_attr( $key ); ?>"><?php echo esc_html( $cadence['label'] ); ?></option>
					<?php endforeach; ?>
				</select>
				<?php submit_button( __( 'Compile edition', 'rwm-pdf-editions' ), 'secondary', 'rwm_pdf_manual_build', false ); ?>
			</form>
			<?php $this->maybe_handle_manual_build(); ?>
		</div>
		<?php
	}

	/**
	 * Handle the manual build form.
	 *
	 * @return void
	 */
	private function maybe_handle_manual_build() {
		if ( ! isset( $_POST['rwm_pdf_manual_build'] ) ) {
			return;
		}

		if ( ! isset( $_POST['rwm_pdf_build_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['rwm_pdf_build_nonce'] ) ), 'rwm_pdf_manual_build' ) ) {
			echo '<div class="notice notice-error"><p>' . esc_html__( 'Security check failed.', 'rwm-pdf-editions' ) . '</p></div>';
			return;
		}

		if ( ! current_user_can( 'manage_options' ) ) {
			echo '<div class="notice notice-error"><p>' . esc_html__( 'You do not have permission to do this.', 'rwm-pdf-editions' ) . '</p></div>';
			return;
		}

		$cadence = isset( $_POST['rwm_pdf_cadence'] ) ? sanitize_key( wp_unslash( $_POST['rwm_pdf_cadence'] ) ) : 'monthly';

		$result = RWM_PDF_Editions::create_edition(
			array(
				'cadence'       => $cadence,
				'period_offset' => 1,
			)
		);

		if ( is_wp_error( $result ) ) {
			printf(
				'<div class="notice notice-warning"><p>%s</p></div>',
				esc_html( $result->get_error_message() )
			);
			return;
		}

		printf(
			'<div class="notice notice-success"><p>%s <a href="%s">%s</a></p></div>',
			esc_html__( 'Edition compiled.', 'rwm-pdf-editions' ),
			esc_url( RWM_PDF_Editions::get_edition_pdf_url( $result ) ),
			esc_html__( 'Download PDF', 'rwm-pdf-editions' )
		);
	}

	/**
	 * Add the article PDF meta box.
	 *
	 * @return void
	 */
	public function add_article_meta_box() {
		add_meta_box(
			'rwm_pdf_article',
			__( 'PDF & Licensing', 'rwm-pdf-editions' ),
			array( $this, 'render_article_meta_box' ),
			'post',
			'side',
			'default'
		);
	}

	/**
	 * Render the article meta box.
	 *
	 * @param \WP_Post $post Post object.
	 *
	 * @return void
	 */
	public function render_article_meta_box( $post ) {
		wp_nonce_field( 'rwm_pdf_article_meta', 'rwm_pdf_article_nonce' );

		$enabled = get_post_meta( $post->ID, '_rwm_pdf_enabled', true );
		$license = get_post_meta( $post->ID, '_rwm_pdf_license', true );
		$doi     = get_post_meta( $post->ID, '_rwm_doi', true );
		?>
		<p>
			<label>
				<input type="checkbox" name="rwm_pdf_enabled" value="1" <?php checked( $enabled, '1' ); ?> />
				<?php esc_html_e( 'Allow PDF download', 'rwm-pdf-editions' ); ?>
			</label>
		</p>
		<p>
			<label for="rwm_pdf_license"><strong><?php esc_html_e( 'License', 'rwm-pdf-editions' ); ?></strong></label><br />
			<select name="rwm_pdf_license" id="rwm_pdf_license" style="width:100%;">
				<option value=""><?php esc_html_e( 'Use site default', 'rwm-pdf-editions' ); ?></option>
				<?php foreach ( RWM_PDF_Licensing::LICENSES as $key => $item ) : ?>
					<option value="<?php echo esc_attr( $key ); ?>" <?php selected( $license, $key ); ?>><?php echo esc_html( $item['badge_text'] ); ?></option>
				<?php endforeach; ?>
			</select>
		</p>
		<p>
			<label for="rwm_doi"><strong><?php esc_html_e( 'DOI', 'rwm-pdf-editions' ); ?></strong></label>
			<input type="text" name="rwm_doi" id="rwm_doi" value="<?php echo esc_attr( (string) $doi ); ?>" style="width:100%;" placeholder="<?php echo esc_attr( RWM_PDF_Licensing::get_post_doi( $post->ID ) ); ?>" />
		</p>
		<?php if ( RWM_PDF_Editions::is_download_allowed( $post->ID ) ) : ?>
			<p><a class="button button-secondary" target="_blank" rel="noopener" href="<?php echo esc_url( RWM_PDF_Editions::get_article_pdf_url( $post->ID ) ); ?>"><?php esc_html_e( 'Preview PDF', 'rwm-pdf-editions' ); ?></a></p>
		<?php endif; ?>
		<?php
	}

	/**
	 * Save article meta.
	 *
	 * @param int $post_id Post ID.
	 *
	 * @return void
	 */
	public function save_article_meta( $post_id ) {
		if ( ! isset( $_POST['rwm_pdf_article_nonce'] ) ) {
			return;
		}

		if ( ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['rwm_pdf_article_nonce'] ) ), 'rwm_pdf_article_meta' ) ) {
			return;
		}

		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}

		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}

		update_post_meta( $post_id, '_rwm_pdf_enabled', isset( $_POST['rwm_pdf_enabled'] ) ? '1' : '0' );

		$license = isset( $_POST['rwm_pdf_license'] ) ? sanitize_key( wp_unslash( $_POST['rwm_pdf_license'] ) ) : '';
		if ( $license && isset( RWM_PDF_Licensing::LICENSES[ $license ] ) ) {
			update_post_meta( $post_id, '_rwm_pdf_license', $license );
		} else {
			delete_post_meta( $post_id, '_rwm_pdf_license' );
		}

		$doi = isset( $_POST['rwm_doi'] ) ? sanitize_text_field( wp_unslash( $_POST['rwm_doi'] ) ) : '';
		if ( $doi ) {
			update_post_meta( $post_id, '_rwm_doi', $doi );
		} else {
			delete_post_meta( $post_id, '_rwm_doi' );
		}
	}

	/**
	 * Enqueue small inline admin styles.
	 *
	 * @param string $hook Current admin page.
	 *
	 * @return void
	 */
	public function enqueue_admin_styles( $hook ) {
		if ( 'rwm_edition_page_rwm-pdf-settings' !== $hook && 'post.php' !== $hook ) {
			return;
		}

		$css = '.rwm-editions-list{margin:0;padding:0;list-style:none}.rwm-edition-item{margin:0 0 10px;padding:12px 16px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc}';
		wp_add_inline_style( 'common', $css );
	}
}
