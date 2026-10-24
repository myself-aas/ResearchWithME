<?php


namespace HFG\Core;


use ReMe\Core\Styles\Generator;

class Css_Generator extends Generator {
	/**
	 * Css_Generator constructor.
	 */
	public function __construct() {
		$this->_subscribers = [];
	}
}
