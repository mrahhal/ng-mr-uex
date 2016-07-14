(function () {
	'use strict';

	angular
		.module('mr.uex')
		.directive('uexPopContainer', popContainer)
		.directive('uexPopTarget', popTarget)
		.directive('uexPop', pop);

	function popContainer() {
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

	function popTarget() {
		return {
			restrict: 'A',
			scope: false,
			require: {
				popContainer: '^uexPopContainer'
			},
			bindToController: true,
			controllerAs: '$ctrl',
			controller: function ($element) {
				this.$onInit = () => {
					this.popContainer.registerTarget($element);
				};
			}
		};
	}

	function pop(pop) {
		return {
			restrict: 'EA',
			terminate: true,
			transclude: true,
			scope: true,
			require: {
				popContainer: '^uexPopContainer'
			},
			bindToController: {
				delegate: '=',
				placement: '@',
				align: '@',
				classes: '@'
			},
			controllerAs: '$ctrl',
			controller: function ($scope, $element, $transclude) {
				var target;
				this.$onInit = () => {
					target = this.popContainer.getTarget();
				};

				this.delegate = {
					open: () => {
						var scope = $scope.$new();
						$transclude(scope, clone => {
							var instance = pop({
								scope: scope,
								target: target,
								placement: this.placement,
								align: this.align,
								classes: this.classes,
								template: clone
							});
							instance.onDismiss(() => {
								scope.$destroy();
							});
						});
					}
				};
			}
		};
	}
})();
