(function () {
	'use strict';

	angular.module('mr.uex').component('uexRadio', {
		template: '\
			<div class="_uex-icon">\
				<div class="_uex-on"></div>\
			</div>\
			<ng-transclude class="_uex-label"></ng-transclude>',
		transclude: true,
		controller: $ctrl,
		require: {
			uexRadioGroupCtrl: '^uexRadioGroup'
		},
		bindings: {
			value: '<'
		}
	});

	function $ctrl($scope, $element, $attrs) {
		var lastChecked;

		var render = () => {
			var attrValue = $attrs.value;
			var checked = attrValue === this.uexRadioGroupCtrl.model;
			if (checked === lastChecked) {
				return;
			}

			lastChecked = checked;
			if (checked) {
				$element.addClass('checked');
			} else {
				$element.removeClass('checked');
			}
		};

		$attrs.$observe('value', render);
		$scope.$watch(() => this.uexRadioGroupCtrl.model, render);

		var clickListener = e => {
			if (e.isDefaultPrevented() || $element.attr('disabled')) {
				return;
			}

			$scope.$apply(() => {
				this.uexRadioGroupCtrl.select($attrs.value);
			});
		}

		this.$postLink = () => {
			$element.on('click', clickListener);
		};
	}
})();
