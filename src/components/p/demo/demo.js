(function () {
	'use strict';

	angular.module('app').controller('pCtrl', pCtrl);

	function pCtrl($scope, $q, $timeout) {
		var ctrl = this;

		var defer = function (shouldError) {
			var deferred = $q.defer();
			$timeout(function () {
				if (shouldError) {
					deferred.reject();
				} else {
					deferred.resolve();
				}
			}, 2000);
			return deferred.promise;
		};

		$scope.submit1 = function () {
			return $timeout(2000);
		};

		$scope.submit2 = function () {
			return defer(ctrl.shouldError);
		};

		$scope.submit3 = function () {
			return defer(ctrl.shouldError2);
		};
	}
})();
