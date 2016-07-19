(function () {
	'use strict';

	angular
		.module('app')
		.controller('popCtrl', popCtrl);

	function popCtrl($scope, $q, $timeout, pop, modal) {
		this.delete = v => {
			this.m1.open({
				locals: {
					v: v
				}
			});
		};
	}
})();
