/**
 * Handle the layout preview.
 */
(function ( $ ) {
	$.remeLayoutPreview = {

		/**
		 * Initialize the layout preview functions.
		 */
		init: function () {
			this.contentWidthsPreview();
			this.containersLivePreview();
		},

		/**
		 * Define content width controls and correspondent properties.
		 */
		contentWidths: {
			'reme_sitewide_content_width': {
				content: '.reme-main > .container .col, .reme-main > .container-fluid .col',
				sidebar: '.rm-sidebar-wrap'
			},
			'reme_blog_archive_content_width': {
				content: '.archive-container .rm-index-posts',
				sidebar: '.archive-container .rm-sidebar-wrap'
			},
			'reme_single_post_content_width': {
				content: '.single-post-container .rm-single-post-wrap',
				sidebar: '.single-post-container .rm-sidebar-wrap'
			},
			'reme_shop_archive_content_width': {
				content: '.archive.woocommerce .shop-container .rm-shop.col',
				sidebar: '.archive.woocommerce .shop-container .rm-sidebar-wrap'
			},
			'reme_single_product_content_width': {
				content: '.single-product .shop-container .rm-shop.col',
				sidebar: '.single-product .shop-container .rm-sidebar-wrap'
			},
			'reme_other_pages_content_width': {
				content: 'body:not(.single):not(.archive):not(.blog):not(.search) .reme-main > .container .col',
				sidebar: 'body:not(.single):not(.archive):not(.blog):not(.search) .rm-sidebar-wrap'
			},
		},

		/**
		 * Run the content width previews.
		 */
		contentWidthsPreview: function () {
			$.each( this.contentWidths, function ( id, args ) {
				wp.customize( id, function ( value ) {
					value.bind( function ( newval ) {
						jQuery( args.content ).css( 'max-width', newval + '%' );
						jQuery( args.sidebar ).css( 'max-width', 100 - newval + '%' );
					} );
				} );
			} );
		},

		/**
		 * Define container theme mods and correspondent selectors.
		 */
		containersLayoutMap: {
			'reme_default_container_style': '.page:not(.woocommerce) .single-page-container',
			'reme_blog_archive_container_style': '.archive-container',
			'reme_single_post_container_style': '.single-post-container',
			'reme_shop_archive_container_style': '.woocommerce-page.post-type-archive .reme-main > div',
			'reme_single_product_container_style': '.single-product .reme-main > div',
		},

		/**
		 * Run the containers live preview.
		 */
		containersLivePreview: function () {
			'use strict';
			$.each( this.containersLayoutMap, function ( controlId, cssSelector ) {
				cssSelector += ':not(.set-in-metabox)';
				wp.customize( controlId, function ( value ) {
					value.bind( function ( newval ) {
						if ( newval === 'contained' ) {
							$( cssSelector ).removeClass( 'container-fluid' ).addClass( 'container' );
							return false;
						}
						$( cssSelector ).removeClass( 'container' ).addClass( 'container-fluid' );
					} );
				} );
			} );
		},
	};
})( jQuery );

jQuery.remeLayoutPreview.init();


