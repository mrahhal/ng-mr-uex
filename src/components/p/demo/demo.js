(function () {
	'use strict';

	angular
		.module('app')
		.controller('pCtrl', pCtrl);

	function pCtrl($scope, $q, $timeout) {
		var defer = shouldError => {
			var deferred = $q.defer();
			$timeout(() => {
				if (shouldError) {
					deferred.reject();
				} else {
					deferred.resolve();
				}
			}, 2000);
			return deferred.promise;
		};

		$scope.check4 = false;

		$scope.submit1 = () => $timeout(2000);

		$scope.submit2 = () => defer(this.shouldError);

		$scope.submit3 = () => defer(this.shouldError2);

		$scope.submit4 = () => defer().then(() => $scope.check4 = !$scope.check4);
	}
})();
