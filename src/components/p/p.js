{
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

		this.$get = function () {
			return this.opts;
		};
	}

	function uexP($parse, uexP) {
		return {
			restrict: 'A',
			scope: true,
			controller: controller,
			controllerAs: '$p',
			link: link
		};

		function controller($scope, $timeout, $q) {
			var ctrl = this,
				promise;

			this.$$fn = null;
			this.$running = false;
			this.$$promises = {};

			var running = function (value) {
				ctrl.$running = value;
			};

			function getLocals(args) {
				if (!args || args.length === 0) {
					return null;
				}
				return {
					$event: args[0]
				};
			}

			var interpolate = function (name, interval) {
				ctrl[name] = true;
				var p = ctrl.$$promises[name] = $timeout(function () {
					if (ctrl.$$promises[name] === p) {
						ctrl[name] = false;
					}
				}, interval);
			};

			this.run = function () {
				var p = ctrl.$$fn($scope, getLocals(arguments));
				if (p && p.finally) {
					promise = p;
					running(true);
					promise.then(function () {
						interpolate('$success', ctrl.$$options.successInterval || uexP.successInterval);
					}, function () {
						interpolate('$error', ctrl.$$options.errorInterval || uexP.errorInterval);
					});
					promise.finally(function () {
						if (p !== promise) return;
						running(false);
					});
				}
			};
		}

		function link($scope, $element, $attrs, ctrl) {
			ctrl.$$fn = $parse($attrs.uexP);
			ctrl.$$options = $scope.$eval($attrs.uexPOpts) || {};

			if ($element.is('form') && $attrs.uexPSrc === undefined) {
				$element.on('submit', function (e) {
					$scope.$apply(ctrl.run.call(ctrl, e));
				});
			}
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
				$element.on(event, function (e) {
					$scope.$apply(ctrl.run.call(ctrl, e));
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
				$scope.$watch(function () {
					return ctrl['$' + kind];
				}, function (n, o) {
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

				$scope.$watch(function () {
					return ctrl.$success;
				}, function (n, o) {
					$scope.success = n;
					if (n) {
						$scope.classes = 'uex-p-success';
						$scope.text = successText;
					}
				});

				$scope.$watch(function () {
					return ctrl.$error;
				}, function (n, o) {
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
				$scope.$watch(function () {
					return ctrl.$running;
				}, function (n, o) {
					if (n) {
						$element.attr('disabled', 'disabled');
					} else {
						if (ctrl.$error || !isOneTime) {
							$element.removeAttr('disabled');
						}
					}
				});
			}
		};
	}
}
