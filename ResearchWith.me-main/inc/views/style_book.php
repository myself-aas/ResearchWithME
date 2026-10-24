<?php
/**
 * Style Book
 *
 * @package ReMe\Views
 */

namespace ReMe\Views;

/**
 * Class Style_Book
 */
class Style_Book extends Base_View {

	/**
	 * Add hooks for the front end.
	 */
	public function init() {
		add_action( 'wp_head', array( $this, 'add_style_book_content' ) );
	}

	/**
	 * Add Style Book content to the footer when in customizer preview.
	 * 
	 * @return void
	 */
	public function add_style_book_content() {
		if ( ! is_customize_preview() ) {
			return;
		}

		$colors = [
			'rm-primary-accent'   => [
				'name'    => __( 'Primary Accent', 'reme' ),
				'section' => 'reme_colors_background_section',
			],
			'rm-secondary-accent' => [
				'name'    => __( 'Secondary Accent', 'reme' ),
				'section' => 'reme_colors_background_section',
			],
			'rm-site-bg'          => [
				'name'    => __( 'Site Background', 'reme' ),
				'section' => 'reme_colors_background_section',
			],
			'rm-light-bg'         => [
				'name'    => __( 'Light Background', 'reme' ),
				'section' => 'reme_colors_background_section',
			],
			'rm-dark-bg'          => [
				'name'    => __( 'Dark Background', 'reme' ),
				'section' => 'reme_colors_background_section',
			],
			'rm-text-color'       => [
				'name'    => __( 'Text Color', 'reme' ),
				'section' => 'reme_colors_background_section',
			],
			'rm-text-dark-bg'     => [
				'name'    => __( 'Text Dark Background', 'reme' ),
				'section' => 'reme_colors_background_section',
			],
			'rm-c-1'              => [
				'name'    => __( 'Extra Color 1', 'reme' ),
				'section' => 'reme_colors_background_section',
			],
			'rm-c-2'              => [
				'name'    => __( 'Extra Color 2', 'reme' ),
				'section' => 'reme_colors_background_section',
			],
		];

		?>
			<div id="rm-sb-container" style="display:none;">
				<!-- Close button in top left -->
				<div class="rm-sb-close-btn" role="button" tabindex="0" aria-label="<?php esc_attr_e( 'Close', 'reme' ); ?>">
					<span class="dashicons dashicons-no-alt"></span>
				</div>

				<div class="rm-sb-grid">
					<!-- Colors Section -->
					<div class="rm-sb-section full-section">
						<h2 class="rm-sb-section-title"><?php esc_html_e( 'Palette Colors', 'reme' ); ?></h2>

						<div class="rm-sb-color-grid">
							<?php foreach ( $colors as $color_var => $color_data ) : ?>
							<div class="rm-sb-color-swatch builder-item-focus" data-section="<?php echo esc_attr( $color_data['section'] ); ?>" data-control="reme-color-slug-<?php echo esc_attr( $color_var ); ?>">
								<div class="rm-sb-color-box" style="background: var(--<?php echo esc_attr( $color_var ); ?>);"></div>
								<div class="rm-sb-color-info">
									<div class="rm-sb-color-name"><?php echo esc_html( $color_data['name'] ); ?></div>
								</div>
							</div>
							<?php endforeach; ?>
						</div>
					</div>

					<!-- Typography Section -->
					<div class="rm-sb-section full-section">
						<h2 class="rm-sb-section-title"><?php esc_html_e( 'Typography', 'reme' ); ?></h2>

						<div class="rm-sb-typography-grid">
							<div>
								<div class="rm-sb-type-sample">
								<?php
								$headings = [
									1 => 'reme_h1_accordion_wrap',
									2 => 'reme_h2_accordion_wrap',
									3 => 'reme_h3_accordion_wrap',
									4 => 'reme_h4_accordion_wrap',
									5 => 'reme_h5_accordion_wrap',
									6 => 'reme_h6_accordion_wrap',
								];

								foreach ( $headings as $level => $control_id ) : 
									?>
									<h<?php echo (int) $level; ?> class="builder-item-focus" data-section="<?php echo esc_attr( $control_id ); ?>" data-control="<?php echo esc_attr( $control_id ); ?>">
										<?php 
										/* translators: %d: heading level number */
										echo sprintf( esc_html__( 'Heading %d', 'reme' ), (int) $level ); 
										?>
									</h<?php echo (int) $level; ?>>
								<?php endforeach; ?>
								</div>
							</div>

							<div>
								<p class="builder-item-focus" data-section="reme_typography_general" style="font-size: 1.1rem; margin: 0 0 20px 0;">
									<?php echo esc_html( wp_get_theme()->get( 'Description' ) ); ?>
								</p>

								<p class="builder-item-focus" data-section="reme_typography_general" style="margin: 0 0 15px 0;">
									<?php esc_html_e( 'Design unique website sections without touching code. Create custom headers, footers, and content areas that match your vision.', 'reme' ); ?>
								</p>
							</div>
						</div>
					</div>

					<!-- Buttons Section -->
					<div class="rm-sb-section">
						<h2 class="rm-sb-section-title"><?php esc_html_e( 'Buttons', 'reme' ); ?></h2>

						<div class="rm-sb-button-group">
							<button class="rm-sb-btn-primary builder-item-focus" data-section="reme_buttons_section" data-control="reme_button_appearance_heading">
								<?php esc_html_e( 'Primary Button', 'reme' ); ?>
							</button>
							<button class="rm-sb-btn-secondary builder-item-focus" data-section="reme_buttons_section" data-control="reme_secondary_button_appearance_heading">
								<?php esc_html_e( 'Secondary Button', 'reme' ); ?>
							</button>
						</div>
					</div>

					<!-- Form Elements Section -->
						<div class="rm-sb-section">
							<h2 class="rm-sb-section-title"><?php esc_html_e( 'Form Fields', 'reme' ); ?></h2>
							<form class="rm-sb-form">
								<div class="rm-sb-form-group builder-item-focus" data-section="reme_form_fields_section">
									<label for="text-input"><?php esc_html_e( 'Input Text', 'reme' ); ?></label>
									<input type="text" id="text-input" placeholder="<?php esc_attr_e( 'Placeholder', 'reme' ); ?>">
								</div>
								<div class="rm-sb-form-group builder-item-focus" data-section="reme_form_fields_section">
									<label for="textarea"><?php esc_html_e( 'Textarea', 'reme' ); ?></label>
									<textarea id="textarea" placeholder="<?php esc_attr_e( 'Placeholder', 'reme' ); ?>"></textarea>
								</div>
								<div class="rm-sb-form-group builder-item-focus" data-section="reme_form_fields_section">
									<label for="select"><?php esc_html_e( 'Dropdown', 'reme' ); ?></label>
									<select id="select">
										<option>
											<?php 
											/* translators: %d: heading level number */
											echo sprintf( esc_html__( 'Heading %d', 'reme' ), 1 ); 
											?>
										</option>
										<option>
											<?php 
											/* translators: %d: heading level number */
											echo sprintf( esc_html__( 'Heading %d', 'reme' ), 2 ); 
											?>
										</option>
										<option>
											<?php 
											/* translators: %d: heading level number */
											echo sprintf( esc_html__( 'Heading %d', 'reme' ), 3 ); 
											?>
										</option>
									</select>
								</div>
							</form>
						</div>
				</div>
			</div>
		<?php
	}
}
