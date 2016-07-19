(function () {
	'use strict';

	angular
		.module('mr.uex')
		.provider('uexP', uexPProvider)
		.directive('uexP', uexP)
		.directive('uexPSrc', uexPSrc)
		.directive('uexPRunning', uexPRunning)
		.directive('uexPSuccess', uexPSuccess)
		.directive('uexPError', uexPError)
		.directive('uexPStatus', uexPStatus)
		.directive('uexPBtn', uexPBtn);

	function uexPProvider() {
		this.opts = {
			successInterval: 1000,
			errorInterval: 1000
		};

		this.$get = () => this.opts;
	}

	function uexP($parse, uexP) {
		return {
			restrict: 'A',
			scope: true,
			controller: controller,
			controllerAs: '$uexP'
		};

		function controller($scope, $element, $attrs, $timeout, $q) {
			var promise,
				fn = $parse($attrs.uexP),
				options = $scope.$eval($attrs.uexPOpts) || {},
				$$promises = {};

			this.running = false;
			this.success = false;
			this.error = false;

			if ($element.is('form') && $attrs.uexPSrc === undefined) {
				$element.on('submit', e => {
					$scope.$apply(this.run(e));
				});
			}

			function getLocals(args) {
				if (!args || args.length === 0) {
					return null;
				}
				return {
					$event: args[0]
				};
			}

			var interpolate = (name, interval) => {
				this[name] = true;
				var p = $$promises[name] = $timeout(() => {
					if ($$promises[name] === p) {
						this[name] = false;
					}
				}, interval);
			};

			this.run = () => {
				var p = fn($scope, getLocals(arguments));
				if (p && p.finally) {
					promise = p;
					this.running = true;
					promise.then(() => {
						interpolate('success', options.successInterval || uexP.successInterval);
					}, () => {
						interpolate('error', options.errorInterval || uexP.errorInterval);
					});
					promise.finally(() => {
						if (p !== promise) return;
						this.running = false;
					});
				}
			};
		}
	}

	function uexPSrc() {
		function determineEvent($element, value) {
			if (value && angular.isString(value)) return value;
			if ($element.is('form')) return 'submit';
			return 'click';
		}

		return {
			restrict: 'A',
			require: '^uexP',
			scope: false,
			link: function ($scope, $element, $attrs, ctrl) {
				var event = determineEvent($element, $attrs.uexPSrc);
				$element.on(event, e => {
					$scope.$apply(ctrl.run(e));
				});
			}
		};
	}

	function uexPCommon(kind) {
		return {
			restrict: 'A',
			require: '^uexP',
			scope: {},
			transclude: true,
			template: '<div class="uex-p-' + kind + '" ng-show="shown" ng-transclude></div>',
			link: function ($scope, $element, $attrs, ctrl) {
				$element.addClass('uex-p-' + kind);
				$scope.$watch(() => ctrl[kind], (n, o) => {
					$scope.shown = !!n;
				});
			}
		};
	}

	function uexPRunning() {
		return uexPCommon('running');
	}

	function uexPSuccess() {
		return uexPCommon('success');
	}

	function uexPError() {
		return uexPCommon('error');
	}

	function uexPStatus() {
		return {
			restrict: 'EA',
			scope: {},
			template: '<span ng-show="success || error" class="uex-p-status" ng-class="classes">{{text}}</span>',
			require: '^uexP',
			link: function ($scope, $element, $attrs, ctrl) {
				var successText = $attrs.success || 'Success',
					errorText = $attrs.error || 'Error';
				$scope.classes = '';

				$scope.$watch(() => ctrl.success, (n, o) => {
					$scope.success = n;
					if (n) {
						$scope.classes = 'uex-p-success';
						$scope.text = successText;
					}
				});

				$scope.$watch(() => ctrl.error, (n, o) => {
					$scope.error = n;
					if (n) {
						$scope.classes = 'uex-p-error';
						$scope.text = errorText;
					}
				});
			}
		};
	}

	function uexPBtn() {
		return {
			restrict: 'A',
			require: '^uexP',
			link: function ($scope, $element, $attrs, ctrl) {
				var isOneTime = $attrs.uexPBtn === 'onetime';
				$scope.$watch(() => ctrl.running, (n, o) => {
					if (n) {
						$element.attr('disabled', 'disabled');
					} else {
						if (ctrl.error || !isOneTime) {
							$element.removeAttr('disabled');
						}
					}
				});
			}
		};
	}
})();
