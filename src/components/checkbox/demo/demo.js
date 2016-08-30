(function () {
	'use strict';

	angular.module('app').component('checkboxPage', {
		templateUrl: '/src/components/checkbox/demo/demo.html',
		controller: $ctrl
	});

	function $ctrl($scope) {
		this.check1 = false;
		this.check2 = true;
		this.check3 = false;
		this.check4 = false;

		this.toggle4 = e => {
			e.preventDefault();
			console.log(this.check4);
		};
	}
})();
