(function () {
	"use strict";

	angular
		.module('mr.uex')
		.directive('modal', modal);

	function modal(modal) {
		return {
			transclude: true,
			scope: true,
			terminate: true,
			bindToController: {
				delegate: '=',
				title: '@'
			},
			controllerAs: '$ctrl',
			controller: function ($scope, $element, $transclude, $attrs) {
				var classes = $attrs.classes;
				this.delegate = {
					open: () => {
						var scope = $scope.$new();
						$transclude(scope, clone => {
							var instance = modal({
								scope: scope,
								title: this.title,
								classes: classes,
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
