(function () {
	'use strict';

	angular
		.module('mr.uex')
		.directive('uexSelectTransclude', uexSelectTransclude)
		.directive('uexSelect', uexSelect)
		.directive('uexSelectSimple', uexSelectSimple);

	function uexSelectTransclude() {
		return {
			restrict: 'A',
			link: function ($scope, $element, $attrs) {
				var ctrl = $scope.$uexSelectCtrl;
				ctrl.$populateScope($scope);
				$scope.$on('$destroy', function () {
					ctrl.$removeScope($scope);
				});
			}
		};
	}

	function uexSelect($parse, $compile, $timeout, uexPop) {
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

		function validate($attrs) {
			if (!$attrs.exp) {
				throw new Error('\'uexSelect\': Attribute \'exp\' is required.');
			}
		}

		var getPopTemplate = content =>
			'<div class="uex-select-content">\
				<header>\
					<uex-icon icon="close" class="close-btn btn-plain btn-dim" ng-click="$pop.dismiss()"></uex-icon>\
					<div class="header-text">{{::$uexSelectCtrl.header}}</div>\
				</header>\
				<div>\
					<div class="uex-select-filters" ng-if="::$uexSelectCtrl.asyncMode">\
						<div class="uex-select-filter-container">\
							<input uex-focus type="text" placeholder="Search" ng-model="$uexSelectCtrl.q" ng-model-options="{debounce: 500}" />\
						</div>\
					</div>\
					<div class="uex-select-loading" ng-show="$uexSelectCtrl.loading">\
						Loading...\
					</div>\
					<div class="uex-select-no-items" ng-show="!$uexSelectCtrl.items && !$uexSelectCtrl.loading">Start typing to filter</div>\
					<ul class="options no-margin">\
						<li ng-repeat="item in $uexSelectCtrl.items" ng-click="$uexSelectCtrl.select(item)" uex-select-transclude>' + content + '</li>\
					</ul>\
				</div>\
			</div>';

		var getContTemplate = () => '\
<div class="uex-select" ng-class="{open: $uexSelectCtrl.isOpen}">\
	<button type="button" class="button has-caret" ng-click="$uexSelectCtrl.open()">\
		{{$uexSelectCtrl.title}}\
	</button>\
	<uex-icon icon="close" class="btn-plain btn-dim" ng-if="$uexSelectCtrl.selected" ng-click="$uexSelectCtrl.clear()"></uex-icon>\
</div>';

		return {
			restrict: 'E',
			terminal: true,
			scope: true,
			bindToController: {
				exp: '@',
				title: '@',
				header: '@',
				class: '@'
			},
			require: {
				uexSelectCtrl: '^uexSelect',
				ngModelCtrl: '^ngModel'
			},
			controllerAs: '$uexSelectCtrl',
			controller: function ($scope, $element, $attrs) {
				validate($attrs);

				var scopes = [],
					originalTitle = this.title,
					options = parse(this.exp),
					keyName = options.keyName,
					asyncMode = this.asyncMode = options.asyncMode,
					classes = this.class,
					promise,
					popInstance;

				var content = $element.html(),
					$button;

				this.$postLink = () => {
					$element.empty();
					var t = $(getContTemplate());
					$button = t.find('.button');
					$element.append($compile(t)($scope));
				};

				if (originalTitle !== undefined) {
					$element.attr('title', null);
				}

				this.selected = null;

				this.$populateScope = scope => {
					var item = scope.item;
					scopes.push(scope);
					if (item && this.track(item) === this.track(this.selected)) {
						scope.$selected = true;
					} else if (item) {
						scope.$selected = false;
					}
					if (item) {
						scope[keyName] = item;
					}
				};

				this.$removeScope = scope => {
					var index = scopes.indexOf(scope);
					if (index >= 0) {
						scopes.splice(index, 1);
					}
				};

				this.$findScope = (item, resolve, reject) => {
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

				var display = item => {
					if (options.asFn === angular.noop) return item;
					var locals = {};
					locals[keyName] = item;
					return options.asFn($scope, locals);
				};

				this.track = item => {
					if (options.trackFn === angular.noop) return item;
					var locals = {};
					locals[keyName] = item;
					return options.trackFn($scope, locals);
				};

				var setTitle = title => {
					this.title = title;
				};

				var resetTitle = () => {
					this.title = originalTitle;
				};

				if (!this.header) {
					this.header = angular.copy(this.title);
				}

				var createPopTemplate = () => {
					return getPopTemplate(content);
				};

				this.open = () => {
					this.isOpen = true;
					popInstance = uexPop({
						scope: $scope,
						target: $button,
						placement: 'bottom',
						align: 'start',
						class: 'uex-select-pop ' + classes,
						template: createPopTemplate()
					});
					popInstance.onDismiss(() => this.isOpen = false);
				};

				this.close = () => {
					if (popInstance) popInstance.dismiss();
					popInstance = null;

					if (this.asyncMode) {
						this.items = null;
						this.q = null;
						promise = null;
					}
				};

				this.clear = () => {
					this.select(null);
				};

				this.$onInit = () => {
					this.ngModelCtrl.$render = () => {
						var value = this.ngModelCtrl.$viewValue;
						if (!value) {
							this.select(null);
						}
						this.select(value);
					};
				};

				var removeSelected = items => {
					var selected = this.selected;
					if (!selected) return;
					var selectedId = this.track(selected),
						index;
					for (var i = 0; i < items.length; i++) {
						var id = this.track(items[i]);
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
					$scope.$watch('$uexSelectCtrl.q', (v, old) => {
						if (v === old || v === null) return;
						this.loading = true;
						this.items = null;
						var p = promise = options.inFn($scope, { // jshint ignore:line
							q: v
						});
						p.then(d => {
							if (p !== promise) return;
							removeSelected(d);
							this.items = d;
							$timeout(() => {
								if (popInstance) popInstance.position();
							});
						}).finally(() => {
							this.loading = false;
						});
					});
				} else {
					$scope.$watchCollection(() => {
						return options.inFn($scope);
					}, (v, old) => {
						this.items = v;
					});
				}

				this.select = (item, n) => {
					if (!item && !this.selected) return;
					this.selected = item;
					var selected = item;
					if (selected) {
						this.$findScope(selected, scope => {
							scope.$selected = true;
						}, scope => {
							scope.$selected = false;
						});
						this.ngModelCtrl.$setViewValue(selected);
						setTitle(display(selected));
					} else {
						this.$findScope(null, null, scope => {
							scope.$selected = false;
						});
						this.ngModelCtrl.$setViewValue(null);
						resetTitle();
					}
					this.q = null;
					if (asyncMode) {
						this.items = null;
					}
					this.close();
				};
			}
		};
	}

	function uexSelectSimple() {
		return {
			restrict: 'E',
			transclude: true,
			template: '\
				<div class="uex-select-simple-content" ng-transclude></div>\
				<uex-icon icon="check" ng-if="$selected"></uex-icon>',
			link: function ($scope) {
				$scope.$pop.position();
			}
		};
	}
})();
