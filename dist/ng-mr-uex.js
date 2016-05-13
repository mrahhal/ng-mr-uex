(function (window, angular, $, undefined) {
angular
	.module('mr.uex', ['ngAnimate']);

(function () {
	'use strict';

	angular.module('mr.uex')
		.directive('uexAutocomplete', uexAutocomplete);

	function uexAutocompleteCtrl($scope, $attrs, $parse, $q) {
		function parse(exp) {
			var match = exp.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(?:\s+as\s+([\s\S]+?))?\s*$/);

			return {
				keyName: match[1],
				inFn: $parse(match[2]),
				asFn: $parse(match[3])
			};
		}

		if ($attrs.exp === undefined) {
			throw new Error('\'uexAutocomplete\': Attribute \'exp\' is required.');
		}

		var ctrl = this,
			options = parse($attrs.exp),
			keyName = options.keyName,
			promise;

		ctrl.items = [];
		ctrl.text = [];
		ctrl.options = options;
		ctrl.keyName = keyName;
		ctrl.activeItem = null;
		ctrl.activeIndex = -1;

		var transient = false;

		ctrl.display = function (item) {
			if (options.asFn === angular.noop) return item;
			var locals = {};
			locals[keyName] = item;
			return options.asFn($scope, locals);
		};

		ctrl.select = function (item) {
			ctrl.text = ctrl.display(item);
			ctrl.clear();
			transient = true;
		};

		ctrl.setActive = function (index) {
			if (index === undefined) {
				ctrl.activeItem = null;
				ctrl.activeIndex = -1;
				return;
			}
			var item = ctrl.items[index];

			ctrl.activeItem = item;
			ctrl.activeIndex = index;
		};

		ctrl.mouseover = function (item, index) {
			ctrl.setActive(index);
		};

		ctrl.clear = function () {
			ctrl.items = [];
			ctrl.setActive();
		};

		function filterIfNotPromise(o) {
			if (o.then) return o;
			var text = ctrl.text;
			if (!text || text.trim() === '') return o;
			var r = [];
			for (var i = 0; i < o.length; i++) {
				if (ctrl.display(o[i]).indexOf(text) > -1) {
					r.push(o[i]);
				}
			}
			return r;
		}

		$scope.$watch(function () {
			return ctrl.text;
		}, function watchText(v, old) {
			if (v === old || v === null || transient) {
				transient = false;
				return;
			}
			ctrl.ngModel.$setViewValue(v);
			ctrl.loading = true;
			ctrl.clear();
			var p = promise = $q.when(filterIfNotPromise(ctrl.options.inFn($scope, { // jshint ignore:line
				q: v
			})));
			p.then(function (d) {
				if (p !== promise) return;
				ctrl.items = d;
			}).finally(function () {
				ctrl.loading = false;
			});
		});
	}

	function uexAutocomplete($document) {
		return {
			restrict: 'E',
			controller: uexAutocompleteCtrl,
			controllerAs: '$uexAutocompleteCtrl',
			template: function (element, attr) {
				function getItemTemplate() {
					var templateTag = element.find('uex-item-template').detach(),
						html = templateTag.length ? templateTag.html() : element.html();
					if (!templateTag.length) element.empty();
					return html;
				}
				return '\
<div class="uex-autocomplete">\
	<input type="text" ng-model="$uexAutocompleteCtrl.text" ng-keydown="keydown($event)" >\
	<div class="uex-autocomplete-list" ng-if="$uexAutocompleteCtrl.items.length > 0">\
		<div class="uex-autocomplete-item"\
			 ng-repeat="item in $uexAutocompleteCtrl.items"\
			 ng-click="$uexAutocompleteCtrl.select(item)"\
			 ng-class="{ active: $index == $uexAutocompleteCtrl.activeIndex }"\
			 ng-mouseover="$uexAutocompleteCtrl.mouseover(item, $index)"\
			 uex-alias="item {{::$uexAutocompleteCtrl.keyName}}">' +
			 getItemTemplate() + '\
		</div>\
	</div>\
</div>';
			},
			require: ['uexAutocomplete', 'ngModel'],
			scope: true,
			link: function ($scope, $element, $attrs, ctrls, $transclude) {
				var ctrl = ctrls[0],
					ngModel = ctrls[1];

				ctrl.ngModel = ngModel;

				ngModel.$render = function () {
					ctrl.text = ngModel.$viewValue;
				};

				$scope.keydown = function (e) {
					var key = e.which,
						shouldPreventDefault = true;

					switch (key) {
						case 13: // enter
							ctrl.select(ctrl.activeItem);
							break;

						case 27: // esc
							ctrl.clear();
							break;

						case 38: // up
							if (ctrl.items.length === 0) break;
							if (ctrl.activeIndex === -1) {
								ctrl.setActive(ctrl.items.length - 1);
								break;
							}
							if (ctrl.activeIndex - 1 < 0) break;
							ctrl.setActive(ctrl.activeIndex - 1);
							break;

						case 40: // down
							if (ctrl.items.length === 0) break;
							if (ctrl.activeIndex === -1) {
								ctrl.setActive(0);
								break;
							}
							if (ctrl.activeIndex + 1 >= ctrl.items.length) break;
							ctrl.setActive(ctrl.activeIndex + 1);
							break;

						default:
							shouldPreventDefault = false;
							break;
					}

					if (shouldPreventDefault) {
						e.preventDefault();
					}
				};

				$element.on('keydown', function (e) {
					if (e.which === 27) {
						e.preventDefault();
						$scope.$apply(function () {
							ctrl.clear();
						});
					}
				});

				$document.on('click', function (e) {
					if (!$.contains($element[0], e.target)) {
						$scope.$apply(function () {
							ctrl.clear();
						});
					}
				});
			}
		};
	}
})();

(function () {
	'use strict';

	angular.module('mr.uex').provider('uexIcons', uexIconsProvider);
	angular.module('mr.uex').directive('uexIcon', uexIcon);

	function uexIconsProvider() {
		/* jshint validthis:true */

		var icons = [{
			id: 'add,plus',
			svg: '<path d="M18.984 12.984h-6v6h-1.969v-6h-6v-1.969h6v-6h1.969v6h6v1.969z"/>'
		}, {
			id: 'add-box',
			svg: '<path d="M17.016 12.984v-1.969h-4.031v-4.031h-1.969v4.031h-4.031v1.969h4.031v4.031h1.969v-4.031h4.031zM18.984 3c1.078 0 2.016 0.938 2.016 2.016v13.969c0 1.078-0.938 2.016-2.016 2.016h-13.969c-1.125 0-2.016-0.938-2.016-2.016v-13.969c0-1.078 0.891-2.016 2.016-2.016h13.969z"/>'
		}, {
			id: 'add-circle',
			svg: '<path d="M17.016 12.984v-1.969h-4.031v-4.031h-1.969v4.031h-4.031v1.969h4.031v4.031h1.969v-4.031h4.031zM12 2.016c5.531 0 9.984 4.453 9.984 9.984s-4.453 9.984-9.984 9.984-9.984-4.453-9.984-9.984 4.453-9.984 9.984-9.984z"/>'
		}, {
			id: 'control-point',
			svg: '<path d="M12 20.016c4.406 0 8.016-3.609 8.016-8.016s-3.609-8.016-8.016-8.016-8.016 3.609-8.016 8.016 3.609 8.016 8.016 8.016zM12 2.016c5.531 0 9.984 4.453 9.984 9.984s-4.453 9.984-9.984 9.984-9.984-4.453-9.984-9.984 4.453-9.984 9.984-9.984zM12.984 6.984v4.031h4.031v1.969h-4.031v4.031h-1.969v-4.031h-4.031v-1.969h4.031v-4.031h1.969z"/>'
		}, {
			id: 'adjust',
			svg: '<path d="M15 12c0 1.641-1.359 3-3 3s-3-1.359-3-3 1.359-3 3-3 3 1.359 3 3zM12 20.016c4.406 0 8.016-3.609 8.016-8.016s-3.609-8.016-8.016-8.016-8.016 3.609-8.016 8.016 3.609 8.016 8.016 8.016zM12 2.016c5.531 0 9.984 4.453 9.984 9.984s-4.453 9.984-9.984 9.984-9.984-4.453-9.984-9.984 4.453-9.984 9.984-9.984z"/>'
		}, {
			id: 'arrow-left',
			svg: '<path d="M20.016 11.016v1.969h-12.188l5.578 5.625-1.406 1.406-8.016-8.016 8.016-8.016 1.406 1.406-5.578 5.625h12.188z"/>'
		}, {
			id: 'arrow-bottom',
			svg: '<path d="M20.016 12l-8.016 8.016-8.016-8.016 1.453-1.406 5.578 5.578v-12.188h1.969v12.188l5.625-5.578z"/>'
		}, {
			id: 'arrow-right',
			svg: '<path d="M12 3.984l8.016 8.016-8.016 8.016-1.406-1.406 5.578-5.625h-12.188v-1.969h12.188l-5.578-5.625z"/>'
		}, {
			id: 'arrow-top',
			svg: '<path d="M3.984 12l8.016-8.016 8.016 8.016-1.453 1.406-5.578-5.578v12.188h-1.969v-12.188l-5.625 5.578z"/>'
		}, {
			id: 'autorenew',
			svg: '<path d="M18.75 7.734c0.797 1.219 1.266 2.719 1.266 4.266 0 4.406-3.609 8.016-8.016 8.016v3l-3.984-4.031 3.984-3.984v3c3.328 0 6-2.672 6-6 0-1.031-0.281-1.969-0.703-2.813zM12 6c-3.328 0-6 2.672-6 6 0 1.031 0.234 1.969 0.703 2.813l-1.453 1.453c-0.797-1.219-1.266-2.719-1.266-4.266 0-4.406 3.609-8.016 8.016-8.016v-3l3.984 4.031-3.984 3.984v-3z"/>'
		}, {
			id: 'close',
			svg: '<path d="M18.984 6.422l-5.578 5.578 5.578 5.578-1.406 1.406-5.578-5.578-5.578 5.578-1.406-1.406 5.578-5.578-5.578-5.578 1.406-1.406 5.578 5.578 5.578-5.578z"/>'
		}, {
			id: 'done,check',
			svg: '<path d="M9 16.219l10.594-10.641 1.406 1.406-12 12-5.578-5.578 1.359-1.406z"/>'
		}, {
			id: 'done-all,check-all',
			svg: '<path d="M0.422 13.406l1.406-1.406 5.578 5.578-1.406 1.406zM22.219 5.578l1.453 1.406-12 12-5.625-5.578 1.453-1.406 4.172 4.172zM18 6.984l-6.328 6.375-1.406-1.406 6.328-6.375z"/>'
		}, {
			id: 'pencil,edit',
			svg: '<path d="M20.719 7.031l-1.828 1.828-3.75-3.75 1.828-1.828c0.375-0.375 1.031-0.375 1.406 0l2.344 2.344c0.375 0.375 0.375 1.031 0 1.406zM3 17.25l11.063-11.063 3.75 3.75-11.063 11.063h-3.75v-3.75z"/>'
		}, {
			id: 'trash',
			svg: '<path d="M292.571 420.571v329.143q0 8-5.143 13.143t-13.143 5.143h-36.571q-8 0-13.143-5.143t-5.143-13.143v-329.143q0-8 5.143-13.143t13.143-5.143h36.571q8 0 13.143 5.143t5.143 13.143zM438.857 420.571v329.143q0 8-5.143 13.143t-13.143 5.143h-36.571q-8 0-13.143-5.143t-5.143-13.143v-329.143q0-8 5.143-13.143t13.143-5.143h36.571q8 0 13.143 5.143t5.143 13.143zM585.143 420.571v329.143q0 8-5.143 13.143t-13.143 5.143h-36.571q-8 0-13.143-5.143t-5.143-13.143v-329.143q0-8 5.143-13.143t13.143-5.143h36.571q8 0 13.143 5.143t5.143 13.143zM658.286 834.286v-541.714h-512v541.714q0 12.571 4 23.143t8.286 15.429 6 4.857h475.429q1.714 0 6-4.857t8.286-15.429 4-23.143zM274.286 219.429h256l-27.429-66.857q-4-5.143-9.714-6.286h-181.143q-5.714 1.143-9.714 6.286zM804.571 237.714v36.571q0 8-5.143 13.143t-13.143 5.143h-54.857v541.714q0 47.429-26.857 82t-64.571 34.571h-475.429q-37.714 0-64.571-33.429t-26.857-80.857v-544h-54.857q-8 0-13.143-5.143t-5.143-13.143v-36.571q0-8 5.143-13.143t13.143-5.143h176.571l40-95.429q8.571-21.143 30.857-36t45.143-14.857h182.857q22.857 0 45.143 14.857t30.857 36l40 95.429h176.571q8 0 13.143 5.143t5.143 13.143z"/>',
			viewBox: '0 0 805 1024'
		}, {
			id: 'trash2',
			svg: '<path d="M18.984 3.984v2.016h-13.969v-2.016h3.469l1.031-0.984h4.969l1.031 0.984h3.469zM6 18.984v-12h12v12c0 1.078-0.938 2.016-2.016 2.016h-7.969c-1.078 0-2.016-0.938-2.016-2.016z"/>'
		}, {
			id: 'menu',
			svg: '<path d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z"/>'
		}, {
			id: 'calendar',
			svg: '<path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>'
		}, {
			id: 'chevron-bottom',
			svg: '<path d="M7.406 7.828l4.594 4.594 4.594-4.594 1.406 1.406-6 6-6-6z" />'
		}, {
			id: 'chevron-right',
			svg: '<path d="M8.578 16.359l4.594-4.594-4.594-4.594 1.406-1.406 6 6-6 6z" />'
		}, {
			id: 'chevron-left',
			svg: '<path d="M15.422 16.078l-1.406 1.406-6-6 6-6 1.406 1.406-4.594 4.594z"/>'
		}, {
			id: 'chevron-top',
			svg: '<path d="M7.406 15.422l-1.406-1.406 6-6 6 6-1.406 1.406-4.594-4.594z"/>'
		}];

		this.addIcon = function (icon) {
			icons.push(icon);
		};

		this.$get = function () {
			return icons;
		};
	}

	function uexIcon(uexIcons) {
		var icons = uexIcons;

		function idExists(ids, id) {
			var all = ids.split(',');
			for (var i = 0; i < all.length; i++) {
				if (all[i].trim() === id)
					return true;
			}
			return false;
		}

		function findIconById(id) {
			for (var i = 0; i < icons.length; i++) {
				var icon = icons[i];

				if (idExists(icon.id, id)) {
					return icon;
				}
			}
			throw new Error('uexIcon: "' + id + '" has not been found.');
		}

		function wrap(content, viewBox) {
			viewBox = viewBox || '0 0 24 24';
			return '<svg version="1.1" x="0px" y="0px" viewBox="' + viewBox + '">' + content + '</svg>';
		}

		return {
			restrict: 'EA',
			link: function ($scope, $element, $attrs) {
				var id, icon;
				if ($attrs.uexIcon) {
					id = $attrs.uexIcon;
				} else {
					id = $attrs.icon;
				}

				icon = findIconById(id);
				if (!icon.svg) {
					icon = findIconById(icon.ref);
				}

				var content = wrap(icon.svg, icon.viewBox);
				$element.empty();
				$element.append(content);
			}
		};
	}
})();

(function () {
	'use strict';

	angular.module('mr.uex').directive('uexAlias', uexAlias);

	function uexAlias() {
		return {
			restrict: 'A',
			link: function ($scope, $element, $attrs) {
				var expr = $attrs.uexAlias,
					parts = expr.split(' '),
					source = parts[0],
					dest = parts[1];

				$scope.$watch(function () {
					return $scope.$eval(source);
				}, function (value) {
					$scope[dest] = value;
				});
			}
		};
	}
})();

(function () {
	'use strict';

	angular.module('mr.uex').directive('uexFocus', uexFocus);

	function uexFocus($timeout) {
		return {
			restrict: 'A',
			link: function ($scope, $element, $attrs) {
				$scope.$on('uex.focus', function () {
					$timeout(function () {
						$element.focus();
					});
				});
			}
		};
	}
})();

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
})();

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
	<button type="button" class="button" ng-click="toggle()">\
		<span class="text">\
			{{title}}\
		</span>\
		<uex-icon icon="chevron-bottom"></uex-icon>\
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

(function () {
	'use strict';

	angular.module('mr.uex').directive('uexTooltip', uexTooltip);

	function uexTooltip() {
		function extractPlacement(v) {
			var index = v.indexOf(',');
			return v.slice(0, index).trim();
		}

		function extractText(v) {
			var index = v.indexOf(',');
			return v.slice(index + 1).trim();
		}

		return {
			restrict: 'A',
			scope: false,
			link: function ($scope, $element, $attrs) {
				var placement = extractPlacement($attrs.uexTooltip);
				$element.addClass('tooltipped tooltipped-' + placement);

				$attrs.$observe('uexTooltip', function (v) {
					var text = extractText(v);
					$element.attr('aria-label', text);
				});
			}
		};
	}
})();

})(window, window.angular, window.jQuery);