(function () {
	'use strict';

	angular.module('app').component('popPage', {
		templateUrl: '/src/components/pop/demo/demo.html',
		controller: $ctrl
	});

	function $ctrl($scope) {
		this.delete = v => {
			this.m1.open({
				locals: {
					v: v
				}
			});
		};
	}
})();
