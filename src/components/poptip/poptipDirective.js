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
			restrict: 'EA',
			terminate: true,
			transclude: true,
			scope: false,
			bindToController: true,
			require: {
				poptipContainer: '^uexPoptipContainer'
			},
			controllerAs: '$ctrl',
			controller: function ($scope, $element, $attrs, $transclude) {
				var target;

				this.$onInit = () => {
					target = this.poptipContainer.getTarget();

					$transclude($scope, clone => {
						poptip({
							scope: $scope,
							target: target,
							placement: $attrs.placement,
							align: $attrs.align,
							classes: $attrs.classes,
							template: clone
						});
					});
				};
			}
		};
	}
})();
