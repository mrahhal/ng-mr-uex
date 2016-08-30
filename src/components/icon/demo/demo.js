(function () {
	'use strict';

	angular.module('app').component('iconPage', {
		templateUrl: '/src/components/icon/demo/demo.html',
		controller: $ctrl
	});

	function process(icons) {
		var ret = [];
		for (var i = 0; i < icons.length; i++) {
			var icon = icons[i];
			var copy = angular.copy(icon);
			copy.name =
				icon.id.indexOf(',') < 0 ? icon.id : icon.id.split(',')[0];
			ret.push(copy);
		}
		return ret;
	}

	function $ctrl($scope, uexIcons) {
		this.icons = process(uexIcons);

		new Clipboard('.icons uex-icon', { // jshint ignore:line
			text: trigger => {
				return trigger.getAttribute('data-clipboard-text');
			}
		});
	}
})();
