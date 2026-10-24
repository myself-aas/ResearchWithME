<?php
/**
 * Search & AI (SEO / AEO) Customizer controls.
 *
 * Exposes the switches that govern structured data, social cards, AI crawler
 * policy and machine-readable endpoints, plus the author profile fields
 * used by the Organization and Person schema nodes.
 *
 * @package ReMe\Customizer\Options
 */

namespace ReMe\Customizer\Options;

use ReMe\Customizer\Base_Customizer;
use ReMe\Customizer\Types\Control;
use ReMe\Customizer\Types\Section;
use ReMe\Views\Seo;

/**
 * Class Search_Ai
 *
 * @package ReMe\Customizer\Options
 */
class Search_Ai extends Base_Customizer {

	/**
	 * Section slug.
	 *
	 * @var string
	 */
	private $section_id = 'reme_search_ai';

	/**
	 * Add controls.
	 *
	 * @return void
	 */
	public function add_controls() {
		$this->add_section(
			new Section(
				$this->section_id,
				array(
					'priority' => 46,
					'title'    => __( 'Search & AI', 'reme' ),
				)
			)
		);

		$this->add_search_controls();
		$this->add_identity_controls();
		$this->add_ai_controls();
	}

	/**
	 * Structured data and social card toggles.
	 *
	 * @return void
	 */
	private function add_search_controls() {
		$this->add_control(
			new Control(
				'label_toggle_seo_heading',
				array(
					'sanitize_callback' => 'sanitize_text_field',
				),
				array(
					'label'            => __( 'Search appearance', 'reme' ),
					'section'          => $this->section_id,
					'priority'         => 5,
					'class'            => 'search-appearance-accordion',
					'accordion'        => true,
					'expanded'         => true,
					'controls_to_wrap' => 4,
				),
				'ReMe\Customizer\Controls\Heading'
			)
		);

		$this->add_control(
			new Control(
				Seo::MOD_STRUCTURED_DATA,
				array(
					'sanitize_callback' => 'reme_sanitize_checkbox',
					'default'           => true,
				),
				array(
					'label'       => __( 'Structured data (JSON-LD)', 'reme' ),
					'description' => __( 'BlogPosting and Person schema, Organization, breadcrumbs and affiliate Product graphs.', 'reme' ),
					'section'     => $this->section_id,
					'type'        => 'checkbox',
					'priority'    => 10,
				)
			)
		);

		$this->add_control(
			new Control(
				Seo::MOD_META_DESC,
				array(
					'sanitize_callback' => 'reme_sanitize_checkbox',
					'default'           => true,
				),
				array(
					'label'       => __( 'Meta descriptions', 'reme' ),
					'description' => __( 'Generated from the excerpt, trimmed for snippets. Ignored when an SEO plugin is active.', 'reme' ),
					'section'     => $this->section_id,
					'type'        => 'checkbox',
					'priority'    => 15,
				)
			)
		);

		$this->add_control(
			new Control(
				Seo::MOD_OPEN_GRAPH,
				array(
					'sanitize_callback' => 'reme_sanitize_checkbox',
					'default'           => true,
				),
				array(
					'label'       => __( 'Open Graph and X cards', 'reme' ),
					'section'     => $this->section_id,
					'type'        => 'checkbox',
					'priority'    => 20,
				)
			)
		);

		$this->add_control(
			new Control(
				Seo::MOD_DEFAULT_IMAGE,
				array(
					'sanitize_callback' => 'esc_url_raw',
					'default'           => '',
				),
				array(
					'label'       => __( 'Default share image', 'reme' ),
					'description' => __( 'Used when a page has no featured image. 1200 x 630 recommended.', 'reme' ),
					'section'     => $this->section_id,
					'type'        => 'text',
					'priority'    => 25,
				)
			)
		);
	}

