(function () {
	'use strict';

	angular.module('app').component('modalPage', {
		templateUrl: '/src/components/modal/demo/demo.html',
		controller: $ctrl
	});

	function $ctrl($scope, $q, $timeout, uexModal) {
		this.open1 = () => {
			uexModal({
				scope: $scope,
				classes: 'modal-foo',
				component: 'modal-comp',
				locals: {
					modalCtrl: this
				}
			});
		};

		this.open2 = () => {
			this.m.open();
		};

		this.confirm = () => {
			uexModal.confirm().title('Are').danger().open($scope)
				.then(() => console.log('ok'), () => console.log('no'));
		};

		this.info = () => {
			uexModal.info().title('Make sure to').open($scope)
				.then(() => console.log('ok'), () => console.log('no'));
		};
	}

	var c = 0;

	angular
		.module('app')
		.component('modalComp', {
			template: '<button type="button" ng-click="$ctrl.go()">Go</button><button type="button" ng-click="$ctrl.cancel()">Cancel</button><h1>Here you go</h1><h1>Here you go</h1><h1>Here you go</h1><h1>Here you go</h1><h1>Here you go</h1><h1>Here you go</h1><h1>Here you go</h1>',
			bindings: {
				modal: '<',
				modalCtrl: '<?'
			},
			controller: function ($scope, uexModal) {
				this.go = () => {
					c++;
					uexModal({
						scope: $scope,
						title: '' + c + '.',
						template: '<modal-comp modal="$modal"></modal-comp>'
					});
				};

				this.cancel = () => {
					this.modal.dismiss();
				};
			}
		});
})();
