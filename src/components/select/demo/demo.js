(function () {
	'use strict';

	angular.module('app').controller('uexSelectCtrl', function ($scope, $timeout, $q) {
		this.items = [{
			name: 'item1'
		}, {
			name: 'item2'
		}];

		this.getItems = q => {
			return $timeout(() => {
				var items = [];
				for (var i = 0; i < this.items.length; i++) {
					if (!q || this.items[i].name.indexOf(q) > -1) {
						items.push(this.items[i]);
					}
				}
				return items;
			}, 2000);
		};
	});
})();
