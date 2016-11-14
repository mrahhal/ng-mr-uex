(function () {
	"use strict";

	angular
		.module('mr.uex')
		.directive('uexModal', modal)
		.directive('uexModalConfirm', modalConfirm);

	function modal(uexModal) {
		return {
			restrict: 'E',
			scope: true,
			template: ($element, $attrs) => {
				$attrs.$html = $element.html();
				$element.empty();
			},
			bindToController: {
				delegate: '='
			},
			controllerAs: '$uexModalCtrl',
			controller: function ($scope, $element, $attrs) {
				var title = $attrs.title,
					classes = $attrs['class'],
					template = $attrs.$html;

				this.delegate = {
					open: options => {
						return uexModal(angular.extend({
							scope: $scope,
							title: title,
							classes: classes,
							template: template
						}, options));
					}
				};
			}
		};
	}

	function modalConfirm(uexModal) {
		return {
			restrict: 'E',
			scope: true,
			template: ($element, $attrs) => {
				$attrs.$html = $element.html();
				$element.empty();
			},
			bindToController: {
				delegate: '='
			},
			controllerAs: '$uexModalConfirmCtrl',
			controller: function ($scope, $element, $attrs) {
				var title = $attrs.title,
					classes = $attrs['class'],
					template = $attrs.$html;

				this.delegate = {
					open: () => {
						return uexModal.confirm()
							.classes(classes)
							.title(title)
							.template(template)
							.open($scope);
					}
				};
			}
		};
	}
})();
