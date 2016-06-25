{
	'use strict';

	angular.module('app').controller('uexAutocompleteCtrl', function ($scope, $timeout, $q) {
		$scope.items = [{
			name: 'item1'
		}, {
			name: 'item2'
		}];

		this.items = $scope.items;

		$scope.getItems = function (q) {
			return $timeout(function () {
				var items = [];
				for (var i = 0; i < $scope.items.length; i++) {
					if (!q || $scope.items[i].name.indexOf(q) > -1) {
						items.push($scope.items[i]);
					}
				}
				return items;
			}, 2000);
		};
	});

}
