(function () {
	'use strict';

	angular
		.module('app')
		.controller('popCtrl', popCtrl);

	function popCtrl($scope, $q, $timeout, pop, modal) {
		this.delete = v => {
			modal({
				template: 'Value: ' + v
			});
		};
	}
})();
