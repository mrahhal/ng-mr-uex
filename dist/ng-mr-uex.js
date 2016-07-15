(function (window, angular, $, undefined) {
angular
	.module('mr.uex', ['ngAnimate']);

(function () {
	'use strict';

	angular
		.module('mr.uex')
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

	angular
		.module('mr.uex')
		.provider('uexIcons', uexIconsProvider)
		.directive('uexIcon', uexIcon);

	function uexIconsProvider() {
		/* jshint validthis:true */
		var self = this;

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

		this.add = function (icon) {
			icons.unshift(icon);
			return self;
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

				var content = wrap(icon.svg, icon.viewBox || icon.viewbox);
				$element.empty();
				$element.append(content);
			}
		};
	}
})();

(function () {
	'use strict';

	angular
		.module('mr.uex')
		.directive('uexAlias', uexAlias);

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

	angular
		.module('mr.uex')
		.directive('uexFocus', uexFocus);

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
		.factory('positioner', positioner);

	function positioner() {
		var $window,
			$body;

		function ensure() {
			if ($window) return;

			$window = $(window);
			$body = $(document.body);
		}

		ensure();

		function measure(element, fn) {
			var el = element.clone(false);
			el.css('visibility', 'hidden');
			el.css('position', 'absolute');
			$body.append(el);
			var result = fn(el);
			el.remove();
			return result;
		}

		function computeLeftForVertical(tp, ep, offset, align) {
			switch (align) {
				case 'start':
					offset.left = tp.left;
					break;

				case 'center':
					offset.left = tp.left + (tp.width / 2) - (ep.width / 2);
					break;

				case 'end':
					offset.left = tp.left + tp.width - ep.width;
					break;
			}
		}

		function computeTopForHorizontal(tp, ep, offset, align) {
			switch (align) {
				case 'start':
					offset.top = tp.top;
					break;

				case 'center':
					offset.top = tp.top + (tp.height / 2) - (ep.height / 2);
					break;

				case 'end':
					offset.top = tp.top + tp.height - ep.height;
					break;
			}
		}

		function computeOffset(context, options) {
			var placement = options.placement,
				align = options.align,
				o = options.offset,
				ep = context.ep,
				tp = context.tp;

			var offset = {
				top: 0,
				left: 0
			};

			switch (placement) {
				case 'top':
					offset.top = tp.top - ep.height - o;
					computeLeftForVertical(tp, ep, offset, align);
					break;

				case 'right':
					offset.left = tp.left + tp.width + o;
					computeTopForHorizontal(tp, ep, offset, align);
					break;

				case 'bottom':
					offset.top = tp.top + tp.height + o;
					computeLeftForVertical(tp, ep, offset, align);
					break;

				case 'left':
					offset.left = tp.left - ep.width - o;
					computeTopForHorizontal(tp, ep, offset, align);
					break;
			}

			return offset;
		}

		function coarseOffset(context, options) {
			var offset = context.offset,
				margin = options.margin || 0,
				scrollTop = $window.scrollTop(),
				gp = {
					left: margin,
					top: margin,
					width: $window.width() - margin * 2,
					height: $window.height() - margin * 2
				};

			// Coarse left
			if (offset.left + context.ep.width > gp.width) {
				offset.left -= offset.left + context.ep.width - gp.width;
			}

			// Coarse top
			if (offset.top + context.ep.height > gp.height + scrollTop) {
				offset.top -= offset.top + context.ep.height - gp.height - scrollTop;
			}

			// Coarse negatives
			if (offset.left < gp.left) offset.left = gp.left;
			if (offset.top < gp.top + scrollTop) offset.top = gp.top + scrollTop;

			// Set maxWidth
			offset.maxWidth = gp.width;

			// Set maxHeight
			offset.maxHeight = gp.height;
		}

		function measuring(options, fn) {
			if (options.stub === true) {
				measure(options.element, fn);
			} else if (options.stub) {
				fn(options.stub);
			} else {
				fn(options.element);
			}
		}

		// target: the target element
		// element: the element to be positioned
		// placement: top, right, bottom, left
		// align: start, center, end
		// margin: the margin from the outer window
		// offset: the offset from the target
		// stub: true to stub the element before measuring, or the stub element itself
		//
		var func = options => {
			options.placement = options.placement || 'bottom';
			options.align = options.align || 'start';
			options.margin = options.margin || 5;
			options.offset = options.offset || 5;

			var target = options.target,
				element = options.element,
				targetOffset = target.offset();

			var tp = {
				top: targetOffset.top,
				left: targetOffset.left,
				width: target.outerWidth(),
				height: target.outerHeight()
			};
			var ep = {};
			measuring(options, el => {
				ep.width = el.outerWidth();
				ep.height = el.outerHeight();
			});
			var context = {
				target: target,
				element: element,
				tp: tp,
				ep: ep
			};
			var offset = computeOffset(context, options);
			context.offset = offset;
			coarseOffset(context, options);
			context.ep.left = offset.left;
			context.ep.top = offset.top;

			return context;
		};

		func.apply = (context) => {
			var element = context.element,
				offset = context.offset;

			element.css('top', offset.top);
			element.css('left', offset.left);
			if (offset.maxWidth) {
				element.css('max-width', offset.maxWidth);
			}
			if (offset.maxHeight) {
				element.css('max-height', offset.maxHeight);
			}
		};

		return func;
	}
})();

(function () {
	'use strict';

	angular
		.module('mr.uex')
		.factory('positioningThrottler', positioningThrottler);

	function now() {
		return +new Date();
	}

	function remove(array, item) {
		var index = array.indexOf(item);
		array.splice(index, 1);
	}

	function positioningThrottler() {
		var handlers = [],
			$window = $(window),
			lastCall = null,
			lastDuration = null,
			pendingTimeout = null;

		var getContext = function () {
			return {
				client: {
					height: $window.height(),
					width: $window.width(),
					top: $window.scrollTop()
				}
			};
		};

		function handlerSatisfies(events, e) {
			if (!events) {
				return true;
			}
			var type = e.type,
				found = false;
			for (var i = 0; i < events.length; i++) {
				if (events[i] === type) found = true;
			}
			return found;
		}

		var processHandlers = e => {
			var context = getContext();
			for (var i = 0; i < handlers.length; i++) {
				var composite = handlers[i],
					handler = composite.handler,
					events = composite.events;
				if (e && !handlerSatisfies(events, e))  {
					continue;
				}
				handler(context);
			}
		};

		var tick = function (e) {
			if (typeof lastDuration !== 'undefined' && lastDuration > 16) {
				lastDuration = Math.min(lastDuration - 16, 250);

				pendingTimeout = setTimeout(tick, 250);
				return;
			}

			if (typeof lastCall !== 'undefined' && now() - lastCall < 10) {
				return;
			}

			if (typeof pendingTimeout !== 'undefined') {
				clearTimeout(pendingTimeout);
				pendingTimeout = null;
			}

			lastCall = now();
			processHandlers(e);
			lastDuration = now() - lastCall;
		};

		$(() => {
			processHandlers();
			['resize', 'scroll', 'touchmove'].forEach(event => {
				window.addEventListener(event, tick);
			});
		});

		return {
			subscribe: (handler, events) => {
				if (angular.isString(events)) {
					events = [events];
				}
				handlers.push({handler: handler, events: events});
				processHandlers();
				return () => {
					remove(handlers, handler);
				};
			}
		};
	}
})();

(function () {
	'use strict';

	angular
		.module('mr.uex')
		.factory('modal', modal);

	function modal($rootScope, $compile, $controller, $animate, $templateRequest, $q) {
		var instances = [],
			$body,
			$bd;

		function listenToEvents() {
			$rootScope.$on('uex-modal-bd.clicked', handleBdClicked);
			$body.on('keydown', e => {
				if (!e.isDefaultPrevented() && e.which === 27) {
					e.preventDefault();
					dismissTopModal();
				}
			});
		}

		function ensure() {
			if ($body) {
				return;
			}

			$body = $(document.body); //jshint ignore: line
			// The ng-click here might never fire
			$bd = $('<div class="uex-modal-bd" ng-click="$root.$broadcast(\'uex-modal-bd.clicked\')" />');
			$compile($bd)($rootScope);
			$body.append($bd);
			listenToEvents();
		}

		function handleBdClicked() {
			dismissTopModal();
		}

		function dismissTopModal() {
			if (instances.length === 0) {
				return;
			}

			var top = instances[instances.length - 1];
			top.scope.$applyAsync();
			top.dismiss();
		}

		ensure();

		var getWrapperClasses = options =>
			options.class ? ' ' + options.class : '';

		var getModalContainerTemplate = options =>
			'<div class="uex-modal' + getWrapperClasses(options) +'">\
				<div class="uex-modal-container">\
					<div class="uex-modal-header">\
						<button type="button" class="uex-modal-close" ng-click="$modal.dismiss()">\
							<uex-icon icon="close"></uex-icon>\
						</button>\
						<h2>{{::title}}</h2>\
					</div>\
					<div class="uex-modal-content"></div>\
				</div>\
			</div>';

		function getTemplatePromise(options) {
			return options.template ? $q.when(options.template) :
				$templateRequest(angular.isFunction(options.templateUrl) ?
					options.templateUrl() : options.templateUrl);
		}

		// options:
		//   scope
		//   template - templateUrl
		//   title
		//   class
		//   locals
		//
		var func = options => {
			var scope = (options.scope || $rootScope).$new();
			var $element = $(getModalContainerTemplate(options));

			var destroyAndClean = instance => {
				instance.scope.$destroy();
				var delegates = instance._delegates;
				for (var i = 0; i < delegates.length; i++) {
					delegates[i]();
				}
			};

			var instance = {
				_delegates: [],
				scope: scope,
				element: $element,
				dismiss: () => {
					var i = instances.indexOf(instance);
					instances.splice(i, 1);
					var leaving = $animate.leave($element);

					if (instances.length === 0) {
						leaving.then(() => {
							$body.removeClass('uex-modal-active');
							destroyAndClean(instance);
						});
					} else {
						instances[instances.length - 1].active(true);
						destroyAndClean(instance);
					}
				},
				active: value => {
					if (value) instance.element.removeClass('inactive');
					else instance.element.addClass('inactive');
				},
				onDismiss: action => {
					instance._delegates.push(action);
				}
			};
			instances.push(instance);

			// Support options.component?
			var templatePromise = getTemplatePromise(options);
			templatePromise.then(template => {
				$element.find('.uex-modal-content').html(template);

				$compile($element)(angular.extend(scope, {
					title: options.title || 'Modal',
					$modal: instance
				}, options.locals || {}));

				if (instances.length !== 1) {
					for (var i = 0; i < instances.length - 1; i++) {
						instances[i].active(false);
					}
				}

				$body.addClass('uex-modal-active');
				$animate.enter($element, $body, $body.children().last());
			}, () => {
				destroyAndClean(instance);
			});

			return instance;
		};

		func.confirm = () => {
			var options = {
				title: 'Confirm',
				template: 'Are you sure?',
				danger: false,
				yesText: 'Yes',
				noText: 'Cancel',
				info: false
			};

			var ret = {
				open: scope => {
					var deferred = $q.defer();
					var instance = func({
						title: options.title,
						scope: angular.extend(scope, {
							danger: options.danger,
							yesText: options.yesText,
							noText: options.noText,
							info: options.info,
							resolve: () => {
								deferred.resolve();
								instance.dismiss();
							}
						}),
						template:
							'<div class="uex-modal-t-confirm">\
								<div class="uex-modal-t-confirm-content">' +
								options.template + '\
								</div>\
								<div class="uex-modal-t-confirm-actions">\
									<button type="button" class="btn btn-default no-btn" ng-click="$modal.dismiss()" ng-if="::!info">{{::noText}}</button>\
									<button type="button" class="btn yes-btn" ng-click="resolve()" ng-class="{danger: danger, \'btn-danger\': danger, \'btn-primary\': !danger}">{{::yesText}}</button>\
								</div>\
							</div>'
					});
					instance.onDismiss(() => deferred.reject());
					return deferred.promise;
				},
				title: v => {
					options.title = v;
					return ret;
				},
				danger: () => {
					options.danger = true;
					return ret;
				},
				yes: v => {
					options.yesText = v;
					return ret;
				},
				no: v => {
					options.noText = v;
					return ret;
				},
				text: v => {
					options.template = v;
					return ret;
				},
				classes: v => {
					options.classes = v;
					return ret;
				},
				info: () => {
					options.info = true;
					return ret;
				}
			};

			return ret;
		};

		func.info = () => {
			return func.confirm().info().title('Info').yes('OK');
		};

		return func;
	}
})();

(function () {
	"use strict";

	angular
		.module('mr.uex')
		.directive('uexModal', modal);

	function modal(modal) {
		return {
			restrict: 'E',
			terminate: true,
			scope: true,
			bindToController: {
				delegate: '='
			},
			link: function ($scope, $element) {
				$element.removeClass();
				$element.empty();
			},
			controllerAs: '$ctrl',
			controller: function ($scope, $element, $attrs) {
				var title = $attrs.title,
					classes = $attrs.class,
					template = $element.html();

				this.delegate = {
					open: () => {
						modal({
							scope: $scope,
							title: title,
							class: classes,
							template: template
						});
					}
				};
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

	angular
		.module('mr.uex')
		.factory('pop', pop);

	function pop($rootScope, $compile, $animate, $templateRequest, $q, positioningThrottler, positioner) {
		var _instance,
			$body;

		function listenToEvents() {
			$body.on('keydown', e => {
				if (!e.isDefaultPrevented() && e.which === 27) {
					e.preventDefault();
					dismiss();
				}
			});
			positioningThrottler.subscribe(context => {
				if (_instance) _instance.position();
			});
		}

		function dismiss() {
			if (_instance) _instance.dismiss();
			$rootScope.$applyAsync();
		}

		function ensure() {
			if ($body) {
				return;
			}

			$body = $(document.body); //jshint ignore: line
			listenToEvents();
		}

		ensure();

		var getWrapperClasses = options =>
			options.class ? ' ' + options.class : '';

		var getPopTemplate = options =>
			'<div class="uex-pop' + getWrapperClasses(options) + '">\
				<div class="uex-pop-bd" ng-click="$pop.dismiss()"></div>\
				<div class="uex-pop-content">\
				</div>\
			</div>';

		function getTemplatePromise(options) {
			return options.template ? $q.when(options.template) :
				$templateRequest(angular.isFunction(options.templateUrl) ?
					options.templateUrl() : options.templateUrl);
		}

		function validate(options) {
			if (!options.template && !options.templateUrl) {
				throw new Error('template or templateUrl must be provided.');
			}
		}

		// options:
		//   scope
		//   placement: top, right, bottom, left
		//   align: start, center, end
		//   offset
		//   target
		//   template - templateUrl
		//   class
		//   locals
		//   onPosition
		//
		var func = options => {
			validate(options);
			var scope = (options.scope || $rootScope).$new();
			var $element = $(getPopTemplate(options));

			if (_instance) {
				_instance.dismiss();
			}

			var destroyAndClean = instance => {
				instance.scope.$destroy();
				instance._disposed = true;
				var delegates = instance._delegates;
				for (var i = 0; i < delegates.length; i++) {
					delegates[i]();
				}

				if (instance === _instance) _instance = null;
			};

			var instance = {
				_delegates: [],
				scope: scope,
				element: $element,
				target: angular.element(options.target),
				pop: $element,
				dismiss: () => {
					$animate.leave($element).then(() => {
						instance.target.removeClass('uex-pop-open');
						$body.removeClass('uex-pop-active');
						destroyAndClean(instance);
					});
				},
				position: stub => {
					if (instance._disposed) return;

					var target = instance.target,
						pop = instance.pop;

					var o = angular.extend(options, {
						target: target,
						element: pop,
						margin: 5
					});

					if (stub) {
						o.stub = true;
					}
					var context = positioner(o);
					if (options.onPosition) {
						options.onPosition(context);
					}

					positioner.apply(context);
				},
				onDismiss: action => {
					instance._delegates.push(action);
				}
			};
			_instance = instance;

			var templatePromise = getTemplatePromise(options);
			templatePromise.then(template => {
				$element.find('.uex-pop-content').html(template);

				$compile($element)(angular.extend(scope, {
					$pop: instance,
				}, options.locals || {}));

				instance.target.addClass('uex-pop-open');
				$body.addClass('uex-pop-active');
				instance.position(true);
				$animate.enter($element, $body, $body.children().last());
			}, () => {
				destroyAndClean(instance);
			});

			return instance;
		};

		return func;
	}
})();

(function () {
	'use strict';

	angular
		.module('mr.uex')
		.directive('uexPopContainer', popContainer)
		.directive('uexPopTarget', popTarget)
		.directive('uexPop', pop);

	function popContainer() {
		return {
			restrict: 'A',
			scope: false,
			controller: function () {
				var _targetElement;

				this.registerTarget = targetElement => {
					_targetElement = targetElement;
				};

				this.getTarget = () => _targetElement;
			}
		};
	}

	function popTarget() {
		return {
			restrict: 'A',
			scope: false,
			require: {
				popContainer: '^uexPopContainer'
			},
			bindToController: true,
			controllerAs: '$uexPopTargetCtrl',
			controller: function ($element) {
				this.$onInit = () => {
					this.popContainer.registerTarget($element);
				};
			}
		};
	}

	function pop(pop) {
		return {
			restrict: 'E',
			terminate: true,
			scope: true,
			require: {
				popContainer: '^uexPopContainer'
			},
			bindToController: {
				delegate: '=?'
			},
			link: function ($scope, $element) {
				$element.removeClass();
				$element.empty();
			},
			controllerAs: '$uexPopCtrl',
			controller: function ($scope, $element, $attrs) {
				var target,
					classes = $attrs.class,
					template = $element.html(),
					on = $attrs.on || 'click';

				var showPop = () => {
					pop({
						scope: $scope,
						target: target,
						placement: $attrs.placement,
						align: $attrs.align,
						class: classes,
						template: template
					});
				};

				this.$onInit = () => {
					target = this.popContainer.getTarget();

					if (on === 'click') {
						target.on('click', () => {
							showPop();
							$scope.$applyAsync();
						});
					} else if (on === 'hover') {
						target.on('mouseenter', () => {
							showPop();
							$scope.$applyAsync();
						});
					}
				};

				this.delegate = {
					open: () => {
						showPop();
					}
				};
			}
		};
	}
})();

(function () {
	'use strict';

	angular
		.module('mr.uex')
		.factory('poptip', poptip);

	function poptip($rootScope, $animate, $compile, $timeout, positioner) {
		var $body;

		function ensure() {
			if ($body) return;

			$body = $(document.body);
		}

		ensure();

		var getWrapperClasses = options =>
			options.class ? ' ' + options.class : '';

		var getPoptipTemplate = options =>
			'<div class="uex-poptip' + getWrapperClasses(options) + '">\
				<div class="uex-poptip-arrow"></div>\
				<div class="uex-poptip-content"></div>\
			</div>';

		// options:
		//   scope
		//   placement: top, right, bottom, left
		//   align: start, center, end
		//   offset
		//   target
		//   template
		//   class
		//   locals
		//   delay
		//
		var func = options => {
			var scope = options.scope || $rootScope,
				target = options.target,
				element = $(getPoptipTemplate(options)),
				animateEnter,
				animateLeave,
				$content = element.find('.uex-poptip-content'),
				$arrow = element.find('.uex-poptip-arrow');

			options.placement = options.placement || 'bottom';
			options.align = options.align || 'center';
			options.delay = options.delay || 0;

			$content.html(options.template);
			element.addClass('uex-poptip-p-' + options.placement);

			var position = () => {
				var o = angular.extend(options, {
					target: target,
					element: element,
					margin: 5,
					stub: true
				});

				var context = positioner(o);
				positioner.apply(context);

				var v,
					ep = context.ep,
					tp = context.tp;
				switch (options.placement) {
					case 'top':
					case 'bottom':
						v = tp.left - ep.left + (tp.width / 2) - 5;
						$arrow.css('left', v + 'px');
						break;

					case 'right':
					case 'left':
						v = tp.top - ep.top + (tp.height / 2) - 5;
						$arrow.css('top', v + 'px');
						break;
				}

				$timeout(() => {
					animateEnter = $animate.enter(element, $body, $body.children().last());
				});
			};

			$compile(element)(angular.extend(scope, {}, options.locals || {}));

			target.on('mouseenter', () => {
				if (animateLeave)
					$animate.cancel(animateLeave);
				position();
				scope.$applyAsync();
			});
			target.on('mouseleave', () => {
				if (animateEnter)
					$animate.cancel(animateEnter);
				animateLeave = $animate.leave(element);
				scope.$applyAsync();
			});
		};

		return func;
	}
})();

(function () {
	'use strict';

	angular
		.module('mr.uex')
		.directive('uexPoptipContainer', poptipContainer)
		.directive('uexPoptipTarget', poptipTarget)
		.directive('uexPoptip', poptip);

	function poptipContainer() {
		return {
			restrict: 'A',
			scope: false,
			controller: function () {
				var _targetElement;

				this.registerTarget = targetElement => {
					_targetElement = targetElement;
				};

				this.getTarget = () => _targetElement;
			}
		};
	}

	function poptipTarget() {
		return {
			restrict: 'A',
			scope: false,
			require: {
				poptipContainer: '^uexPoptipContainer'
			},
			bindToController: true,
			controllerAs: '$ctrl',
			controller: function ($element) {
				this.$onInit = () => {
					this.poptipContainer.registerTarget($element);
				};
			}
		};
	}

	function poptip(poptip) {
		return {
			restrict: 'E',
			terminate: true,
			scope: false,
			bindToController: true,
			require: {
				poptipContainer: '^uexPoptipContainer'
			},
			link: function ($scope, $element) {
				$element.removeClass();
				$element.empty();
			},
			controllerAs: '$ctrl',
			controller: function ($scope, $element, $attrs, $transclude) {
				var target,
					classes = $attrs.class,
					template = $element.html();

				this.$onInit = () => {
					target = this.poptipContainer.getTarget();

					poptip({
						scope: $scope,
						target: target,
						placement: $attrs.placement,
						align: $attrs.align,
						class: classes,
						template: template
					});
				};
			}
		};
	}
})();

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

(function () {
	'use strict';

	angular
		.module('mr.uex')
		.directive('uexTooltip', uexTooltip);

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