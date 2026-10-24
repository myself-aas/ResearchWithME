<?php
/**
 * Template used for component rendering wrapper.
 *
 * Author:          Uriahs Victor
 * Created on:      06/01/2022 (d/m/y)
 * 
 * @package HFG
 */

namespace HFG;

$edd_separator = apply_filters( 'rm_edd_cart_total_separator', '-' );
?>

<div class="component-wrap">
	<div class="responsive-nav-cart menu-item-nav-cart">
		<a href="<?php echo esc_url( edd_get_checkout_uri() ); ?>" class="cart-icon-wrapper">
			<?php reme_cart_icon( true, 15, 'cart-icon-style1' ); ?>
			<span class="screen-reader-text">
				<?php esc_html_e( 'Cart', 'reme' ); ?>
			</span>
			<span class="edd-cart-count">
			<span class="edd-cart-quantity">
				<?php echo esc_html( edd_get_cart_quantity() ); ?>
			</span>
			</span>
			<?php do_action( 'reme_cart_icon_after_cart_total' ); ?>
		</a>
	</div>
</div>
