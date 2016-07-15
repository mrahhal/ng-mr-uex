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
				class: '@'
			},
			controllerAs: '$ctrl',
			controller: function ($scope, $element, $attrs, $transclude) {
				var classes = $attrs.class;
				$element.removeClass();

				this.delegate = {
					open: () => {
						var scope = $scope.$new();
						$transclude(scope, clone => {
							var instance = modal({
								scope: scope,
								title: this.title,
								class: classes,
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
