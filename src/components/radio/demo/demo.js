(function () {
	'use strict';

	angular.module('app').component('radioPage', {
		templateUrl: '/src/components/radio/demo/demo.html',
		controller: $ctrl
	});

	function $ctrl($scope) {
		this.m1 = 'val1';
		this.m2 = 'val1';
	}
})();
