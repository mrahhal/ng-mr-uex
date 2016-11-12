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
			controllerAs: '$uexPopTargetCtrl',
			controller: function ($element) {
				this.$onInit = () => {
					this.popContainer.registerTarget($element);
				};
			}
		};
	}

	function pop(uexPop) {
		return {
			restrict: 'E',
			terminal: true,
			scope: true,
			require: {
				popContainer: '^uexPopContainer'
			},
			bindToController: {
				delegate: '=?'
			},
			controllerAs: '$uexPopCtrl',
			controller: function ($scope, $element, $attrs) {
				var target,
					classes = $attrs['class'],
					template = $element.html(),
					on = $attrs.on || 'click';

				var showPop = () => {
					uexPop({
						scope: $scope,
						target: target,
						placement: $attrs.placement,
						classes: classes,
						template: template
					});
				};

				this.$onInit = () => {
					target = this.popContainer.getTarget();

					if (on === 'click') {
						target.on('click', () => {
							showPop();
							$scope.$applyAsync();
						});
					} else if (on === 'hover') {
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

				this.$postLink = () => {
					$element.removeClass();
					$element.empty();
				};
			}
		};
	}
})();
