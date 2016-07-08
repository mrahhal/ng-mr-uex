(function () {
	"use strict";

	angular
		.module('mr.uex')
		.directive('uexModal', modal);

	function modal(modal) {
		return {
			transclude: true,
			scope: true,
			terminate: true,
			bindToController: {
				delegate: '=',
				title: '@',
				classes: '@'
			},
			controllerAs: '$ctrl',
			controller: function ($scope, $element, $transclude, $attrs) {
				this.delegate = {
					open: () => {
						var scope = $scope.$new();
						$transclude(scope, clone => {
							var instance = modal({
								scope: scope,
								title: this.title,
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
