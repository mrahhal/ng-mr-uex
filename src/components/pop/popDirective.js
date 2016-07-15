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
				delegate: '=?',
				placement: '@',
				align: '@',
				on: '@'
			},
			controllerAs: '$ctrl',
			controller: function ($scope, $element, $attrs, $transclude) {
				var target,
					classes = $attrs.class;
				$element.removeClass();

				this.on = this.on || 'click';

				var showPop = () => {
					var scope = $scope.$new();
					$transclude(scope, clone => {
						var instance = pop({
							scope: scope,
							target: target,
							placement: this.placement,
							align: this.align,
							class: classes,
							template: clone
						});
						instance.onDismiss(() => {
							scope.$destroy();
						});
					});
				};

				this.$onInit = () => {
					target = this.popContainer.getTarget();

					if (this.on === 'click') {
						target.on('click', () => {
							showPop();
							$scope.$applyAsync();
						});
					} else if (this.on === 'hover') {
						target.on('mouseenter', () => {
							showPop();
							$scope.$applyAsync();
						});
					}
				};

				this.delegate = {
					open: () => {
						showPop();
					}
				};
			}
		};
	}
})();
