(function () {
	'use strict';

	angular.module('mr.uex').directive('uexP', uexP);
	angular.module('mr.uex').directive('uexPSrc', uexPSrc);

	function uexP($parse) {
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

			var interpolate = function(name, interval) {
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
						interpolate('$success', ctrl.$$options.successInterval || 1000);
					}, function () {
						interpolate('$error', ctrl.$$options.errorInterval || 1000);
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
			ctrl.$$options = $scope.$eval($attrs.uexPOptions) || {};

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
})();
