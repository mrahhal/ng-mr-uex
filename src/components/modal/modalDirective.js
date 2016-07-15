(function () {
	"use strict";

	angular
		.module('mr.uex')
		.directive('uexModal', modal);

	function modal(modal) {
		return {
			restrict: 'E',
			terminate: true,
			scope: true,
			bindToController: {
				delegate: '='
			},
			link: function ($scope, $element) {
				$element.removeClass();
				$element.empty();
			},
			controllerAs: '$uexModalCtrl',
			controller: function ($scope, $element, $attrs) {
				var title = $attrs.title,
					classes = $attrs.class,
					template = $element.html();

				this.delegate = {
					open: () => {
						modal({
							scope: $scope,
							title: title,
							class: classes,
							template: template
						});
					}
				};
			}
		};
	}
})();
