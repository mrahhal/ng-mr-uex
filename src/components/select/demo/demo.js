(function () {
	'use strict';

	angular.module('app').component('selectPage', {
		templateUrl: '/src/components/select/demo/demo.html',
		controller: $ctrl
	});

	angular.module('app').component('selectCompTest1', {
		template: '{{$ctrl.some}}',
		bindings: {
			u: '<'
		},
		controller: function ($scope, $attrs) {
			this.some = this.u;
		}
	});

	function $ctrl($scope, $timeout) {
		this.items = [{
			name: 'item1'
		}, {
			name: 'item2'
		}];

		this.selected4 = this.items[0];

		this.loading = true;
		$timeout(() => {
			this.selected3 = this.items[0];
			this.loading = false;
		}, 500);
	}
})();
