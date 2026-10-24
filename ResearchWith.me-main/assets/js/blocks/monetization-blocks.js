/**
 * ReMe monetization blocks — block editor registrations.
 *
 * Hand-written, dependency-light, no build step. Each block is dynamic: the
 * editor renders a static preview placeholder and the PHP render callback
 * produces the real markup on the front end, so third-party ad scripts never
 * run inside the editor canvas.
 *
 * @package ReMe
 */

( function ( wp ) {
	if ( ! wp || ! wp.blocks || ! wp.blockEditor ) {
		return;
	}

	var el = wp.element.createElement;
	var __ = wp.i18n.__;
	var registerBlockType = wp.blocks.registerBlockType;
	var useBlockProps = wp.blockEditor.useBlockProps;
	var InspectorControls = wp.blockEditor.InspectorControls;
	var PanelBody = wp.components.PanelBody;
	var TextControl = wp.components.TextControl;
	var TextareaControl = wp.components.TextareaControl;
	var ToggleControl = wp.components.ToggleControl;
	var RangeControl = wp.components.RangeControl;
	var SelectControl = wp.components.SelectControl;
	var Placeholder = wp.components.Placeholder;

	/**
	 * Build inspector controls from a declarative field list.
	 *
	 * @param {Object}   props       Block props.
	 * @param {Array}    fields      Field descriptors.
	 * @return {Object} Inspector element.
	 */
	function inspectorFor( props, fields ) {
		var panels = fields.map( function ( group ) {
			var controls = group.fields.map( function ( field ) {
				var value = props.attributes[ field.name ];
				var common = {
					key: field.name,
					label: field.label,
					help: field.help,
				};

				if ( 'toggle' === field.type ) {
					return el(
						ToggleControl,
						Object.assign( {}, common, {
							checked: !! value,
							onChange: function ( next ) {
								var patch = {};
								patch[ field.name ] = next;
								props.setAttributes( patch );
							},
						} )
					);
				}

				if ( 'textarea' === field.type ) {
					return el(
						TextareaControl,
						Object.assign( {}, common, {
							value: value || '',
							rows: field.rows || 4,
							onChange: function ( next ) {
								var patch = {};
								patch[ field.name ] = next;
								props.setAttributes( patch );
							},
						} )
					);
				}

				if ( 'number' === field.type ) {
					return el(
						RangeControl,
						Object.assign( {}, common, {
							value: Number( value ) || 0,
							min: field.min,
							max: field.max,
							step: field.step || 1,
							onChange: function ( next ) {
								var patch = {};
								patch[ field.name ] = next;
								props.setAttributes( patch );
							},
						} )
					);
				}

				if ( 'select' === field.type ) {
					return el(
						SelectControl,
						Object.assign( {}, common, {
							value: value,
							options: field.options,
							onChange: function ( next ) {
								var patch = {};
								patch[ field.name ] = next;
								props.setAttributes( patch );
							},
						} )
					);
				}

				return el(
					TextControl,
					Object.assign( {}, common, {
						value: value || '',
						onChange: function ( next ) {
							var patch = {};
							patch[ field.name ] = next;
							props.setAttributes( patch );
						},
					} )
				);
			} );

			return el( PanelBody, { key: group.title, title: group.title, initialOpen: true }, controls );
		} );

		return el( InspectorControls, {}, panels );
	}

	/**
	 * Static preview shown in the editor instead of live ad markup.
	 *
	 * @param {string} title    Preview label.
	 * @param {string} subtitle Supporting text.
	 * @param {string} tone     Modifier class.
	 * @return {Object} Preview element.
	 */
	function preview( title, subtitle, tone ) {
		return el(
			Placeholder,
			{
				label: title,
				instructions: subtitle,
				className: 'reme-block-preview reme-block-preview--' + ( tone || 'default' ),
			},
			el( 'span', { className: 'reme-block-preview__badge' }, __( 'Preview only — scripts paused', 'reme' ) )
		);
	}

	/* --------------------------------------------------------------------
	 * Ad unit
	 * ----------------------------------------------------------------- */

	registerBlockType( 'reme/ad-unit', {
		apiVersion: 2,
		title: __( 'ReMe Ad Unit', 'reme' ),
		description: __( 'CLS-safe, lazy-loaded ad slot for AdSense, Adsterra, Mediavine, or custom code.', 'reme' ),
		category: 'widgets',
		icon: 'money-alt',
		keywords: [ 'ad', 'adsense', 'monetize' ],
		supports: { html: false, align: [ 'wide', 'full' ] },
		attributes: {
			network: { type: 'string', default: 'adsense' },
			slotSize: { type: 'string', default: 'rectangle' },
			adClient: { type: 'string', default: '' },
			adSlot: { type: 'string', default: '' },
			customCode: { type: 'string', default: '' },
			imageUrl: { type: 'string', default: '' },
			targetUrl: { type: 'string', default: '' },
			label: { type: 'string', default: __( 'Advertisement', 'reme' ) },
			lazyLoad: { type: 'boolean', default: true },
			reserveSpace: { type: 'boolean', default: true },
			alignment: { type: 'string', default: 'center' },
		},
		edit: function ( props ) {
			var a = props.attributes;
			return el(
				'div',
				useBlockProps(),
				inspectorFor( props, [
					{
						title: __( 'Ad network', 'reme' ),
						fields: [
							{
								name: 'network',
								label: __( 'Network', 'reme' ),
								type: 'select',
								options: [
									{ value: 'adsense', label: 'Google AdSense' },
									{ value: 'adsterra', label: 'Adsterra' },
									{ value: 'mediavine', label: 'Mediavine' },
									{ value: 'image', label: __( 'Image banner / sponsor', 'reme' ) },
									{ value: 'custom', label: __( 'Custom HTML', 'reme' ) },
								],
							},
							{
								name: 'slotSize',
								label: __( 'Slot size', 'reme' ),
								type: 'select',
								options: [
									{ value: 'responsive', label: __( 'Responsive (fluid)', 'reme' ) },
									{ value: 'leaderboard', label: '728×90 Leaderboard' },
									{ value: 'rectangle', label: '300×250 Rectangle' },
									{ value: 'large-rectangle', label: '336×280 Large rectangle' },
									{ value: 'half-page', label: '300×600 Half page' },
									{ value: 'billboard', label: '970×250 Billboard' },
									{ value: 'mobile-leaderboard', label: '320×50 Mobile' },
								],
								help: __( 'Reserving the slot size prevents layout shift as the ad loads.', 'reme' ),
							},
							{
								name: 'label',
								label: __( 'Disclosure label', 'reme' ),
								type: 'text',
							},
							{
								name: 'alignment',
								label: __( 'Alignment', 'reme' ),
								type: 'select',
								options: [
									{ value: 'center', label: __( 'Center', 'reme' ) },
									{ value: 'left', label: __( 'Left', 'reme' ) },
									{ value: 'right', label: __( 'Right', 'reme' ) },
								],
							},
						],
					},
					{
						title: __( 'Creative', 'reme' ),
						fields:
							'adsense' === a.network
								? [
										{ name: 'adClient', label: __( 'Publisher ID', 'reme' ), type: 'text', help: 'ca-pub-…' },
										{ name: 'adSlot', label: __( 'Ad slot ID', 'reme' ), type: 'text' },
								  ]
								: [
										{ name: 'customCode', label: __( 'Custom HTML / script', 'reme' ), type: 'textarea', rows: 6 },
										{ name: 'imageUrl', label: __( 'Image URL', 'reme' ), type: 'text' },
										{ name: 'targetUrl', label: __( 'Destination URL', 'reme' ), type: 'text' },
								  ],
					},
					{
						title: __( 'Performance', 'reme' ),
						fields: [
							{ name: 'lazyLoad', label: __( 'Lazy load near viewport', 'reme' ), type: 'toggle' },
							{ name: 'reserveSpace', label: __( 'Reserve slot dimensions', 'reme' ), type: 'toggle' },
						],
					},
				] ),
				preview(
					__( 'Ad unit', 'reme' ),
					a.network + ' · ' + a.slotSize + ' · ' + a.label,
					'monetization'
				)
			);
		},
		save: function () {
			return null;
		},
	} );

	/* --------------------------------------------------------------------
	 * Affiliate product card
	 * ----------------------------------------------------------------- */

	registerBlockType( 'reme/affiliate-product', {
		apiVersion: 2,
		title: __( 'ReMe Affiliate Product', 'reme' ),
		description: __( 'Accessible product review card with pricing, pros and cons, coupons, and sponsored links.', 'reme' ),
		category: 'widgets',
		icon: 'cart',
		keywords: [ 'affiliate', 'product', 'review' ],
		supports: { html: false },
		attributes: {
			title: { type: 'string', default: '' },
			brand: { type: 'string', default: '' },
			badge: { type: 'string', default: __( "Editor's Choice", 'reme' ) },
			rating: { type: 'number', default: 4.8 },
			price: { type: 'string', default: '' },
			originalPrice: { type: 'string', default: '' },
			affiliateUrl: { type: 'string', default: '' },
			buttonText: { type: 'string', default: __( 'Check Latest Price', 'reme' ) },
			couponCode: { type: 'string', default: '' },
			imageUrl: { type: 'string', default: '' },
			description: { type: 'string', default: '' },
			pros: { type: 'string', default: '' },
			cons: { type: 'string', default: '' },
		},
		edit: function ( props ) {
			var a = props.attributes;
			return el(
				'div',
				useBlockProps(),
				inspectorFor( props, [
					{
						title: __( 'Product', 'reme' ),
						fields: [
							{ name: 'title', label: __( 'Product name', 'reme' ), type: 'text' },
							{ name: 'brand', label: __( 'Brand', 'reme' ), type: 'text' },
							{ name: 'badge', label: __( 'Badge', 'reme' ), type: 'text' },
							{ name: 'rating', label: __( 'Rating', 'reme' ), type: 'number', min: 0, max: 5, step: 0.1 },
							{ name: 'imageUrl', label: __( 'Image URL', 'reme' ), type: 'text' },
							{ name: 'description', label: __( 'Short description', 'reme' ), type: 'textarea', rows: 3 },
						],
					},
					{
						title: __( 'Offer', 'reme' ),
						fields: [
							{ name: 'price', label: __( 'Price', 'reme' ), type: 'text' },
							{ name: 'originalPrice', label: __( 'Original price', 'reme' ), type: 'text' },
							{ name: 'couponCode', label: __( 'Coupon code', 'reme' ), type: 'text' },
							{ name: 'affiliateUrl', label: __( 'Affiliate URL', 'reme' ), type: 'text', help: __( 'Rendered with rel="sponsored nofollow".', 'reme' ) },
							{ name: 'buttonText', label: __( 'Button label', 'reme' ), type: 'text' },
						],
					},
					{
						title: __( 'Pros & cons', 'reme' ),
						fields: [
							{ name: 'pros', label: __( 'Pros (one per line)', 'reme' ), type: 'textarea', rows: 4 },
							{ name: 'cons', label: __( 'Cons (one per line)', 'reme' ), type: 'textarea', rows: 4 },
						],
					},
				] ),
				preview(
					__( 'Affiliate product card', 'reme' ),
					( a.title || __( 'Untitled product', 'reme' ) ) + ' · ' + ( a.price || __( 'no price set', 'reme' ) ),
					'affiliate'
				)
			);
		},
		save: function () {
			return null;
		},
	} );

	/* --------------------------------------------------------------------
	 * Affiliate comparison table
	 * ----------------------------------------------------------------- */

	registerBlockType( 'reme/affiliate-comparison', {
		apiVersion: 2,
		title: __( 'ReMe Product Comparison', 'reme' ),
		description: __( 'Responsive comparison matrix for competing products or services.', 'reme' ),
		category: 'widgets',
		icon: 'columns',
		keywords: [ 'affiliate', 'comparison', 'table' ],
		supports: { html: false },
		attributes: {
			heading: { type: 'string', default: __( 'Top Recommendations at a Glance', 'reme' ) },
			items: { type: 'string', default: '[]' },
		},
		edit: function ( props ) {
			var items = [];
			try {
				items = JSON.parse( props.attributes.items || '[]' );
			} catch ( e ) {
				items = [];
			}

			return el(
				'div',
				useBlockProps(),
				inspectorFor( props, [
					{
						title: __( 'Comparison', 'reme' ),
						fields: [
							{ name: 'heading', label: __( 'Heading', 'reme' ), type: 'text' },
							{
								name: 'items',
								label: __( 'Rows (JSON)', 'reme' ),
								type: 'textarea',
								rows: 8,
								help: __( 'Array of {name, bestFor, rating, price, url, isFeatured}.', 'reme' ),
							},
						],
					},
				] ),
				preview(
					__( 'Comparison table', 'reme' ),
					( items.length ? items.length + ' ' + __( 'rows', 'reme' ) : __( 'No rows yet', 'reme' ) ) + ' · ' + props.attributes.heading,
					'affiliate'
				)
			);
		},
		save: function () {
			return null;
		},
	} );
} )( window.wp );