	/**
	 * Author profile links used in schema Person sameAs lists.
	 *
	 * @return void
	 */
	private function add_identity_controls() {
		$this->add_control(
			new Control(
				'label_toggle_seo_identity',
				array(
					'sanitize_callback' => 'sanitize_text_field',
				),
				array(
					'label'            => __( 'Author profiles', 'reme' ),
					'section'          => $this->section_id,
					'priority'         => 30,
					'class'            => 'search-identity-accordion',
					'accordion'        => true,
					'expanded'         => true,
					'controls_to_wrap' => 4,
				),
				'ReMe\Customizer\Controls\Heading'
			)
		);

		$fields = array(
			'reme_social_website'  => __( 'Website URL', 'reme' ),
			'reme_social_mastodon' => __( 'Mastodon URL', 'reme' ),
			'reme_social_linkedin' => __( 'LinkedIn URL', 'reme' ),
			'reme_social_x'        => __( 'X / Twitter URL', 'reme' ),
		);

		$priority = 35;

		foreach ( $fields as $mod => $label ) {
			$this->add_control(
				new Control(
					$mod,
					array(
						'sanitize_callback' => 'esc_url_raw',
						'default'           => '',
					),
					array(
						'label'    => $label,
						'section'  => $this->section_id,
						'type'     => 'text',
						'priority' => $priority,
					)
				)
			);
			$priority += 5;
		}
	}

	/**
	 * AI crawler and machine-readable endpoint controls.
	 *
	 * @return void
	 */
	private function add_ai_controls() {
		$this->add_control(
			new Control(
				'label_toggle_seo_ai',
				array(
					'sanitize_callback' => 'sanitize_text_field',
				),
				array(
					'label'            => __( 'AI and agent access', 'reme' ),
					'section'          => $this->section_id,
					'priority'         => 60,
					'class'            => 'search-ai-accordion',
					'accordion'        => true,
					'expanded'         => true,
					'controls_to_wrap' => 5,
				),
				'ReMe\Customizer\Controls\Heading'
			)
		);

		$this->add_control(
			new Control(
				Seo::MOD_AI_SEARCH_BOTS,
				array(
					'sanitize_callback' => 'reme_sanitize_checkbox',
					'default'           => true,
				),
				array(
					'label'       => __( 'Allow AI search crawlers', 'reme' ),
					'description' => __( 'OAI-SearchBot, PerplexityBot, Claude-SearchBot and user-triggered fetchers. Allowing these makes citation possible.', 'reme' ),
					'section'     => $this->section_id,
					'type'        => 'checkbox',
					'priority'    => 65,
				)
			)
		);

		$this->add_control(
			new Control(
				Seo::MOD_AI_TRAIN_BOTS,
				array(
					'sanitize_callback' => 'reme_sanitize_checkbox',
					'default'           => false,
				),
				array(
					'label'       => __( 'Allow model-training crawlers', 'reme' ),
					'description' => __( 'GPTBot, ClaudeBot, CCBot and similar. Off by default so training use stays a licensing decision.', 'reme' ),
					'section'     => $this->section_id,
					'type'        => 'checkbox',
					'priority'    => 70,
				)
			)
		);

		$this->add_control(
			new Control(
				Seo::MOD_LLMS_TXT,
				array(
					'sanitize_callback' => 'reme_sanitize_checkbox',
					'default'           => false,
				),
				array(
					'label'       => __( 'Publish llms.txt', 'reme' ),
					'description' => __( 'Serves /llms.txt and /llms-full.txt. Experimental: no confirmed consumer standard, harmless when unused.', 'reme' ),
					'section'     => $this->section_id,
					'type'        => 'checkbox',
					'priority'    => 75,
				)
			)
		);

		$this->add_control(
			new Control(
				Seo::MOD_MARKDOWN,
				array(
					'sanitize_callback' => 'reme_sanitize_checkbox',
					'default'           => true,
				),
				array(
					'label'       => __( 'Markdown content negotiation', 'reme' ),
					'description' => __( 'Serve Markdown at the canonical URL when a client sends Accept: text/markdown. Browsers are unaffected.', 'reme' ),
					'section'     => $this->section_id,
					'type'        => 'checkbox',
					'priority'    => 80,
				)
			)
		);
	}
}
