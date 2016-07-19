(function () {
	"use strict";

	angular
		.module('mr.uex')
		.directive('uexModal', modal);

	function modal(uexModal) {
		return {
			restrict: 'E',
			terminal: true,
			scope: true,
			bindToController: {
				delegate: '='
			},
			controllerAs: '$uexModalCtrl',
			controller: function ($scope, $element, $attrs) {
				var title = $attrs.title,
					classes = $attrs.class,
					template = $element.html();

				this.delegate = {
					open: options => {
						uexModal(angular.extend({
							scope: $scope,
							title: title,
							class: classes,
							template: template
						}, options));
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
