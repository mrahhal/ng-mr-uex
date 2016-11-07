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
						return uexModal(angular.extend({
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

	function modalConfirm(uexModal) {
		return {
			restrict: 'E',
			scope: true,
			bindToController: {
				delegate: '='
			},
			controllerAs: '$uexModalConfirmCtrl',
			controller: function ($scope, $element, $attrs) {
				var title = $attrs.title,
					classes = $attrs.class,
					template = $element.html();

				this.delegate = {
					open: () => {
						return uexModal.confirm()
							.classes(classes)
							.title(title)
							.template(template)
							.open($scope);
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
