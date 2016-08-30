(function () {
	'use strict';

	angular.module('app').component('pPage', {
		templateUrl: '/src/components/p/demo/demo.html',
		controller: $ctrl
	});

	function $ctrl($scope, $q, $timeout) {
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

		this.check4 = false;

		this.submit1 = () => $timeout(2000);

		this.submit2 = () => defer(this.shouldError);

		this.submit3 = () => defer(this.shouldError2);

		this.submit4 = () => defer().then(() => this.check4 = !this.check4);
	}
})();
