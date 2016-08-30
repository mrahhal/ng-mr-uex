(function () {
	'use strict';

	angular.module('mr.uex').component('uexCheckbox', {
		template: '\
			<div class="_uex-icon" ng-class="{\'checked\': $ctrl.model}"></div>\
			<ng-transclude class="_uex-label"></ng-transclude>',
		transclude: true,
		controller: $ctrl,
		require: {
			ngModelCtrl: 'ngModel'
		},
		bindings: {
			model: '=ngModel'
		}
	});

	function $ctrl($scope, $element) {
		var render = () => {
			if (this.model) {
				$element.addClass('checked');
			} else {
				$element.removeClass('checked');
			}
		};

		$scope.$watch(() => this.model, render);

		var clickListener = e => {
			if (e.isDefaultPrevented() || $element.attr('disabled')) {
				return;
			}

			$scope.$apply(() => {
				var viewValue = !this.model;
				this.ngModelCtrl.$setViewValue(viewValue);
			});
		}

		this.$postLink = () => {
			$element.on('click', clickListener);
		};
	}
})();
