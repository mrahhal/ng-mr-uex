(function () {
	'use strict';

	angular
		.module('mr.uex')
		.directive('uexPoptipContainer', poptipContainer)
		.directive('uexPoptipTarget', poptipTarget)
		.directive('uexPoptip', poptip);

	function poptipContainer() {
		return {
			restrict: 'A',
			scope: false,
			controller: function () {
				var _targetElement;

				this.registerTarget = targetElement => {
					_targetElement = targetElement;
				};

				this.getTarget = () => _targetElement;
			}
		};
	}

	function poptipTarget() {
		return {
			restrict: 'A',
			scope: false,
			require: {
				poptipContainer: '^uexPoptipContainer'
			},
			bindToController: true,
			controllerAs: '$uexPoptipTargetCtrl',
			controller: function ($element) {
				this.$onInit = () => {
					this.poptipContainer.registerTarget($element);
				};
			}
		};
	}

	function poptip(uexPoptip) {
		return {
			restrict: 'E',
			terminal: true,
			scope: false,
			template: ($element, $attrs) => {
				$attrs.$html = $element.html();
				$element.empty();
			},
			bindToController: true,
			require: {
				poptipContainer: '^uexPoptipContainer'
			},
			controllerAs: '$uexPoptipCtrl',
			controller: function ($scope, $element, $attrs) {
				var template = $attrs.$html;

				this.$onInit = () => {
					var target = this.poptipContainer.getTarget();

					uexPoptip({
						scope: $scope,
						target: target,
						placement: $attrs.placement,
						classes: $attrs['class'],
						trigger: $attrs.trigger,
						template: template
					});
				};
			}
		};
	}
})();
