(function () {
	'use strict';

	var c = 0;

	angular
		.module('app')
		.controller('modalCtrl', modalCtrl)
		.component('modalComp', {
			template: '<button type="button" ng-click="$ctrl.go()">Go</button><h1>Here you go</h1><h1>Here you go</h1><h1>Here you go</h1><h1>Here you go</h1><h1>Here you go</h1><h1>Here you go</h1><h1>Here you go</h1>',
			bindings: {
				$modal: '<'
			},
			controller: function ($scope, modal) {
				this.go = () => {
					c++;
					modal({
						scope: $scope,
						title: '' + c + '.',
						template: '<modal-comp $modal="$modal"></modal-comp>'
					});
				};
			}
		});

	function modalCtrl($scope, $q, $timeout, modal) {
		this.open1 = () => {
			modal({
				scope: $scope,
				classes: 'modal-foo',
				template: '<modal-comp modal-instance="modalInstance"></modal-comp>'
			});
		};

		this.open2 = () => {
			this.m.open();
		};

		this.confirm = () => {
			modal.confirm().title('Are').danger().open($scope)
				.then(() => console.log('ok'), () => console.log('no'));
		};

		this.info = () => {
			modal.info().title('Make sure to').open($scope)
				.then(() => console.log('ok'), () => console.log('no'));
		};
	}
})();
