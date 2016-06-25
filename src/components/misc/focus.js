{
	'use strict';

	angular.module('mr.uex').directive('uexFocus', uexFocus);

	function uexFocus($timeout) {
		return {
			restrict: 'A',
			link: function ($scope, $element, $attrs) {
				$scope.$on('uex.focus', function () {
					$timeout(function () {
						$element.focus();
					});
				});
			}
		};
	}
}
