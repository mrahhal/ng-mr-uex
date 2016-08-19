(function () {
	'use strict';

	angular
		.module('mr.uex')
		.factory('uexUtil', util);

	function util() {
		return {
			camelToDash: str => {
				return str.replace(/\W+/g, '-')
					.replace(/([a-z\d])([A-Z])/g, '$1-$2');
			},
			dashToCamel: str => {
				return str.replace(/\W+(.)/g, function (x, chr) {
					return chr.toUpperCase();
				})
			}
		};
	}
})();
