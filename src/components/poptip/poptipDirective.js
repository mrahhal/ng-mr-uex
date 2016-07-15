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
			controllerAs: '$ctrl',
			controller: function ($element) {
				this.$onInit = () => {
					this.poptipContainer.registerTarget($element);
				};
			}
		};
	}

	function poptip(poptip) {
		return {
			restrict: 'E',
			terminate: true,
			scope: false,
			bindToController: true,
			require: {
				poptipContainer: '^uexPoptipContainer'
			},
			link: function ($scope, $element) {
				$element.removeClass();
				$element.empty();
			},
			controllerAs: '$ctrl',
			controller: function ($scope, $element, $attrs, $transclude) {
				var target,
					classes = $attrs.class,
					template = $element.html();

				this.$onInit = () => {
					target = this.poptipContainer.getTarget();

					poptip({
						scope: $scope,
						target: target,
						placement: $attrs.placement,
						align: $attrs.align,
						class: classes,
						template: template
					});
				};
			}
		};
	}
})();
