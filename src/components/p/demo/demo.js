(function () {
	'use strict';

	angular.module('app').controller('pCtrl', pCtrl);

	function pCtrl($scope, $q, $timeout) {
		var ctrl = this;
		this.shouldError = false;

		$scope.submit = function () {
			return $timeout(2000);
		};

		$scope.submit2 = function () {
			var deferred = $q.defer();
			$timeout(function () {
				if (ctrl.shouldError) {
					deferred.reject();
				} else {
					deferred.resolve();
				}
			}, 2000);
			return deferred.promise;
		};
	}
})();
