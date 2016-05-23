(function () {
	'use strict';

	angular.module('mr.uex')
		.directive('uexSelectTransclude', uexSelectTransclude)
		.directive('uexSelect', uexSelect)
		.directive('uexSelectSimple', uexSelectSimple);

	function uexSelectTransclude() {
		return {
			restrict: 'A',
			require: '^uexSelect',
			link: function ($scope, $element, $attrs, ctrl, $transclude) {
				ctrl.$populateScope($scope);

				$transclude($scope, function (clone) {
					$element.empty();
					$element.append(clone);
					$scope.$on('$destroy', function () {
						ctrl.$removeScope($scope);
					});
				});
			}
		};
	}

	function uexSelect($parse, $document) {
		function parse(exp) {
			var match = exp.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+track\s+by\s+([\s\S]+?))?\s*$/);

			var parsed = {
				keyName: match[1],
				inFn: $parse(match[2]),
				asFn: $parse(match[3]),
				trackFn: $parse(match[4])
			};
			parsed.asyncMode = !parsed.inFn.assign && !parsed.inFn.literal;
			return parsed;
		}

		return {
			restrict: 'E',
			transclude: true,
			template: '\
<div class="uex-select" ng-class="{open: isOpen}">\
	<button type="button" class="button has-caret" ng-click="toggle()">\
		{{title}}\
	</button>\
	<uex-icon icon="close" class="btn-plain btn-dim tooltipped tooltipped-e" aria-label="Clear" ng-if="selected" ng-click="clear()"></uex-icon>\
	<div class="uex-select-content">\
		<header>\
			<div>{{::header}}</div>\
			<uex-icon icon="close" class="btn-plain btn-dim" ng-click="close()"></uex-icon>\
		</header>\
		<div>\
			<div class="uex-select-filters" ng-if="::asyncMode">\
				<div class="uex-select-filter-container">\
					<input uex-focus type="text" placeholder="Search" ng-model="$uexSelectCtrl.q" ng-model-options="{debounce: 500}" />\
				</div>\
			</div>\
			<div class="uex-select-loading" ng-show="loading">\
				Loading...\
			</div>\
			<div class="uex-select-no-items" ng-show="!items && !loading">Start typing to filter</div>\
			<ul class="options no-margin">\
				<li ng-repeat="item in items" ng-click="select(item)" uex-select-transclude></li>\
			</ul>\
		</div>\
	</div>\
</div>',
			controller: function ($scope) {
				var ctrl = this;
				var scopes = [];
				this.$populateScope = function (scope) {
					var item = scope.item;
					scopes.push(scope);
					if (item && ctrl.track(item) === ctrl.track($scope.selected)) {
						scope.$selected = true;
					} else if (item) {
						scope.$selected = false;
					}
					if (item) {
						scope[this.options.keyName] = item;
					}
				};

				this.$removeScope = function (scope) {
					var index = scopes.indexOf(scope);
					if (index >= 0) {
						scopes.splice(index, 1);
					}
				};

				this.$findScope = function (item, resolve, reject) {
					for (var i = 0; i < scopes.length; i++) {
						var scope = scopes[i];
						if (item === scope.item) {
							if (resolve)
								resolve(scope);
						} else {
							if (reject)
								reject(scope);
						}
					}
				};
			},
			controllerAs: '$uexSelectCtrl',
			require: ['uexSelect', 'ngModel'],
			scope: true,
			link: function ($scope, $element, $attrs, ctrls, $transclude) {
				if ($attrs.exp === undefined) {
					throw new Error('\'uexSelect\': Attribute \'exp\' is required.');
				}

				var ctrl = ctrls[0],
					ngModel = ctrls[1];

				var originalTitle = $scope.title = $attrs.title;
				if ($attrs.title !== undefined) {
					$element.attr('title', null);
				}

				$scope.header = $attrs.header;
				$scope.classes = $attrs.classes;

				$scope.isOpen = false;
				$scope.selected = null;

				var options = ctrl.options = parse($attrs.exp),
					keyName = options.keyName,
					asyncMode = $scope.asyncMode = options.asyncMode,
					promise;

				var display = function (item) {
					if (options.asFn === angular.noop) return item;
					var locals = {};
					locals[keyName] = item;
					return options.asFn($scope, locals);
				};

				var track = ctrl.track = function (item) {
					if (options.trackFn === angular.noop) return item;
					var locals = {};
					locals[keyName] = item;
					return options.trackFn($scope, locals);
				};

				var setTitle = function (title) {
					$scope.title = title;
				};

				var resetTitle = function () {
					$scope.title = originalTitle;
				};

				if (!$scope.header) {
					$scope.header = angular.copy($scope.title);
				}

				$scope.open = function () {
					$scope.isOpen = true;
				};

				$scope.close = function () {
					$scope.isOpen = false;
					if (asyncMode) {
						$scope.items = null;
						promise = null;
						ctrl.q = null;
					}
				};

				$scope.toggle = function () {
					$scope.isOpen = !$scope.isOpen;
				};

				$scope.$watch('isOpen', function (v) {
					if (v) {
						$scope.$broadcast('uex.focus');
					}
				});

				$scope.clear = function () {
					$scope.select(null);
				};

				ngModel.$render = function () {
					var value = ngModel.$viewValue;
					if (!value) {
						$scope.select(null);
					}
					$scope.select(value);
				};

				var removeSelected = function (items) {
					var selected = $scope.selected;
					if (!selected) return;
					var selectedId = track(selected);
					var index;
					for (var i = 0; i < items.length; i++) {
						var id = track(items[i]);
						if (id === selectedId) {
							index = i;
							break;
						}
					}
					if (index !== undefined) {
						items.splice(index, 1);
					}
				};

				if (asyncMode) {
					$scope.$watch('$uexSelectCtrl.q', function watchQ(v, old) {
						if (v === old || v === null) return;
						$scope.loading = true;
						$scope.items = null;
						var p = promise = options.inFn($scope, { // jshint ignore:line
							q: v
						});
						p.then(function (d) {
							if (p !== promise) return;
							removeSelected(d);
							$scope.items = d;
						}).finally(function () {
							$scope.loading = false;
						});
					});
				} else {
					$scope.$watchCollection(function watchCollection() {
						return options.inFn($scope);
					}, function (v, old) {
						$scope.items = v;
					});
				}

				$scope.select = function (item, n) {
					if (!item && !$scope.selected) return;
					$scope.selected = item;
					var selected = item;
					if (selected) {
						ctrl.$findScope(selected, function (scope) {
							scope.$selected = true;
						}, function (scope) {
							scope.$selected = false;
						});
						ngModel.$setViewValue(selected);
						setTitle(display(selected));
					} else {
						ctrl.$findScope(null, null, function (scope) {
							scope.$selected = false;
						});
						ngModel.$setViewValue(null);
						resetTitle();
					}
					ctrl.q = null;
					if (asyncMode) {
						$scope.items = null;
					}
					$scope.close();
				};

				$element.on('keydown', function (e) {
					if (e.which === 27) {
						e.preventDefault();
						$scope.$apply(function () {
							$scope.close();
						});
					}
				});

				$document.on('click', function (e) {
					if (!$.contains($element[0], e.target)) {
						$scope.$apply(function () {
							$scope.close();
						});
					}
				});
			}
		};
	}

	function uexSelectSimple() {
		return {
			restrict: 'E',
			transclude: true,
			template: '\
				<div class="uex-select-simple-content" ng-transclude></div>\
				<uex-icon icon="check" ng-if="$selected" />'
		};
	}
})();
