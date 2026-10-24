/**
 * Customizer order control.
 *
 * @package ReMe\Customizer\Controls
 */
( function ( $ ) {
	'use strict';
	wp.remeHeadingAccordion = {
		init: function () {
			this.handleToggle();
		},
		handleToggle: function () {
			$( '.customize-control-customizer-heading.accordion .reme-customizer-heading' ).on( 'click', function () {
				var accordion = $( this ).closest( '.accordion' );
				$( accordion ).toggleClass( 'expanded' );
				return false;
			} );
		},
	};

	$( document ).ready(
		function () {
			wp.remeHeadingAccordion.init();
		}
	);
} )( jQuery );
