{
	'use strict';

	angular.module('mr.uex').directive('uexAlias', uexAlias);

	function uexAlias() {
		return {
			restrict: 'A',
			link: function ($scope, $element, $attrs) {
				var expr = $attrs.uexAlias,
					parts = expr.split(' '),
					source = parts[0],
					dest = parts[1];

				$scope.$watch(function () {
					return $scope.$eval(source);
				}, function (value) {
					$scope[dest] = value;
				});
			}
		};
	}
}
