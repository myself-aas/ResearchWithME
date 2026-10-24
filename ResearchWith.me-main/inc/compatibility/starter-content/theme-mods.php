<?php
/**
 * Starter content theme mods definition.
 *
 * @package ReMe\Compatibility\Starter_Content
 */
return array(
	'logo_show_tagline'                            => 0,
	'hfg_header_layout_v2'                         => '{"desktop":{"top":{"left":[],"c-left":[],"center":[],"c-right":[],"right":[]},"main":{"left":[{"id":"logo"}],"c-left":[],"center":[],"c-right":[],"right":[{"id":"primary-menu"},{"id":"button_base"}]},"bottom":{"left":[],"c-left":[],"center":[],"c-right":[],"right":[]}},"mobile":{"top":{"left":[],"c-left":[],"center":[],"c-right":[],"right":[]},"main":{"left":[{"id":"logo"}],"c-left":[],"center":[],"c-right":[],"right":[{"id":"nav-icon"}]},"bottom":{"left":[],"c-left":[],"center":[],"c-right":[],"right":[]},"sidebar":[{"id":"primary-menu"},{"id":"button_base"}]}}',
	'hfg_header_layout_main_height'                => '{"mobile":60,"tablet":70,"desktop":80,"suffix":{"mobile":"px","tablet":"px","desktop":"px"}}',
	'hfg_header_layout_main_bottom_border'         => '{"mobile":1,"tablet":1,"desktop":1,"suffix":{"mobile":"px","tablet":"px","desktop":"px"}}',
	'hfg_header_layout_main_border_color'          => 'var(--rm-c-1)',
	'hfg_header_layout_main_layout'                => 'layout-full-contained',
	'button_base_text_setting'                     => 'Contact',
	'button_base_link_setting'                     => home_url( '/contact/' ),
	'button_base_new_tab'                          => 0,
	'nav-icon_button_appearance'                   =>
	array(
		'borderRadius'          =>
		array(
			'top'    => '3',
			'left'   => '3',
			'bottom' => '3',
			'right'  => '3',
		),
		'borderWidth'           =>
		array(
			'top'    => 1,
			'right'  => 1,
			'bottom' => 1,
			'left'   => 1,
		),
		'useShadow'             => false,
		'shadowColor'           => 'rgba(0,0,0,0.5)',
		'shadowProperties'      =>
		array(
			'blur'   => 5,
			'width'  => 0,
			'height' => 0,
		),
		'useShadowHover'        => false,
		'shadowColorHover'      => 'rgba(0,0,0,0.5)',
		'shadowPropertiesHover' =>
		array(
			'blur'   => 5,
			'width'  => 0,
			'height' => 0,
		),
		'type'                  => 'outline',
		'background'            => '',
		'backgroundHover'       => '',
		'text'                  => '',
		'textHover'             => '',
	),
	'hfg_header_layout_top_background'             =>
	array(
		'type'              => 'color',
		'colorValue'        => '#f0f0f0',
		'imageUrl'          => '',
		'focusPoint'        =>
		array(
			'x' => 0.5,
			'y' => 0.5,
		),
		'overlayColorValue' => '',
		'overlayOpacity'    => 50,
		'fixed'             => false,
		'useFeatured'       => false,
	),
	'hfg_header_layout_main_background'            =>
	array(
		'type'              => 'color',
		'imageUrl'          => '',
		'focusPoint'        =>
		array(
			'x' => 0.5,
			'y' => 0.5,
		),
		'colorValue'        => 'var(--rm-site-bg)',
		'overlayColorValue' => '',
		'overlayOpacity'    => 50,
		'fixed'             => false,
		'useFeatured'       => false,
	),
	'hfg_header_layout_bottom_background'          =>
	array(
		'type'              => 'color',
		'colorValue'        => '#ffffff',
		'imageUrl'          => '',
		'focusPoint'        =>
		array(
			'x' => 0.5,
			'y' => 0.5,
		),
		'overlayColorValue' => '',
		'overlayOpacity'    => 50,
		'fixed'             => false,
		'useFeatured'       => false,
	),
	'hfg_header_layout_sidebar_background'         =>
	array(
		'type'              => 'color',
		'imageUrl'          => '',
		'focusPoint'        =>
		array(
			'x' => 0.5,
			'y' => 0.5,
		),
		'colorValue'        => 'var(--rm-site-bg)',
		'overlayColorValue' => '',
		'overlayOpacity'    => 50,
		'fixed'             => false,
		'useFeatured'       => false,
	),
	'hfg_footer_layout_top_background'             =>
	array(
		'type'              => 'color',
		'colorValue'        => '#ffffff',
		'imageUrl'          => '',
		'focusPoint'        =>
		array(
			'x' => 0.5,
			'y' => 0.5,
		),
		'overlayColorValue' => '',
		'overlayOpacity'    => 50,
		'fixed'             => false,
		'useFeatured'       => false,
	),
	'hfg_footer_layout_bottom_background'          =>
	array(
		'type'              => 'color',
		'imageUrl'          => '',
		'focusPoint'        =>
		array(
			'x' => 0.5,
			'y' => 0.5,
		),
		'colorValue'        => 'var(--rm-dark-bg)',
		'overlayColorValue' => '',
		'overlayOpacity'    => 50,
		'fixed'             => false,
		'useFeatured'       => false,
	),
	'reme_blog_archive_layout'                     => 'grid',
	'reme_post_meta_ordering'                      => '["author","comments"]',
	'reme_advanced_layout_options'                 => true,
	'reme_blog_archive_sidebar_layout'             => 'full-width',
	'reme_blog_archive_content_width'              => 100,
	'reme_body_font_family'                        => 'Nunito Sans',
	'reme_headings_font_family'                    => 'Bricolage Grotesque',
	'reme_button_appearance'                       =>
	array(
		'borderRadius'          =>
		array(
			'top'    => '4',
			'right'  => '4',
			'bottom' => '4',
			'left'   => '4',
		),
		'borderWidth'           =>
		array(
			'top'    => 1,
			'right'  => 1,
			'bottom' => 1,
			'left'   => 1,
		),
		'useShadow'             => false,
		'shadowColor'           => 'rgba(0,0,0,0.5)',
		'shadowProperties'      =>
		array(
			'blur'   => 5,
			'width'  => 0,
			'height' => 0,
		),
		'useShadowHover'        => false,
		'shadowColorHover'      => 'rgba(0,0,0,0.5)',
		'shadowPropertiesHover' =>
		array(
			'blur'   => 5,
			'width'  => 0,
			'height' => 0,
		),
		'type'                  => 'fill',
		'background'            => 'var(--rm-primary-accent)',
		'backgroundHover'       => 'var(--rm-secondary-accent)',
		'text'                  => '#fefefe',
		'textHover'             => '#ffffff',
	),
	'reme_h1_typeface_general'                     =>
	array(
		'fontWeight'    => '600',
		'textTransform' => 'none',
		'letterSpacing' =>
		array(
			'mobile'  => 0,
			'tablet'  => 0,
			'desktop' => 0,
		),
		'lineHeight'    =>
		array(
			'mobile'  => '1.2',
			'tablet'  => '1.3',
			'desktop' => '1.3',
			'suffix'  =>
			array(
				'mobile'  => 'em',
				'tablet'  => 'em',
				'desktop' => 'em',
			),
		),
		'fontSize'      =>
		array(
			'mobile'  => '39',
			'tablet'  => '55',
			'desktop' => 70,
			'suffix'  =>
			array(
				'mobile'  => 'px',
				'tablet'  => 'px',
				'desktop' => 'px',
			),
		),
		'flag'          => true,
	),
	'reme_container_width'                         => '{"mobile":748,"tablet":992,"desktop":1170}',
	'reme_default_container_style'                 => 'contained',
	'reme_text_color'                              => '#2b2b2b',
	'reme_h3_typeface_general'                     =>
	array(
		'fontWeight'    => '600',
		'textTransform' => 'none',
		'letterSpacing' =>
		array(
			'mobile'  => 0,
			'tablet'  => 0,
			'desktop' => 0,
		),
		'lineHeight'    =>
		array(
			'mobile'  => '1.3',
			'tablet'  => '1.3',
			'desktop' => '1.3',
			'suffix'  =>
			array(
				'mobile'  => 'em',
				'tablet'  => 'em',
				'desktop' => 'em',
			),
		),
		'fontSize'      =>
		array(
			'mobile'  => '20',
			'tablet'  => '20',
			'desktop' => '24',
			'suffix'  =>
			array(
				'mobile'  => 'px',
				'tablet'  => 'px',
				'desktop' => 'px',
			),
		),
		'flag'          => false,
	),
	'reme_other_pages_sidebar_layout'              => 'full-width',
	'reme_single_post_content_width'               => 70,
	'reme_other_pages_content_width'               => 100,
	'primary-menu_color'                           => 'var(--rm-text-color)',
	'primary-menu_active_color'                    => 'var(--rm-text-color)',
	'primary-menu_hover_color'                     => 'var(--rm-secondary-accent)',
	'primary-menu_component_typeface'              =>
	array(
		'fontSize'      =>
		array(
			'suffix'  =>
			array(
				'mobile'  => 'em',
				'tablet'  => 'em',
				'desktop' => 'em',
			),
			'mobile'  => 1,
			'tablet'  => 1,
			'desktop' => 0.8,
		),
		'lineHeight'    =>
		array(
			'mobile'  => 1.6,
			'tablet'  => 1.6,
			'desktop' => 1.6,
		),
		'letterSpacing' =>
		array(
			'mobile'  => 0,
			'tablet'  => 0,
			'desktop' => 0,
		),
		'fontWeight'    => '500',
		'textTransform' => 'none',
	),
	'reme_link_color'                              => '#2563eb',
	'reme_link_hover_color'                        => '#1d4ed8',
	'reme_secondary_button_appearance'             =>
	array(
		'borderRadius'          =>
		array(
			'top'    => '4',
			'right'  => '4',
			'bottom' => '4',
			'left'   => '4',
		),
		'borderWidth'           =>
		array(
			'top'    => '2',
			'right'  => '2',
			'bottom' => '2',
			'left'   => '2',
		),
		'useShadow'             => false,
		'shadowColor'           => 'rgba(0,0,0,0.5)',
		'shadowProperties'      =>
		array(
			'blur'   => 5,
			'width'  => 0,
			'height' => 0,
		),
		'useShadowHover'        => false,
		'shadowColorHover'      => 'rgba(0,0,0,0.5)',
		'shadowPropertiesHover' =>
		array(
			'blur'   => 5,
			'width'  => 0,
			'height' => 0,
		),
		'type'                  => 'outline',
		'background'            => 'rgba(0, 0, 0, 0)',
		'backgroundHover'       => 'var(--rm-secondary-accent)',
		'text'                  => 'var(--rm-primary-accent)',
		'textHover'             => 'var(--rm-text-dark-bg)',
	),
	'logo_max_width'                               => '{"mobile":32,"tablet":32,"desktop":32}',
	'reme_button_padding'                          =>
	array(
		'mobile'       =>
		array(
			'top'    => '12',
			'right'  => '24',
			'bottom' => '12',
			'left'   => '24',
		),
		'tablet'       =>
		array(
			'top'    => '12',
			'right'  => '24',
			'bottom' => '12',
			'left'   => '24',
		),
		'desktop'      =>
		array(
			'top'    => '12',
			'right'  => '24',
			'bottom' => '12',
			'left'   => '24',
		),
		'mobile-unit'  => 'px',
		'tablet-unit'  => 'px',
		'desktop-unit' => 'px',
	),
	'reme_secondary_button_padding'                =>
	array(
		'mobile'       =>
		array(
			'top'    => '12',
			'right'  => '24',
			'bottom' => '12',
			'left'   => '24',
		),
		'tablet'       =>
		array(
			'top'    => '12',
			'right'  => '24',
			'bottom' => '12',
			'left'   => '24',
		),
		'desktop'      =>
		array(
			'top'    => '12',
			'right'  => '24',
			'bottom' => '12',
			'left'   => '24',
		),
		'mobile-unit'  => 'px',
		'tablet-unit'  => 'px',
		'desktop-unit' => 'px',
	),
	'reme_blog_list_alternative_layout'            => true,
	'reme_h4_typeface_general'                     =>
	array(
		'fontWeight'    => '600',
		'textTransform' => 'none',
		'letterSpacing' =>
		array(
			'mobile'  => 0,
			'tablet'  => 0,
			'desktop' => 0,
		),
		'lineHeight'    =>
		array(
			'mobile'  => '1.3',
			'tablet'  => '1.3',
			'desktop' => '1.3',
			'suffix'  =>
			array(
				'mobile'  => 'em',
				'tablet'  => 'em',
				'desktop' => 'em',
			),
		),
		'fontSize'      =>
		array(
			'mobile'  => '16',
			'tablet'  => '16',
			'desktop' => '20',
			'suffix'  =>
			array(
				'mobile'  => 'px',
				'tablet'  => 'px',
				'desktop' => 'px',
			),
		),
		'flag'          => false,
	),
	'reme_h5_typeface_general'                     =>
	array(
		'fontWeight'    => '600',
		'textTransform' => 'none',
		'letterSpacing' =>
		array(
			'mobile'  => 0,
			'tablet'  => 0,
			'desktop' => 0,
		),
		'lineHeight'    =>
		array(
			'mobile'  => '1.3',
			'tablet'  => '1.3',
			'desktop' => '1.3',
			'suffix'  =>
			array(
				'mobile'  => 'em',
				'tablet'  => 'em',
				'desktop' => 'em',
			),
		),
		'fontSize'      =>
		array(
			'mobile'  => '14',
			'tablet'  => '14',
			'desktop' => '16',
			'suffix'  =>
			array(
				'mobile'  => 'px',
				'tablet'  => 'px',
				'desktop' => 'px',
			),
		),
		'flag'          => false,
	),
	'reme_h6_typeface_general'                     =>
	array(
		'fontWeight'    => '600',
		'textTransform' => 'none',
		'letterSpacing' =>
		array(
			'mobile'  => 0,
			'tablet'  => 0,
			'desktop' => 0,
		),
		'lineHeight'    =>
		array(
			'mobile'  => '1.3',
			'tablet'  => '1.3',
			'desktop' => '1.3',
			'suffix'  =>
			array(
				'mobile'  => 'em',
				'tablet'  => 'em',
				'desktop' => 'em',
			),
		),
		'fontSize'      =>
		array(
			'mobile'  => '14',
			'tablet'  => '14',
			'desktop' => '16',
			'suffix'  =>
			array(
				'mobile'  => 'px',
				'tablet'  => 'px',
				'desktop' => 'px',
			),
		),
		'flag'          => false,
	),
	'reme_global_colors'                           =>
	array(
		'activePalette' => 'base',
		'palettes'      =>
		array(
			'base'     =>
			array(
				// translators: name of the color pallet.
				'name'          => __( 'Base', 'reme' ),
				'allowDeletion' => false,
				'colors'        =>
				array(
					'rm-primary-accent'   => '#2563eb',
					'rm-secondary-accent' => '#1d4ed8',
					'rm-site-bg'          => '#ffffff',
					'rm-light-bg'         => '#f1f5f9',
					'rm-dark-bg'          => '#111827',
					'rm-text-color'       => '#1f2937',
					'rm-text-dark-bg'     => '#ffffff',
					'rm-c-1'              => '#e5e7eb',
					'rm-c-2'              => '#5b6472',
				),
			),
			'darkMode' =>
			array(
				'name'          => __( 'Dark Mode', 'reme' ),
				'allowDeletion' => false,
				'colors'        =>
				array(
					'rm-primary-accent'   => '#0065cb',
					'rm-secondary-accent' => '#0057ad',
					'rm-site-bg'          => '#0d1821',
					'rm-light-bg'         => '#14232f',
					'rm-dark-bg'          => '#070e13',
					'rm-text-color'       => '#ffffff',
					'rm-text-dark-bg'     => '#ffffff',
					'rm-c-1'              => '#77b978',
					'rm-c-2'              => '#f37262',
				),
			),
			'eastBay'  =>
			array(
				// translators: name of the color pallet.
				'name'          => __( 'East Bay', 'reme' ),
				'allowDeletion' => true,
				'colors'        =>
				array(
					'rm-primary-accent'   => '#4b547d',
					'rm-secondary-accent' => '#3f4669',
					'rm-site-bg'          => '#ffffff',
					'rm-light-bg'         => '#c6caed',
					'rm-dark-bg'          => '#000500',
					'rm-text-color'       => '#121212',
					'rm-text-dark-bg'     => '#ffffff',
					'rm-c-1'              => '#77b978',
					'rm-c-2'              => '#f37262',
				),
			),
			'green'    =>
			array(
				'name'          => __( 'Green', 'reme' ),
				'allowDeletion' => true,
				'colors'        =>
				array(
					'rm-primary-accent'   => '#04724d',
					'rm-secondary-accent' => '#04583c',
					'rm-site-bg'          => '#ffffff',
					'rm-light-bg'         => '#f1f0ea',
					'rm-dark-bg'          => '#0d1821',
					'rm-text-color'       => '#2c2c2c',
					'rm-text-dark-bg'     => '#ffffff',
					'rm-c-1'              => '#77b978',
					'rm-c-2'              => '#f37262',
				),
			),
		),
	),
	'hfg_footer_layout_bottom_new_text_color'      => 'var(--rm-text-dark-bg)',
	'logo_display'                                 => 'logoTitle',
	'reme_button_typeface'                         =>
	array(
		'fontSize'      =>
		array(
			'suffix'  =>
			array(
				'mobile'  => 'px',
				'tablet'  => 'px',
				'desktop' => 'px',
			),
			'mobile'  => '14',
			'tablet'  => '14',
			'desktop' => '18',
		),
		'flag'          => false,
		'lineHeight'    =>
		array(
			'suffix'  =>
			array(
				'mobile'  => 'em',
				'tablet'  => 'em',
				'desktop' => 'em',
			),
			'mobile'  => 1.6,
			'tablet'  => 1.6,
			'desktop' => 1.6,
		),
		'textTransform' => 'capitalize',
	),
	'reme_secondary_button_typeface'               =>
	array(
		'fontSize' =>
		array(
			'suffix'  =>
			array(
				'mobile'  => 'px',
				'tablet'  => 'px',
				'desktop' => 'px',
			),
			'mobile'  => '14',
			'tablet'  => '14',
			'desktop' => '16',
		),
		'flag'     => false,
	),
	'reme_fallback_font_family'                    => 'Arial, Helvetica, sans-serif',
	'reme_form_fields_padding'                     =>
	array(
		'top'    => '10',
		'bottom' => 10,
		'left'   => 12,
		'right'  => 12,
		'unit'   => 'px',
	),
	'reme_form_button_type'                        => 'primary',
	'reme_form_fields_border_radius'               =>
	array(
		'top'    => '0',
		'right'  => '0',
		'left'   => '0',
		'bottom' => '0',
		'unit'   => 'px',
	),
	'reme_single_post_typography_post_title'       =>
	array(
		'fontSize'   =>
		array(
			'suffix'  =>
			array(
				'mobile'  => 'px',
				'tablet'  => 'px',
				'desktop' => 'px',
			),
			'mobile'  => '28',
			'tablet'  => '40',
			'desktop' => '65',
		),
		'flag'       => true,
		'lineHeight' =>
		array(
			'suffix'  =>
			array(
				'mobile'  => 'em',
				'tablet'  => 'em',
				'desktop' => 'em',
			),
			'mobile'  => '',
			'tablet'  => '',
			'desktop' => '',
		),
	),
	'reme_had_old_skin'                            => false,
	'footer_copyright_color'                       => 'var(--rm-text-dark-bg)',
	'footer_copyright_content'                     => '&copy; ' . gmdate( 'Y' ) . ' ResearchWith.me. All rights reserved.',
	'footer_copyright_component_align'             =>
	array(
		'desktop' => 'center',
		'tablet'  => 'center',
		'mobile'  => 'center',
	),
	'hfg_footer_layout_v2'                         => '{"desktop":{"top":{"left":[],"c-left":[],"center":[],"c-right":[],"right":[]},"main":{"left":[],"c-left":[],"center":[],"c-right":[],"right":[]},"bottom":{"left":[],"c-left":[{"id":"footer_copyright"},{"id":"footer-menu"}],"center":[],"c-right":[],"right":[]}},"mobile":{"top":{"left":[],"c-left":[],"center":[],"c-right":[],"right":[]},"main":{"left":[],"c-left":[],"center":[],"c-right":[],"right":[]},"bottom":{"left":[],"c-left":[],"center":[],"c-right":[],"right":[]}}}',
	'reme_form_fields_spacing'                     => 4,
	'reme_form_fields_background_color'            => 'var(--rm-site-bg)',
	'footer_copyright_component_typeface'          =>
	array(
		'fontSize'      =>
		array(
			'suffix'  =>
			array(
				'mobile'  => 'em',
				'tablet'  => 'em',
				'desktop' => 'em',
			),
			'mobile'  => 1,
			'tablet'  => 1,
			'desktop' => 1,
		),
		'lineHeight'    =>
		array(
			'mobile'  => 1.6,
			'tablet'  => 1.6,
			'desktop' => 1.6,
			'suffix'  =>
			array(
				'mobile'  => 'em',
				'tablet'  => 'em',
				'desktop' => 'em',
			),
		),
		'letterSpacing' =>
		array(
			'mobile'  => 0,
			'tablet'  => 0,
			'desktop' => 0,
		),
		'fontWeight'    => '500',
		'textTransform' => 'none',
	),
	'reme_post_cover_height'                       => '{"mobile":250,"tablet":30,"desktop":50,"suffix":{"tablet":"vh","desktop":"vh","mobile":"px"}}',
	'reme_post_title_alignment'                    =>
	array(
		'mobile'  => 'left',
		'tablet'  => 'left',
		'desktop' => 'left',
	),
	'reme_post_cover_text_color'                   => 'var(--rm-text-dark-bg)',
	'reme_post_cover_title_boxed_layout'           => false,
	'reme_post_cover_title_boxed_background_color' => 'var(--rm-dark-bg)',
	'reme_enable_masonry'                          => false,
	'reme_post_thumbnail_box_shadow'               => 0,
	'primary-menu_style'                           => 'style-plain',
	'reme_post_cover_background_color'             => 'var(--rm-secondary-accent)',
	'reme_post_cover_padding'                      =>
	array(
		'mobile'       =>
		array(
			'top'    => 40,
			'right'  => 15,
			'bottom' => 40,
			'left'   => 15,
		),
		'tablet'       =>
		array(
			'top'    => 60,
			'right'  => 30,
			'bottom' => 60,
			'left'   => 30,
		),
		'desktop'      =>
		array(
			'top'    => 60,
			'right'  => 40,
			'bottom' => '60',
			'left'   => 40,
		),
		'mobile-unit'  => 'px',
		'tablet-unit'  => 'px',
		'desktop-unit' => 'px',
	),
	'reme_post_cover_overlay_opacity'              => 80,
	'reme_post_cover_container'                    => 'contained',
	'reme_post_cover_title_boxed_padding'          =>
	array(
		'mobile'       =>
		array(
			'top'    => 40,
			'right'  => 15,
			'bottom' => 40,
			'left'   => 15,
		),
		'tablet'       =>
		array(
			'top'    => 60,
			'right'  => 30,
			'bottom' => 60,
			'left'   => 30,
		),
		'desktop'      =>
		array(
			'top'    => 60,
			'right'  => 40,
			'bottom' => '60',
			'left'   => 40,
		),
		'mobile-unit'  => 'px',
		'tablet-unit'  => 'px',
		'desktop-unit' => 'px',
	),
	'reme_single_post_meta_ordering'               => '["author","date"]',
	'reme_form_fields_border_width'                =>
	array(
		'top'    => '2',
		'right'  => '2',
		'left'   => '2',
		'bottom' => '2',
		'unit'   => 'px',
	),
	'reme_form_fields_border_color'                => 'var(--rm-c-2)',
	'reme_input_text_color'                        => 'var(--rm-text-color)',
	'footer-menu_component_align'                  =>
	array(
		'desktop' => 'right',
		'tablet'  => 'left',
		'mobile'  => 'left',
	),
	'hfg_footer_layout_bottom_columns_number'      => 2,
	'custom_logo'                                  => '{{default-logo}}',
	'logo_color'                                   => 'var(--rm-text-color)',
	'reme_blog_post_meta_fields'                   => '[{"slug":"author","title":"' . __( 'Author', 'reme' ) . '","visibility":"yes","hide_on_mobile":"","blocked":"yes"},{"slug":"comments","title":"' . __( 'Comments', 'reme' ) . '","visibility":"yes","hide_on_mobile":"","blocked":"yes"},{"slug":"category","title":"' . __( 'Category', 'reme' ) . '","visibility":"yes","hide_on_mobile":"","blocked":"yes"},{"slug":"date","title":"' . __( 'Date', 'reme' ) . '","visibility":"no","hide_on_mobile":"","blocked":"yes"}]',
	// V4 changes.
	'reme_blog_items_border_radius'                => 8,
	'reme_blog_content_padding'                    => [
		'mobile'       => [
			'top'    => 25,
			'right'  => 25,
			'bottom' => 25,
			'left'   => 25,
		],
		'tablet'       => [
			'top'    => 25,
			'right'  => 25,
			'bottom' => 25,
			'left'   => 25,
		],
		'desktop'      => [
			'top'    => 25,
			'right'  => 25,
			'bottom' => 25,
			'left'   => 25,
		],
		'mobile-unit'  => 'px',
		'tablet-unit'  => 'px',
		'desktop-unit' => 'px',
	],
	'reme_enable_card_style'                       => true,
	'reme_blog_grid_card_bg_color'                 => 'var(--rm-site-bg)',
	'reme_blog_grid_text_color'                    => 'var(--rm-text-color)',
	'reme_blog_card_shadow'                        => 0.5,
	'reme_blog_archive_aspect_ratio'               => '4-3',
	'reme_post_excerpt_length'                     => 35,
	'reme_layout_single_post_elements_order'       => wp_json_encode(
		[
			'title-meta',
			'content',
			'tags',
			'comments',
		]
	),
	'reme_single_post_sidebar_layout'              => 'full-width',
	'reme_archive_hide_title'                      => true,
);
