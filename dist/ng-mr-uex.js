angular
	.module('mr.uex', ['ngAnimate']);

(function () {
	'use strict';

	angular.module('mr.uex').component('uexCheckbox', {
		template: '\
			<div class="_uex-icon" ng-class="{\'checked\': $ctrl.model}"></div>\
			<ng-transclude class="_uex-label"></ng-transclude>',
		transclude: true,
		controller: $ctrl,
		require: {
			ngModelCtrl: 'ngModel'
		},
		bindings: {
			model: '=ngModel'
		}
	});

	function $ctrl($scope, $element) {
		var render = () => {
			if (this.model) {
				$element.addClass('checked');
			} else {
				$element.removeClass('checked');
			}
		};

		$scope.$watch(() => this.model, render);

		var clickListener = e => {
			if (e.isDefaultPrevented() || $element.attr('disabled')) {
				return;
			}

			$scope.$apply(() => {
				var viewValue = !this.model;
				this.ngModelCtrl.$setViewValue(viewValue);
			});
		};

		this.$postLink = () => {
			$element.on('click', clickListener);
		};
	}
})();

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
		var icons = [{
			id: 'add,plus',
			svg: '<path d="M192 224v-128h-64v128h-128v64h128v128h64v-128h128v-64h-128z"/>',
			viewBox: '0 0 320 512'
		}, {
			id: 'close',
			svg: '<path d="M7.48 8l3.75 3.75-1.48 1.48L6 9.48l-3.75 3.75-1.48-1.48L4.52 8 .77 4.25l1.48-1.48L6 6.52l3.75-3.75 1.48 1.48z"/>',
			viewBox: '0 0 12 16'
		}, {
			id: 'arrow-top',
			svg: '<path d="M5 3L0 9h3v4h4V9h3z"/>',
			viewBox: '0 0 10 16'
		}, {
			id: 'arrow-right',
			svg: '<path d="M10 8L4 3v3H0v4h4v3z"/>',
			viewBox: '0 0 10 16'
		}, {
			id: 'arrow-bottom',
			svg: '<path d="M7 7V3H3v4H0l5 6 5-6z"/>',
			viewBox: '0 0 10 16'
		}, {
			id: 'arrow-left',
			svg: '<path d="M6 3L0 8l6 5v-3h4V6H6z"/>',
			viewBox: '0 0 10 16'
		}, {
			id: 'chevron-top',
			svg: '<path d="M160 128l-160 160 64 64 96-96 96 96 64-64-160-160z"/>',
			viewBox: '0 0 320 512'
		}, {
			id: 'chevron-right',
			svg: '<path d="M64 96l-64 64 96 96-96 96 64 64 160-160-160-160z"/>',
			viewBox: '0 0 224 512'
		}, {
			id: 'chevron-bottom',
			svg: '<path d="M256 160l-96 96-96-96-64 64 160 160 160-160-64-64z"/>',
			viewBox: '0 0 320 512'
		}, {
			id: 'chevron-left',
			svg: '<path d="M224 160l-64-64-160 160 160 160 64-64-96-96 96-96z"/>',
			viewBox: '0 0 224 512'
		}, {
			id: 'done,check',
			svg: '<path d="M320 96l-192 192-64-64-64 64 128 128 256-256-64-64z"/>',
			viewBox: '0 0 384 512'
		}, {
			id: 'edit,pencil',
			svg: '<path d="M352 32l-64 64 96 96 64-64-96-96zM0 384l0.344 96.281 95.656-0.281 256-256-96-96-256 256zM96 448h-64v-64h32v32h32v32z"/>',
			viewBox: '0 0 448 512'
		}, {
			id: 'trash',
			svg: '<path d="M11 2H9c0-.55-.45-1-1-1H5c-.55 0-1 .45-1 1H2c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1v9c0 .55.45 1 1 1h7c.55 0 1-.45 1-1V5c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1zm-1 12H3V5h1v8h1V5h1v8h1V5h1v8h1V5h1v9zm1-10H2V3h9v1z"/>',
			viewBox: '0 0 12 16'
		}, {
			id: 'menu',
			svg: '<path d="M8 4v1H0V4h8zM0 8h8V7H0v1zm0 3h8v-1H0v1z"/>',
			viewBox: '0 0 8 16'
		}, {
			id: 'comment',
			svg: '<path d="M14 1H2c-.55 0-1 .45-1 1v8c0 .55.45 1 1 1h2v3.5L7.5 11H14c.55 0 1-.45 1-1V2c0-.55-.45-1-1-1zm0 9H7l-2 2v-2H2V2h12v8z"/>',
			viewBox: '0 0 16 16'
		}, {
			id: 'file',
			svg: '<path d="M6 5H2V4h4v1zM2 8h7V7H2v1zm0 2h7V9H2v1zm0 2h7v-1H2v1zm10-7.5V14c0 .55-.45 1-1 1H1c-.55 0-1-.45-1-1V2c0-.55.45-1 1-1h7.5L12 4.5zM11 5L8 2H1v12h10V5z"/>',
			viewBox: '0 0 12 16'
		}, {
			id: 'cog,gear',
			svg: '<path d="M14 8.77v-1.6l-1.94-.64-.45-1.09.88-1.84-1.13-1.13-1.81.91-1.09-.45-.69-1.92h-1.6l-.63 1.94-1.11.45-1.84-.88-1.13 1.13.91 1.81-.45 1.09L0 7.23v1.59l1.94.64.45 1.09-.88 1.84 1.13 1.13 1.81-.91 1.09.45.69 1.92h1.59l.63-1.94 1.11-.45 1.84.88 1.13-1.13-.92-1.81.47-1.09L14 8.75v.02zM7 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>',
			viewBox: '0 0 14 16'
		}, {
			id: 'link',
			svg: '<path d="M4 9h1v1H4c-1.5 0-3-1.69-3-3.5S2.55 3 4 3h4c1.45 0 3 1.69 3 3.5 0 1.41-.91 2.72-2 3.25V8.59c.58-.45 1-1.27 1-2.09C10 5.22 8.98 4 8 4H4c-.98 0-2 1.22-2 2.5S3 9 4 9zm9-3h-1v1h1c1 0 2 1.22 2 2.5S13.98 12 13 12H9c-.98 0-2-1.22-2-2.5 0-.83.42-1.64 1-2.09V6.25c-1.09.53-2 1.84-2 3.25C6 11.31 7.55 13 9 13h4c1.45 0 3-1.69 3-3.5S14.5 6 13 6z"/>',
			viewBox: '0 0 16 16'
		}, {
			id: 'link-external',
			svg: '<path d="M11 10h1v3c0 .55-.45 1-1 1H1c-.55 0-1-.45-1-1V3c0-.55.45-1 1-1h3v1H1v10h10v-3zM6 2l2.25 2.25L5 7.5 6.5 9l3.25-3.25L12 8V2H6z"/>',
			viewBox: '0 0 12 16'
		}, {
			id: 'mail',
			svg: '<path d="M0 4v8c0 .55.45 1 1 1h12c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1H1c-.55 0-1 .45-1 1zm13 0L7 9 1 4h12zM1 5.5l4 3-4 3v-6zM2 12l3.5-3L7 10.5 8.5 9l3.5 3H2zm11-.5l-4-3 4-3v6z"/>',
			viewBox: '0 0 14 16'
		}, {
			id: 'search',
			svg: '<path d="M15.7 13.3l-3.81-3.83A5.93 5.93 0 0 0 13 6c0-3.31-2.69-6-6-6S1 2.69 1 6s2.69 6 6 6c1.3 0 2.48-.41 3.47-1.11l3.83 3.81c.19.2.45.3.7.3.25 0 .52-.09.7-.3a.996.996 0 0 0 0-1.41v.01zM7 10.7c-2.59 0-4.7-2.11-4.7-4.7 0-2.59 2.11-4.7 4.7-4.7 2.59 0 4.7 2.11 4.7 4.7 0 2.59-2.11 4.7-4.7 4.7z"/>',
			viewBox: '0 0 16 16'
		}, {
			id: 'zap',
			svg: '<path d="M10 7H6l3-7-9 9h4l-3 7z"/>',
			viewBox: '0 0 10 16'
		}];

		this.add = icon => {
			icons.unshift(icon);
			return this;
		};

		this.$get = () => icons;
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
			viewBox = viewBox || '0 0 512 512';
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

				$scope.$watch(() => $scope.$eval(source), (n, o) => {
					$scope[dest] = n;
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
				$scope.$on('uex.focus', () => {
					$timeout($element.focus);
				});
			}
		};
	}
})();

(function () {
	'use strict';

	angular
		.module('mr.uex')
		.factory('uexPositioner', positioner);

	function positioner() {
		var $window,
			$body;

		function ensure() {
			if ($window) return;

			$window = $(window);
			$body = $(document.body);
		}

		ensure();

		function parsePlacement(placement) {
			var ret = {},
				arr = placement.split(' ');
			ret.place = arr[0];
			ret.align = arr[1];
			return ret;
		}

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
			var place = options.place,
				align = options.align,
				o = options.offset,
				ep = context.ep,
				tp = context.tp;

			var offset = {
				top: 0,
				left: 0
			};

			switch (place) {
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
		// placement: [top, right, bottom, left] [start, center, end]
		// margin: the margin from the outer window
		// offset: the offset from the target
		// stub: true to stub the element before measuring, or the stub element itself
		//
		var func = options => {
			options.margin = options.margin || 5;
			options.offset = options.offset || 5;
			if (options.placement) {
				options.placementObject = parsePlacement(options.placement);
				options.place = options.placementObject.place;
				options.align = options.placementObject.align;
			}
			options.place = options.place || 'bottom';
			options.align = options.align || 'start';

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

		func.parsePlacement = parsePlacement;

		return func;
	}
})();

(function () {
	'use strict';

	angular
		.module('mr.uex')
		.factory('uexPositioningThrottler', positioningThrottler);

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
		.factory('uexUtil', util);

	function util() {
		return {
			camelToDash: str => {
				return str.replace(/\W+/g, '-').replace(/([a-z\d])([A-Z])/g, '$1-$2');
			},
			dashToCamel: str => {
				return str.replace(/\W+(.)/g, (x, chr) => chr.toUpperCase());
			}
		};
	}
})();

(function () {
	'use strict';

	angular
		.module('mr.uex')
		.factory('uexModal', modal);

	function modal($rootScope, $compile, $controller, $animate, $templateRequest, $q, uexUtil) {
		var instances = [],
			$body = $(document.body),
			$bd = angular.element('<div class="uex-modal-bd" />');

		$body.on('keydown', e => {
			if (!e.isDefaultPrevented() && e.which === 27) {
				$rootScope.$apply(() => {
					dismissTopModal(e);
				});
			}
		});

		// options:
		//   scope
		//   template - templateUrl
		//   component
		//   title
		//   classes
		//   locals
		//   canBeDismissedFromBD
		//
		var func = options => {
			options = angular.isString(options) ? {
				component: options
			} : options;
			// options.canBeDismissedFromBD = options.canBeDismissedFromBD === undefined ? false : true;
			var scope = (options.scope || $rootScope).$new(),
				$element = $(getTemplateModalContainer(options));

			var destroyAndClean = instance => {
				instance.scope.$destroy();
				var delegates = instance._delegates;
				for (var i = 0; i < delegates.length; i++) {
					delegates[i]();
				}
			};

			var deferred = $q.defer(),
				instance = {
					_delegates: [],
					scope: scope,
					element: $element,
					canBeDismissedFromBD: options.canBeDismissedFromBD,
					title: v => {
						scope.$title = v;
					},
					resolve: v => {
						deferred.resolve(v);
						instance.dismiss();
					},
					reject: reason => {
						instance.dismiss(reason);
					},
					dismiss: reason => {
						var i = instances.indexOf(instance);
						instances.splice(i, 1);
						var leaving = $animate.leave($element);

						if (instances.length === 0) {
							leaving.then(() => {
								$animate.leave($bd);
								$body.removeClass('uex-modal-active');
								destroyAndClean(instance);
							});
						} else {
							instances[instances.length - 1]._active(true);
							destroyAndClean(instance);
						}

						deferred.reject(reason);
					},
					onDismiss: action => {
						instance._delegates.push(action);
					},
					_active: value => {
						if (value) instance.element.removeClass('inactive');
						else instance.element.addClass('inactive');
					}
				};
			instances.push(instance);

			var resolve = angular.extend({},
				options.locals || {}, {
					modal: instance
				});
			var templatePromise = getTemplatePromise(options, resolve);

			templatePromise.then(template => {
				$element.find('.uex-modal-content').html(template);

				$compile($element)(angular.extend(scope, {
					$title: options.title || 'Modal',
					$modal: instance,
					$resolve: resolve,
					_tryDismiss: event => {
						if (scope.$modal.canBeDismissedFromBD && $(event.target).is('.uex-modal')) {
							scope.$modal.dismiss();
						}
					}
				}));

				if (instances.length !== 1) {
					for (var i = 0; i < instances.length - 1; i++) {
						instances[i]._active(false);
					}
				}

				$body.addClass('uex-modal-active');
				var bdEntering;
				if (instances.length === 1) {
					bdEntering = $animate.enter($bd, $body, $body.children().last());
				}
				(bdEntering || $q.when()).then(() => {
					$animate.enter($element, $body, $body.children().last());
				});
			}, () => {
				destroyAndClean(instance);
			});

			return {
				_instance: instance,
				promise: deferred.promise,
				scope: instance.scope,
				element: instance.$element,
				dismiss: instance.dismiss
			};
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
				open: parentScope => {
					var scope = (parentScope || $rootScope).$new(),
						instance = func({
							title: options.title,
							scope: angular.extend(scope, {
								danger: options.danger,
								yesText: options.yesText,
								noText: options.noText,
								info: options.info,
								resolve: v => {
									instance._instance.resolve(v);
								}
							}),
							template: '<div class="uex-modal-t-confirm">\
	<div class="uex-modal-t-confirm-content">' + options.template + '\
	</div>\
	<div class="uex-modal-t-confirm-actions">\
		<button type="button" class="btn btn-default no-btn" ng-click="$modal.dismiss()" ng-if="::!info">{{::noText}}</button>\
		<button type="button" class="btn yes-btn" ng-click="resolve()" ng-class="{danger: danger, \'btn-danger\': danger, \'btn-primary\': !danger}">{{::yesText}}</button>\
	</div>\
</div>'
						});

					instance.promise.then(null, () => {
						scope.$destroy();
					});

					return instance.promise;
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
				template: v => {
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

		//------------------------------------------------------------------------------

		function dismissTopModal(e) {
			if (instances.length === 0) {
				return;
			}

			e.preventDefault();
			var top = instances[instances.length - 1];
			top.dismiss();
		}

		function getClassesOption(options) {
			return options.classes || options['class'];
		}

		function getWrapperClasses(options) {
			var classes = getClassesOption(options);
			return classes ? ' ' + classes : '';
		}

		function getTemplateModalContainer(options) {
			return '\
<div class="uex-modal' + getWrapperClasses(options) + '" ng-click="_tryDismiss($event)">\
	<div class="uex-modal-container">\
		<div class="uex-modal-header">\
			<button type="button" class="uex-modal-close" ng-click="$modal.dismiss()">\
				<uex-icon icon="close"></uex-icon>\
			</button>\
			<h2>{{$title}}</h2>\
		</div>\
		<div class="uex-modal-content"></div>\
	</div>\
</div>';
		}

		function templateForComponent(name, resolve) {
			var t = '<' + name;
			if (resolve) {
				for (var p in resolve) {
					var pName = uexUtil.camelToDash(p);
					t += ' ' + pName + '="::$resolve.' + p + '"';
				}
			}
			t += '></' + name + '>';
			return t;
		}

		function getTemplatePromise(options, resolve) {
			if (options.component) {
				var componentName = uexUtil.camelToDash(options.component);
				return $q.when(templateForComponent(
					componentName,
					resolve));
			}

			return options.template ? $q.when(options.template.trim()) :
				$templateRequest(angular.isFunction(options.templateUrl) ?
					options.templateUrl() : options.templateUrl);
		}
	}
})();

(function () {
	"use strict";

	angular
		.module('mr.uex')
		.directive('uexModal', modal)
		.directive('uexModalConfirm', modalConfirm);

	function modal(uexModal) {
		return {
			restrict: 'E',
			scope: true,
			template: ($element, $attrs) => {
				$attrs.$html = $element.html();
				$element.empty();
			},
			bindToController: {
				delegate: '='
			},
			controllerAs: '$uexModalCtrl',
			controller: function ($scope, $element, $attrs) {
				var title = $attrs.title,
					classes = $attrs['class'],
					template = $attrs.$html;

				this.delegate = {
					open: options => {
						return uexModal(angular.extend({
							scope: $scope,
							title: title,
							classes: classes,
							template: template
						}, options));
					}
				};
			}
		};
	}

	function modalConfirm(uexModal) {
		return {
			restrict: 'E',
			scope: true,
			template: ($element, $attrs) => {
				$attrs.$html = $element.html();
				$element.empty();
			},
			bindToController: {
				delegate: '='
			},
			controllerAs: '$uexModalConfirmCtrl',
			controller: function ($scope, $element, $attrs) {
				var title = $attrs.title,
					classes = $attrs['class'],
					template = $attrs.$html;

				this.delegate = {
					open: () => {
						return uexModal.confirm()
							.classes(classes)
							.title(title)
							.template(template)
							.open($scope);
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

			this.run = e => {
				if (e.isDefaultPrevented()) {
					return;
				}

				e.preventDefault();
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
					if ($element.attr('disabled')) {
						return;
					}

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

(function () {
	'use strict';

	angular
		.module('mr.uex')
		.factory('uexPop', pop);

	function pop($rootScope, $compile, $animate, $templateRequest, $q, uexPositioningThrottler, uexPositioner, $timeout) {
		var _instance,
			$body = $(document.body);

		$body.on('keydown', e => {
			if (!e.isDefaultPrevented() && e.which === 27) {
				dismiss(e);
			}
		});

		uexPositioningThrottler.subscribe(context => {
			if (_instance) _instance.position();
		});

		// options:
		//   scope
		//   placement: [top, right, bottom, left] [start, center, end]
		//   offset
		//   target
		//   template - templateUrl
		//   lazy
		//   classes
		//   locals
		//   onPosition
		//
		var func = options => {
			validate(options);

			var $element = $(getTemplatePop(options)),
				linkfn;

			var createScope = () => {
				return (options.scope || $rootScope).$new();
			};

			var instance = {
				_delegates: [],
				target: angular.element(options.target),
				open: () => {
					if (_instance && _instance !== instance) {
						_instance.dismiss();
					}

					_instance = instance;

					var templatePromise;
					if (!linkfn) {
						templatePromise = getTemplatePromise(options).then(template => {
							$element.find('.uex-pop-content').html(template);
							linkfn = $compile($element);
						}, () => {
							destroyAndClean(instance);
						});
					} else {
						templatePromise = $q.when();
					}

					return templatePromise.then(() => {
						var scope = angular.extend(createScope(), {
							$pop: instance,
						}, options.locals || {});

						linkfn(scope, ($clone, scope) => {
							instance.scope = scope;

							scope.$on('$destroy', () => {
								instance.dismiss();
							});
							instance.element = instance.pop = $clone;

							instance.target.addClass('uex-pop-open');
							$body.addClass('uex-pop-active');
							$animate.enter($clone, $body, $body.children().last());
							scope.$evalAsync(() => instance.position());
						});
					});
				},
				dismiss: () => {
					$animate.leave(instance.element).then(() => {
						instance.target.removeClass('uex-pop-open');
						$body.removeClass('uex-pop-active');
						destroyAndClean(instance);
					});
				},
				position: stub => {
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
					var context = uexPositioner(o);
					if (options.onPosition) {
						options.onPosition(context);
					}

					uexPositioner.apply(context);
				},
				onDismiss: action => {
					instance._delegates.push(action);
				}
			};

			if (!options.lazy) {
				instance.open();
			}

			return instance;
		};

		return func;

		//------------------------------------------------------------------------------

		function validate(options) {
			if (!options.template && !options.templateUrl) {
				throw new Error('template or templateUrl must be provided.');
			}
		}

		function dismiss(e) {
			if (_instance) {
				e.preventDefault();
				_instance.dismiss();
				$rootScope.$applyAsync();
			}
		}

		function destroyAndClean(instance) {
			instance.scope.$destroy();
			var delegates = instance._delegates;
			for (var i = 0; i < delegates.length; i++) {
				delegates[i]();
			}

			if (instance === _instance) _instance = null;
		}

		function getClassesOption(options) {
			return options.classes || options['class'];
		}

		function getWrapperClasses(options) {
			var classes = getClassesOption(options);
			return classes ? ' ' + classes : '';
		}

		function getTemplatePop(options) {
			return '\
<div class="uex-pop' + getWrapperClasses(options) + '">\
	<div class="uex-pop-bd" ng-click="$pop.dismiss()"></div>\
	<div class="uex-pop-content">\
	</div>\
</div>';
		}

		function getTemplatePromise(options) {
			return options.template ? $q.when(options.template) :
				$templateRequest(angular.isFunction(options.templateUrl) ?
					options.templateUrl() : options.templateUrl);
		}
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

	function pop(uexPop) {
		return {
			restrict: 'E',
			terminal: true,
			scope: true,
			require: {
				popContainer: '^uexPopContainer'
			},
			bindToController: {
				delegate: '=?'
			},
			controllerAs: '$uexPopCtrl',
			controller: function ($scope, $element, $attrs) {
				var target,
					classes = $attrs['class'],
					template = $element.html(),
					on = $attrs.on || 'click';

				var showPop = () => {
					uexPop({
						scope: $scope,
						target: target,
						placement: $attrs.placement,
						classes: classes,
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

				this.$postLink = () => {
					$element.removeClass();
					$element.empty();
				};
			}
		};
	}
})();

(function () {
	'use strict';

	angular
		.module('mr.uex')
		.factory('uexPoptip', poptip);

	function poptip($rootScope, $animate, $compile, uexPositioner) {
		var $body = $(document.body);

		// options:
		//   scope
		//   placement: [top, right, bottom, left] [start, center, end]
		//   offset
		//   target
		//   template
		//   classes
		//   locals
		//   delay
		//
		var func = options => {
			options.placement = options.placement || 'bottom center';
			options.delay = options.delay || 0;
			options.trigger = options.trigger || 'hover';

			var scope = options.scope || $rootScope,
				target = options.target,
				element = $(getTemplatePoptip(options)),
				animateEnter,
				animateLeave,
				$arrow = element.find('.uex-poptip-arrow'),
				eventIn  = options.trigger === 'hover' ? 'mouseenter' : 'focusin',
				eventOut = options.trigger === 'hover' ? 'mouseleave' : 'focusout';

			var position = () => {
				var o = angular.extend(options, {
					target: target,
					element: element,
					margin: 5,
					stub: true
				});

				var context = uexPositioner(o);
				uexPositioner.apply(context);

				var v,
					ep = context.ep,
					tp = context.tp,
					p = uexPositioner.parsePlacement(options.placement);
				switch (p.place) {
					case 'top':
					case 'bottom':
						v = tp.left - ep.left + (tp.width / 2) - 5;
						if (v < 5) v = 5;
						if (v > ep.width - 15) v = ep.width - 15;
						$arrow.css('left', v + 'px');
						break;

					case 'right':
					case 'left':
						v = tp.top - ep.top + (tp.height / 2) - 5;
						if (v < 5) v = 5;
						if (v > ep.height - 15) v = ep.height - 15;
						$arrow.css('top', v + 'px');
						break;
				}

				animateEnter = $animate.enter(element, $body, $body.children().last());
			};

			$compile(element)(angular.extend(scope, options.locals || {}));

			var addToDOM = () => {
				if (animateLeave) $animate.cancel(animateLeave);
				position();
			};

			var removeFromDOM = () => {
				if (animateEnter) $animate.cancel(animateEnter);
				animateLeave = $animate.leave(element);
			};

			scope.$on('$destroy', () => {
				removeFromDOM();
			});

			target.on(eventIn, () => {
				scope.$apply(() => {
					addToDOM();
				});
			});

			target.on(eventOut, () => {
				scope.$apply(() => {
					removeFromDOM();
				});
			});
		};

		return func;

		//------------------------------------------------------------------------------

		function getClassesOption(options) {
			return options.classes || options['class'];
		}

		function getWrapperClasses(options) {
			var classes = getClassesOption(options);
			return classes ? ' ' + classes : '';
		}

		function getTemplatePoptip(options) {
			return  '\
<div class="uex-poptip uex-poptip-p-' + options.placement + getWrapperClasses(options) + '">\
	<div class="uex-poptip-arrow"></div>\
	<div class="uex-poptip-content">' + options.template + '</div>\
</div>';
		}
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
			controllerAs: '$uexPoptipTargetCtrl',
			controller: function ($element) {
				this.$onInit = () => {
					this.poptipContainer.registerTarget($element);
				};
			}
		};
	}

	function poptip(uexPoptip) {
		return {
			restrict: 'E',
			terminal: true,
			scope: false,
			template: ($element, $attrs) => {
				$attrs.$html = $element.html();
				$element.empty();
			},
			bindToController: true,
			require: {
				poptipContainer: '^uexPoptipContainer'
			},
			controllerAs: '$uexPoptipCtrl',
			controller: function ($scope, $element, $attrs) {
				var template = $attrs.$html;

				this.$onInit = () => {
					var target = this.poptipContainer.getTarget();

					uexPoptip({
						scope: $scope,
						target: target,
						placement: $attrs.placement,
						classes: $attrs['class'],
						trigger: $attrs.trigger,
						template: template
					});
				};
			}
		};
	}
})();

(function () {
	'use strict';

	angular.module('mr.uex').component('uexRadio', {
		template: '\
			<div class="_uex-icon">\
				<div class="_uex-on"></div>\
			</div>\
			<ng-transclude class="_uex-label"></ng-transclude>',
		transclude: true,
		controller: $ctrl,
		require: {
			uexRadioGroupCtrl: '^uexRadioGroup'
		},
		bindings: {
			value: '<'
		}
	});

	function $ctrl($scope, $element, $attrs) {
		var lastChecked;

		var render = () => {
			var attrValue = $attrs.value;
			var checked = attrValue === this.uexRadioGroupCtrl.model;
			if (checked === lastChecked) {
				return;
			}

			lastChecked = checked;
			if (checked) {
				$element.addClass('checked');
			} else {
				$element.removeClass('checked');
			}
		};

		$attrs.$observe('value', render);
		$scope.$watch(() => this.uexRadioGroupCtrl.model, render);

		var clickListener = e => {
			if (e.isDefaultPrevented() || $element.attr('disabled')) {
				return;
			}

			$scope.$apply(() => {
				this.uexRadioGroupCtrl.select($attrs.value);
			});
		}

		this.$postLink = () => {
			$element.on('click', clickListener);
		};
	}
})();

(function () {
	'use strict';

	angular.module('mr.uex').component('uexRadioGroup', {
		controller: $ctrl,
		require: {
			ngModelCtrl: '^ngModel'
		},
		bindings: {
			model: '=ngModel'
		}
	});

	function $ctrl($scope) {
		this.select = value => {
			this.ngModelCtrl.$setViewValue(value);
		};
	}
})();

(function () {
	'use strict';

	angular
		.module('mr.uex')
		.component('uexSelect', {
			template: ($element, $attrs) => {
				'ngInject';

				$attrs.$html = $element.html();
				$element.empty();

				return '\
<div class="uex-select" ng-class="{open: $ctrl.opened}">\
	<button type="button" class="button has-caret" ng-click="$ctrl.open()">\
		{{$ctrl.text}}\
	</button>\
	<uex-icon icon="close" class="btn-plain btn-dim" ng-if="$ctrl.clearable && $ctrl.selected" ng-click="$ctrl.clear()"></uex-icon>\
</div>';
			},
			controller: uexSelectCtrl,
			require: {
				ngModelCtrl: 'ngModel'
			},
			bindings: {
				exp: '@',
				originalText: '@text',
				header: '@?',
				classes: '@?',
				clearable: '<?'
			}
		})
		.directive('uexSelectTransclude', uexSelectTransclude)
		.directive('uexSelectSimple', uexSelectSimple);

	function uexSelectTransclude() {
		return {
			restrict: 'A',
			compile: function () {
				return {
					pre: function ($scope, $element, $attrs) {
						var ctrl = $scope.$ctrl;
						ctrl._populateScope($scope);

						$scope.$evalAsync(() => ctrl.pop().position());

						$scope.$on('$destroy', function () {
							ctrl._removeScope($scope);
						});
					}
				};
			}
		};
	}

	function uexSelectCtrl($scope, $element, $attrs, $parse, uexPop) {
		validate($attrs);

		var scopes = [],
			originalText = this.originalText,
			options = parse(this.exp),
			keyName = options.keyName,
			classes = this.classes || '',
			popInstance;

		var content = $attrs.$html,
			$button;

		var display = item => {
			if (options.asFn === angular.noop) return item;
			var locals = {};
			locals[keyName] = item;
			return options.asFn($scope, locals);
		};

		var track = item => {
			if (options.trackFn === angular.noop) return item;
			var locals = {};
			locals[keyName] = item;
			return options.trackFn($scope, locals);
		};

		var getItems = () => {
			return options.inFn($scope.$parent);
		};

		var setText = t => {
			this.text = t;
		};

		var resetText = () => {
			this.text = originalText;
		};

		this.$postLink = () => {
			$button = $element.find('.button');
		};

		this.$onInit = () => {
			this.ngModelCtrl.$render = () => {
				var value = this.ngModelCtrl.$viewValue;
				this.select(value ? value : null);
			};
		};

		this._populateScope = scope => {
			var item = scope.item;
			scopes.push(scope);
			if (item && track(item) === track(this.selected)) {
				scope.$selected = true;
			} else if (item) {
				scope.$selected = false;
			}
			if (item) {
				scope[keyName] = item;
			}
		};

		this._removeScope = scope => {
			var index = scopes.indexOf(scope);
			if (index >= 0) {
				scopes.splice(index, 1);
			}
		};

		this._findScope = (item, resolve, reject) => {
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

		this.open = () => {
			this.opened = true;
			if (!popInstance) {
				popInstance = uexPop({
					scope: $scope,
					target: $button,
					placement: 'bottom start',
					classes: 'uex-select-pop ' + classes,
					template: getTemplatePop(content)
				});
				popInstance.onDismiss(() => this.opened = false);
			} else {
				popInstance.open();
			}
		};

		this.close = () => {
			if (popInstance) popInstance.dismiss();
		};

		this.clear = () => this.select(null);

		this.select = item => {
			if (!item && !this.selected) return;

			this.selected = item;

			if (item) {
				this._findScope(item, scope => {
					scope.$selected = true;
				}, scope => {
					scope.$selected = false;
				});
				this.ngModelCtrl.$setViewValue(item);
				setText(display(item));
			} else {
				this._findScope(null, null, scope => {
					scope.$selected = false;
				});
				this.ngModelCtrl.$setViewValue(null);
				resetText();
			}

			this.close();
		};

		this.items = () => getItems();

		this.pop = () => popInstance;

		//------------------------------------------------------------------------------

		if (this.clearable === undefined) {
			this.clearable = true;
		}

		if (!this.header) {
			this.header = originalText;
		}

		this.opened = false;
		this.selected = null;
		this.text = originalText;

		//------------------------------------------------------------------------------

		function parse(exp) {
			var match = exp.match(
				/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+track\s+by\s+([\s\S]+?))?\s*$/);

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

		function getTemplatePop(content) {
			return '\
<header>\
	<uex-icon icon="close" class="close-btn btn-plain btn-dim" ng-click="$pop.dismiss()"></uex-icon>\
	<div class="header-text">{{::$ctrl.header}}</div>\
</header>\
<div class="_uex-content">\
	<ul class="options no-margin">\
		<li ng-repeat="item in $ctrl.items()" ng-click="$ctrl.select(item)" uex-select-transclude>' + content + '</li>\
	</ul>\
</div>';
		}
	}

	function uexSelectSimple() {
		return {
			restrict: 'E',
			transclude: true,
			template: '\
				<div class="uex-select-simple-content" ng-transclude></div>\
				<uex-icon icon="check" ng-class="{shown: $selected}"></uex-icon>'
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUuanMiLCJjaGVja2JveC9jaGVja2JveC5qcyIsImF1dG9jb21wbGV0ZS9hdXRvY29tcGxldGUuanMiLCJpY29uL2ljb24uanMiLCJtaXNjL2FsaWFzLmpzIiwibWlzYy9mb2N1cy5qcyIsIm1pc2MvcG9zaXRpb25lci5qcyIsIm1pc2MvcG9zaXRpb25pbmdUaHJvdHRsZXIuanMiLCJtaXNjL3V0aWwuanMiLCJtb2RhbC9tb2RhbC5qcyIsIm1vZGFsL21vZGFsRGlyZWN0aXZlLmpzIiwicC9wLmpzIiwicG9wL3BvcC5qcyIsInBvcC9wb3BEaXJlY3RpdmUuanMiLCJwb3B0aXAvcG9wdGlwLmpzIiwicG9wdGlwL3BvcHRpcERpcmVjdGl2ZS5qcyIsInJhZGlvL3JhZGlvLmpzIiwicmFkaW8vcmFkaW9Hcm91cC5qcyIsInNlbGVjdC9zZWxlY3QuanMiLCJ0b29sdGlwL3Rvb2x0aXAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL01BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeE5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6UkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4UEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoibmctbXItdWV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiYW5ndWxhclxyXG5cdC5tb2R1bGUoJ21yLnVleCcsIFsnbmdBbmltYXRlJ10pO1xyXG4iLCIoZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0YW5ndWxhci5tb2R1bGUoJ21yLnVleCcpLmNvbXBvbmVudCgndWV4Q2hlY2tib3gnLCB7XHJcblx0XHR0ZW1wbGF0ZTogJ1xcXHJcblx0XHRcdDxkaXYgY2xhc3M9XCJfdWV4LWljb25cIiBuZy1jbGFzcz1cIntcXCdjaGVja2VkXFwnOiAkY3RybC5tb2RlbH1cIj48L2Rpdj5cXFxyXG5cdFx0XHQ8bmctdHJhbnNjbHVkZSBjbGFzcz1cIl91ZXgtbGFiZWxcIj48L25nLXRyYW5zY2x1ZGU+JyxcclxuXHRcdHRyYW5zY2x1ZGU6IHRydWUsXHJcblx0XHRjb250cm9sbGVyOiAkY3RybCxcclxuXHRcdHJlcXVpcmU6IHtcclxuXHRcdFx0bmdNb2RlbEN0cmw6ICduZ01vZGVsJ1xyXG5cdFx0fSxcclxuXHRcdGJpbmRpbmdzOiB7XHJcblx0XHRcdG1vZGVsOiAnPW5nTW9kZWwnXHJcblx0XHR9XHJcblx0fSk7XHJcblxyXG5cdGZ1bmN0aW9uICRjdHJsKCRzY29wZSwgJGVsZW1lbnQpIHtcclxuXHRcdHZhciByZW5kZXIgPSAoKSA9PiB7XHJcblx0XHRcdGlmICh0aGlzLm1vZGVsKSB7XHJcblx0XHRcdFx0JGVsZW1lbnQuYWRkQ2xhc3MoJ2NoZWNrZWQnKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQkZWxlbWVudC5yZW1vdmVDbGFzcygnY2hlY2tlZCcpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdCRzY29wZS4kd2F0Y2goKCkgPT4gdGhpcy5tb2RlbCwgcmVuZGVyKTtcclxuXHJcblx0XHR2YXIgY2xpY2tMaXN0ZW5lciA9IGUgPT4ge1xyXG5cdFx0XHRpZiAoZS5pc0RlZmF1bHRQcmV2ZW50ZWQoKSB8fCAkZWxlbWVudC5hdHRyKCdkaXNhYmxlZCcpKSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQkc2NvcGUuJGFwcGx5KCgpID0+IHtcclxuXHRcdFx0XHR2YXIgdmlld1ZhbHVlID0gIXRoaXMubW9kZWw7XHJcblx0XHRcdFx0dGhpcy5uZ01vZGVsQ3RybC4kc2V0Vmlld1ZhbHVlKHZpZXdWYWx1ZSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLiRwb3N0TGluayA9ICgpID0+IHtcclxuXHRcdFx0JGVsZW1lbnQub24oJ2NsaWNrJywgY2xpY2tMaXN0ZW5lcik7XHJcblx0XHR9O1xyXG5cdH1cclxufSkoKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdGFuZ3VsYXJcclxuXHRcdC5tb2R1bGUoJ21yLnVleCcpXHJcblx0XHQuZGlyZWN0aXZlKCd1ZXhBdXRvY29tcGxldGUnLCB1ZXhBdXRvY29tcGxldGUpO1xyXG5cclxuXHRmdW5jdGlvbiB1ZXhBdXRvY29tcGxldGVDdHJsKCRzY29wZSwgJGF0dHJzLCAkcGFyc2UsICRxKSB7XHJcblx0XHRmdW5jdGlvbiBwYXJzZShleHApIHtcclxuXHRcdFx0dmFyIG1hdGNoID0gZXhwLm1hdGNoKC9eXFxzKihbXFxzXFxTXSs/KVxccytpblxccysoW1xcc1xcU10rPykoPzpcXHMrYXNcXHMrKFtcXHNcXFNdKz8pKT9cXHMqJC8pO1xyXG5cclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRrZXlOYW1lOiBtYXRjaFsxXSxcclxuXHRcdFx0XHRpbkZuOiAkcGFyc2UobWF0Y2hbMl0pLFxyXG5cdFx0XHRcdGFzRm46ICRwYXJzZShtYXRjaFszXSlcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoJGF0dHJzLmV4cCA9PT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcignXFwndWV4QXV0b2NvbXBsZXRlXFwnOiBBdHRyaWJ1dGUgXFwnZXhwXFwnIGlzIHJlcXVpcmVkLicpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBjdHJsID0gdGhpcyxcclxuXHRcdFx0b3B0aW9ucyA9IHBhcnNlKCRhdHRycy5leHApLFxyXG5cdFx0XHRrZXlOYW1lID0gb3B0aW9ucy5rZXlOYW1lLFxyXG5cdFx0XHRwcm9taXNlO1xyXG5cclxuXHRcdGN0cmwuaXRlbXMgPSBbXTtcclxuXHRcdGN0cmwudGV4dCA9IFtdO1xyXG5cdFx0Y3RybC5vcHRpb25zID0gb3B0aW9ucztcclxuXHRcdGN0cmwua2V5TmFtZSA9IGtleU5hbWU7XHJcblx0XHRjdHJsLmFjdGl2ZUl0ZW0gPSBudWxsO1xyXG5cdFx0Y3RybC5hY3RpdmVJbmRleCA9IC0xO1xyXG5cclxuXHRcdHZhciB0cmFuc2llbnQgPSBmYWxzZTtcclxuXHJcblx0XHRjdHJsLmRpc3BsYXkgPSBmdW5jdGlvbiAoaXRlbSkge1xyXG5cdFx0XHRpZiAob3B0aW9ucy5hc0ZuID09PSBhbmd1bGFyLm5vb3ApIHJldHVybiBpdGVtO1xyXG5cdFx0XHR2YXIgbG9jYWxzID0ge307XHJcblx0XHRcdGxvY2Fsc1trZXlOYW1lXSA9IGl0ZW07XHJcblx0XHRcdHJldHVybiBvcHRpb25zLmFzRm4oJHNjb3BlLCBsb2NhbHMpO1xyXG5cdFx0fTtcclxuXHJcblx0XHRjdHJsLnNlbGVjdCA9IGZ1bmN0aW9uIChpdGVtKSB7XHJcblx0XHRcdGN0cmwudGV4dCA9IGN0cmwuZGlzcGxheShpdGVtKTtcclxuXHRcdFx0Y3RybC5jbGVhcigpO1xyXG5cdFx0XHR0cmFuc2llbnQgPSB0cnVlO1xyXG5cdFx0fTtcclxuXHJcblx0XHRjdHJsLnNldEFjdGl2ZSA9IGZ1bmN0aW9uIChpbmRleCkge1xyXG5cdFx0XHRpZiAoaW5kZXggPT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRcdGN0cmwuYWN0aXZlSXRlbSA9IG51bGw7XHJcblx0XHRcdFx0Y3RybC5hY3RpdmVJbmRleCA9IC0xO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHR2YXIgaXRlbSA9IGN0cmwuaXRlbXNbaW5kZXhdO1xyXG5cclxuXHRcdFx0Y3RybC5hY3RpdmVJdGVtID0gaXRlbTtcclxuXHRcdFx0Y3RybC5hY3RpdmVJbmRleCA9IGluZGV4O1xyXG5cdFx0fTtcclxuXHJcblx0XHRjdHJsLm1vdXNlb3ZlciA9IGZ1bmN0aW9uIChpdGVtLCBpbmRleCkge1xyXG5cdFx0XHRjdHJsLnNldEFjdGl2ZShpbmRleCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdGN0cmwuY2xlYXIgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdGN0cmwuaXRlbXMgPSBbXTtcclxuXHRcdFx0Y3RybC5zZXRBY3RpdmUoKTtcclxuXHRcdH07XHJcblxyXG5cdFx0ZnVuY3Rpb24gZmlsdGVySWZOb3RQcm9taXNlKG8pIHtcclxuXHRcdFx0aWYgKG8udGhlbikgcmV0dXJuIG87XHJcblx0XHRcdHZhciB0ZXh0ID0gY3RybC50ZXh0O1xyXG5cdFx0XHRpZiAoIXRleHQgfHwgdGV4dC50cmltKCkgPT09ICcnKSByZXR1cm4gbztcclxuXHRcdFx0dmFyIHIgPSBbXTtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBvLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0aWYgKGN0cmwuZGlzcGxheShvW2ldKS5pbmRleE9mKHRleHQpID4gLTEpIHtcclxuXHRcdFx0XHRcdHIucHVzaChvW2ldKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIHI7XHJcblx0XHR9XHJcblxyXG5cdFx0JHNjb3BlLiR3YXRjaChmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHJldHVybiBjdHJsLnRleHQ7XHJcblx0XHR9LCBmdW5jdGlvbiB3YXRjaFRleHQodiwgb2xkKSB7XHJcblx0XHRcdGlmICh2ID09PSBvbGQgfHwgdiA9PT0gbnVsbCB8fCB0cmFuc2llbnQpIHtcclxuXHRcdFx0XHR0cmFuc2llbnQgPSBmYWxzZTtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHRcdFx0Y3RybC5uZ01vZGVsLiRzZXRWaWV3VmFsdWUodik7XHJcblx0XHRcdGN0cmwubG9hZGluZyA9IHRydWU7XHJcblx0XHRcdGN0cmwuY2xlYXIoKTtcclxuXHRcdFx0dmFyIHAgPSBwcm9taXNlID0gJHEud2hlbihmaWx0ZXJJZk5vdFByb21pc2UoY3RybC5vcHRpb25zLmluRm4oJHNjb3BlLCB7IC8vIGpzaGludCBpZ25vcmU6bGluZVxyXG5cdFx0XHRcdHE6IHZcclxuXHRcdFx0fSkpKTtcclxuXHRcdFx0cC50aGVuKGZ1bmN0aW9uIChkKSB7XHJcblx0XHRcdFx0aWYgKHAgIT09IHByb21pc2UpIHJldHVybjtcclxuXHRcdFx0XHRjdHJsLml0ZW1zID0gZDtcclxuXHRcdFx0fSkuZmluYWxseShmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0Y3RybC5sb2FkaW5nID0gZmFsc2U7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiB1ZXhBdXRvY29tcGxldGUoJGRvY3VtZW50KSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRyZXN0cmljdDogJ0UnLFxyXG5cdFx0XHRjb250cm9sbGVyOiB1ZXhBdXRvY29tcGxldGVDdHJsLFxyXG5cdFx0XHRjb250cm9sbGVyQXM6ICckdWV4QXV0b2NvbXBsZXRlQ3RybCcsXHJcblx0XHRcdHRlbXBsYXRlOiBmdW5jdGlvbiAoZWxlbWVudCwgYXR0cikge1xyXG5cdFx0XHRcdGZ1bmN0aW9uIGdldEl0ZW1UZW1wbGF0ZSgpIHtcclxuXHRcdFx0XHRcdHZhciB0ZW1wbGF0ZVRhZyA9IGVsZW1lbnQuZmluZCgndWV4LWl0ZW0tdGVtcGxhdGUnKS5kZXRhY2goKSxcclxuXHRcdFx0XHRcdFx0aHRtbCA9IHRlbXBsYXRlVGFnLmxlbmd0aCA/IHRlbXBsYXRlVGFnLmh0bWwoKSA6IGVsZW1lbnQuaHRtbCgpO1xyXG5cdFx0XHRcdFx0aWYgKCF0ZW1wbGF0ZVRhZy5sZW5ndGgpIGVsZW1lbnQuZW1wdHkoKTtcclxuXHRcdFx0XHRcdHJldHVybiBodG1sO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gJ1xcXHJcbjxkaXYgY2xhc3M9XCJ1ZXgtYXV0b2NvbXBsZXRlXCI+XFxcclxuXHQ8aW5wdXQgdHlwZT1cInRleHRcIiBuZy1tb2RlbD1cIiR1ZXhBdXRvY29tcGxldGVDdHJsLnRleHRcIiBuZy1rZXlkb3duPVwia2V5ZG93bigkZXZlbnQpXCIgPlxcXHJcblx0PGRpdiBjbGFzcz1cInVleC1hdXRvY29tcGxldGUtbGlzdFwiIG5nLWlmPVwiJHVleEF1dG9jb21wbGV0ZUN0cmwuaXRlbXMubGVuZ3RoID4gMFwiPlxcXHJcblx0XHQ8ZGl2IGNsYXNzPVwidWV4LWF1dG9jb21wbGV0ZS1pdGVtXCJcXFxyXG5cdFx0XHQgbmctcmVwZWF0PVwiaXRlbSBpbiAkdWV4QXV0b2NvbXBsZXRlQ3RybC5pdGVtc1wiXFxcclxuXHRcdFx0IG5nLWNsaWNrPVwiJHVleEF1dG9jb21wbGV0ZUN0cmwuc2VsZWN0KGl0ZW0pXCJcXFxyXG5cdFx0XHQgbmctY2xhc3M9XCJ7IGFjdGl2ZTogJGluZGV4ID09ICR1ZXhBdXRvY29tcGxldGVDdHJsLmFjdGl2ZUluZGV4IH1cIlxcXHJcblx0XHRcdCBuZy1tb3VzZW92ZXI9XCIkdWV4QXV0b2NvbXBsZXRlQ3RybC5tb3VzZW92ZXIoaXRlbSwgJGluZGV4KVwiXFxcclxuXHRcdFx0IHVleC1hbGlhcz1cIml0ZW0ge3s6OiR1ZXhBdXRvY29tcGxldGVDdHJsLmtleU5hbWV9fVwiPicgK1xyXG5cdFx0XHRcdFx0Z2V0SXRlbVRlbXBsYXRlKCkgKyAnXFxcclxuXHRcdDwvZGl2PlxcXHJcblx0PC9kaXY+XFxcclxuPC9kaXY+JztcclxuXHRcdFx0fSxcclxuXHRcdFx0cmVxdWlyZTogWyd1ZXhBdXRvY29tcGxldGUnLCAnbmdNb2RlbCddLFxyXG5cdFx0XHRzY29wZTogdHJ1ZSxcclxuXHRcdFx0bGluazogZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQsICRhdHRycywgY3RybHMsICR0cmFuc2NsdWRlKSB7XHJcblx0XHRcdFx0dmFyIGN0cmwgPSBjdHJsc1swXSxcclxuXHRcdFx0XHRcdG5nTW9kZWwgPSBjdHJsc1sxXTtcclxuXHJcblx0XHRcdFx0Y3RybC5uZ01vZGVsID0gbmdNb2RlbDtcclxuXHJcblx0XHRcdFx0bmdNb2RlbC4kcmVuZGVyID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0Y3RybC50ZXh0ID0gbmdNb2RlbC4kdmlld1ZhbHVlO1xyXG5cdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdCRzY29wZS5rZXlkb3duID0gZnVuY3Rpb24gKGUpIHtcclxuXHRcdFx0XHRcdHZhciBrZXkgPSBlLndoaWNoLFxyXG5cdFx0XHRcdFx0XHRzaG91bGRQcmV2ZW50RGVmYXVsdCA9IHRydWU7XHJcblxyXG5cdFx0XHRcdFx0c3dpdGNoIChrZXkpIHtcclxuXHRcdFx0XHRcdFx0Y2FzZSAxMzogLy8gZW50ZXJcclxuXHRcdFx0XHRcdFx0XHRjdHJsLnNlbGVjdChjdHJsLmFjdGl2ZUl0ZW0pO1xyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdFx0Y2FzZSAyNzogLy8gZXNjXHJcblx0XHRcdFx0XHRcdFx0Y3RybC5jbGVhcigpO1xyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdFx0Y2FzZSAzODogLy8gdXBcclxuXHRcdFx0XHRcdFx0XHRpZiAoY3RybC5pdGVtcy5sZW5ndGggPT09IDApIGJyZWFrO1xyXG5cdFx0XHRcdFx0XHRcdGlmIChjdHJsLmFjdGl2ZUluZGV4ID09PSAtMSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0Y3RybC5zZXRBY3RpdmUoY3RybC5pdGVtcy5sZW5ndGggLSAxKTtcclxuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRpZiAoY3RybC5hY3RpdmVJbmRleCAtIDEgPCAwKSBicmVhaztcclxuXHRcdFx0XHRcdFx0XHRjdHJsLnNldEFjdGl2ZShjdHJsLmFjdGl2ZUluZGV4IC0gMSk7XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0XHRjYXNlIDQwOiAvLyBkb3duXHJcblx0XHRcdFx0XHRcdFx0aWYgKGN0cmwuaXRlbXMubGVuZ3RoID09PSAwKSBicmVhaztcclxuXHRcdFx0XHRcdFx0XHRpZiAoY3RybC5hY3RpdmVJbmRleCA9PT0gLTEpIHtcclxuXHRcdFx0XHRcdFx0XHRcdGN0cmwuc2V0QWN0aXZlKDApO1xyXG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdGlmIChjdHJsLmFjdGl2ZUluZGV4ICsgMSA+PSBjdHJsLml0ZW1zLmxlbmd0aCkgYnJlYWs7XHJcblx0XHRcdFx0XHRcdFx0Y3RybC5zZXRBY3RpdmUoY3RybC5hY3RpdmVJbmRleCArIDEpO1xyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRcdFx0XHRzaG91bGRQcmV2ZW50RGVmYXVsdCA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdGlmIChzaG91bGRQcmV2ZW50RGVmYXVsdCkge1xyXG5cdFx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0JGVsZW1lbnQub24oJ2tleWRvd24nLCBmdW5jdGlvbiAoZSkge1xyXG5cdFx0XHRcdFx0aWYgKGUud2hpY2ggPT09IDI3KSB7XHJcblx0XHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0XHRcdFx0JHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHRcdFx0Y3RybC5jbGVhcigpO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0JGRvY3VtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XHJcblx0XHRcdFx0XHRpZiAoISQuY29udGFpbnMoJGVsZW1lbnRbMF0sIGUudGFyZ2V0KSkge1xyXG5cdFx0XHRcdFx0XHQkc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdFx0XHRjdHJsLmNsZWFyKCk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxufSkoKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdGFuZ3VsYXJcclxuXHRcdC5tb2R1bGUoJ21yLnVleCcpXHJcblx0XHQucHJvdmlkZXIoJ3VleEljb25zJywgdWV4SWNvbnNQcm92aWRlcilcclxuXHRcdC5kaXJlY3RpdmUoJ3VleEljb24nLCB1ZXhJY29uKTtcclxuXHJcblx0ZnVuY3Rpb24gdWV4SWNvbnNQcm92aWRlcigpIHtcclxuXHRcdHZhciBpY29ucyA9IFt7XHJcblx0XHRcdGlkOiAnYWRkLHBsdXMnLFxyXG5cdFx0XHRzdmc6ICc8cGF0aCBkPVwiTTE5MiAyMjR2LTEyOGgtNjR2MTI4aC0xMjh2NjRoMTI4djEyOGg2NHYtMTI4aDEyOHYtNjRoLTEyOHpcIi8+JyxcclxuXHRcdFx0dmlld0JveDogJzAgMCAzMjAgNTEyJ1xyXG5cdFx0fSwge1xyXG5cdFx0XHRpZDogJ2Nsb3NlJyxcclxuXHRcdFx0c3ZnOiAnPHBhdGggZD1cIk03LjQ4IDhsMy43NSAzLjc1LTEuNDggMS40OEw2IDkuNDhsLTMuNzUgMy43NS0xLjQ4LTEuNDhMNC41MiA4IC43NyA0LjI1bDEuNDgtMS40OEw2IDYuNTJsMy43NS0zLjc1IDEuNDggMS40OHpcIi8+JyxcclxuXHRcdFx0dmlld0JveDogJzAgMCAxMiAxNidcclxuXHRcdH0sIHtcclxuXHRcdFx0aWQ6ICdhcnJvdy10b3AnLFxyXG5cdFx0XHRzdmc6ICc8cGF0aCBkPVwiTTUgM0wwIDloM3Y0aDRWOWgzelwiLz4nLFxyXG5cdFx0XHR2aWV3Qm94OiAnMCAwIDEwIDE2J1xyXG5cdFx0fSwge1xyXG5cdFx0XHRpZDogJ2Fycm93LXJpZ2h0JyxcclxuXHRcdFx0c3ZnOiAnPHBhdGggZD1cIk0xMCA4TDQgM3YzSDB2NGg0djN6XCIvPicsXHJcblx0XHRcdHZpZXdCb3g6ICcwIDAgMTAgMTYnXHJcblx0XHR9LCB7XHJcblx0XHRcdGlkOiAnYXJyb3ctYm90dG9tJyxcclxuXHRcdFx0c3ZnOiAnPHBhdGggZD1cIk03IDdWM0gzdjRIMGw1IDYgNS02elwiLz4nLFxyXG5cdFx0XHR2aWV3Qm94OiAnMCAwIDEwIDE2J1xyXG5cdFx0fSwge1xyXG5cdFx0XHRpZDogJ2Fycm93LWxlZnQnLFxyXG5cdFx0XHRzdmc6ICc8cGF0aCBkPVwiTTYgM0wwIDhsNiA1di0zaDRWNkg2elwiLz4nLFxyXG5cdFx0XHR2aWV3Qm94OiAnMCAwIDEwIDE2J1xyXG5cdFx0fSwge1xyXG5cdFx0XHRpZDogJ2NoZXZyb24tdG9wJyxcclxuXHRcdFx0c3ZnOiAnPHBhdGggZD1cIk0xNjAgMTI4bC0xNjAgMTYwIDY0IDY0IDk2LTk2IDk2IDk2IDY0LTY0LTE2MC0xNjB6XCIvPicsXHJcblx0XHRcdHZpZXdCb3g6ICcwIDAgMzIwIDUxMidcclxuXHRcdH0sIHtcclxuXHRcdFx0aWQ6ICdjaGV2cm9uLXJpZ2h0JyxcclxuXHRcdFx0c3ZnOiAnPHBhdGggZD1cIk02NCA5NmwtNjQgNjQgOTYgOTYtOTYgOTYgNjQgNjQgMTYwLTE2MC0xNjAtMTYwelwiLz4nLFxyXG5cdFx0XHR2aWV3Qm94OiAnMCAwIDIyNCA1MTInXHJcblx0XHR9LCB7XHJcblx0XHRcdGlkOiAnY2hldnJvbi1ib3R0b20nLFxyXG5cdFx0XHRzdmc6ICc8cGF0aCBkPVwiTTI1NiAxNjBsLTk2IDk2LTk2LTk2LTY0IDY0IDE2MCAxNjAgMTYwLTE2MC02NC02NHpcIi8+JyxcclxuXHRcdFx0dmlld0JveDogJzAgMCAzMjAgNTEyJ1xyXG5cdFx0fSwge1xyXG5cdFx0XHRpZDogJ2NoZXZyb24tbGVmdCcsXHJcblx0XHRcdHN2ZzogJzxwYXRoIGQ9XCJNMjI0IDE2MGwtNjQtNjQtMTYwIDE2MCAxNjAgMTYwIDY0LTY0LTk2LTk2IDk2LTk2elwiLz4nLFxyXG5cdFx0XHR2aWV3Qm94OiAnMCAwIDIyNCA1MTInXHJcblx0XHR9LCB7XHJcblx0XHRcdGlkOiAnZG9uZSxjaGVjaycsXHJcblx0XHRcdHN2ZzogJzxwYXRoIGQ9XCJNMzIwIDk2bC0xOTIgMTkyLTY0LTY0LTY0IDY0IDEyOCAxMjggMjU2LTI1Ni02NC02NHpcIi8+JyxcclxuXHRcdFx0dmlld0JveDogJzAgMCAzODQgNTEyJ1xyXG5cdFx0fSwge1xyXG5cdFx0XHRpZDogJ2VkaXQscGVuY2lsJyxcclxuXHRcdFx0c3ZnOiAnPHBhdGggZD1cIk0zNTIgMzJsLTY0IDY0IDk2IDk2IDY0LTY0LTk2LTk2ek0wIDM4NGwwLjM0NCA5Ni4yODEgOTUuNjU2LTAuMjgxIDI1Ni0yNTYtOTYtOTYtMjU2IDI1NnpNOTYgNDQ4aC02NHYtNjRoMzJ2MzJoMzJ2MzJ6XCIvPicsXHJcblx0XHRcdHZpZXdCb3g6ICcwIDAgNDQ4IDUxMidcclxuXHRcdH0sIHtcclxuXHRcdFx0aWQ6ICd0cmFzaCcsXHJcblx0XHRcdHN2ZzogJzxwYXRoIGQ9XCJNMTEgMkg5YzAtLjU1LS40NS0xLTEtMUg1Yy0uNTUgMC0xIC40NS0xIDFIMmMtLjU1IDAtMSAuNDUtMSAxdjFjMCAuNTUuNDUgMSAxIDF2OWMwIC41NS40NSAxIDEgMWg3Yy41NSAwIDEtLjQ1IDEtMVY1Yy41NSAwIDEtLjQ1IDEtMVYzYzAtLjU1LS40NS0xLTEtMXptLTEgMTJIM1Y1aDF2OGgxVjVoMXY4aDFWNWgxdjhoMVY1aDF2OXptMS0xMEgyVjNoOXYxelwiLz4nLFxyXG5cdFx0XHR2aWV3Qm94OiAnMCAwIDEyIDE2J1xyXG5cdFx0fSwge1xyXG5cdFx0XHRpZDogJ21lbnUnLFxyXG5cdFx0XHRzdmc6ICc8cGF0aCBkPVwiTTggNHYxSDBWNGg4ek0wIDhoOFY3SDB2MXptMCAzaDh2LTFIMHYxelwiLz4nLFxyXG5cdFx0XHR2aWV3Qm94OiAnMCAwIDggMTYnXHJcblx0XHR9LCB7XHJcblx0XHRcdGlkOiAnY29tbWVudCcsXHJcblx0XHRcdHN2ZzogJzxwYXRoIGQ9XCJNMTQgMUgyYy0uNTUgMC0xIC40NS0xIDF2OGMwIC41NS40NSAxIDEgMWgydjMuNUw3LjUgMTFIMTRjLjU1IDAgMS0uNDUgMS0xVjJjMC0uNTUtLjQ1LTEtMS0xem0wIDlIN2wtMiAydi0ySDJWMmgxMnY4elwiLz4nLFxyXG5cdFx0XHR2aWV3Qm94OiAnMCAwIDE2IDE2J1xyXG5cdFx0fSwge1xyXG5cdFx0XHRpZDogJ2ZpbGUnLFxyXG5cdFx0XHRzdmc6ICc8cGF0aCBkPVwiTTYgNUgyVjRoNHYxek0yIDhoN1Y3SDJ2MXptMCAyaDdWOUgydjF6bTAgMmg3di0xSDJ2MXptMTAtNy41VjE0YzAgLjU1LS40NSAxLTEgMUgxYy0uNTUgMC0xLS40NS0xLTFWMmMwLS41NS40NS0xIDEtMWg3LjVMMTIgNC41ek0xMSA1TDggMkgxdjEyaDEwVjV6XCIvPicsXHJcblx0XHRcdHZpZXdCb3g6ICcwIDAgMTIgMTYnXHJcblx0XHR9LCB7XHJcblx0XHRcdGlkOiAnY29nLGdlYXInLFxyXG5cdFx0XHRzdmc6ICc8cGF0aCBkPVwiTTE0IDguNzd2LTEuNmwtMS45NC0uNjQtLjQ1LTEuMDkuODgtMS44NC0xLjEzLTEuMTMtMS44MS45MS0xLjA5LS40NS0uNjktMS45MmgtMS42bC0uNjMgMS45NC0xLjExLjQ1LTEuODQtLjg4LTEuMTMgMS4xMy45MSAxLjgxLS40NSAxLjA5TDAgNy4yM3YxLjU5bDEuOTQuNjQuNDUgMS4wOS0uODggMS44NCAxLjEzIDEuMTMgMS44MS0uOTEgMS4wOS40NS42OSAxLjkyaDEuNTlsLjYzLTEuOTQgMS4xMS0uNDUgMS44NC44OCAxLjEzLTEuMTMtLjkyLTEuODEuNDctMS4wOUwxNCA4Ljc1di4wMnpNNyAxMWMtMS42NiAwLTMtMS4zNC0zLTNzMS4zNC0zIDMtMyAzIDEuMzQgMyAzLTEuMzQgMy0zIDN6XCIvPicsXHJcblx0XHRcdHZpZXdCb3g6ICcwIDAgMTQgMTYnXHJcblx0XHR9LCB7XHJcblx0XHRcdGlkOiAnbGluaycsXHJcblx0XHRcdHN2ZzogJzxwYXRoIGQ9XCJNNCA5aDF2MUg0Yy0xLjUgMC0zLTEuNjktMy0zLjVTMi41NSAzIDQgM2g0YzEuNDUgMCAzIDEuNjkgMyAzLjUgMCAxLjQxLS45MSAyLjcyLTIgMy4yNVY4LjU5Yy41OC0uNDUgMS0xLjI3IDEtMi4wOUMxMCA1LjIyIDguOTggNCA4IDRINGMtLjk4IDAtMiAxLjIyLTIgMi41UzMgOSA0IDl6bTktM2gtMXYxaDFjMSAwIDIgMS4yMiAyIDIuNVMxMy45OCAxMiAxMyAxMkg5Yy0uOTggMC0yLTEuMjItMi0yLjUgMC0uODMuNDItMS42NCAxLTIuMDlWNi4yNWMtMS4wOS41My0yIDEuODQtMiAzLjI1QzYgMTEuMzEgNy41NSAxMyA5IDEzaDRjMS40NSAwIDMtMS42OSAzLTMuNVMxNC41IDYgMTMgNnpcIi8+JyxcclxuXHRcdFx0dmlld0JveDogJzAgMCAxNiAxNidcclxuXHRcdH0sIHtcclxuXHRcdFx0aWQ6ICdsaW5rLWV4dGVybmFsJyxcclxuXHRcdFx0c3ZnOiAnPHBhdGggZD1cIk0xMSAxMGgxdjNjMCAuNTUtLjQ1IDEtMSAxSDFjLS41NSAwLTEtLjQ1LTEtMVYzYzAtLjU1LjQ1LTEgMS0xaDN2MUgxdjEwaDEwdi0zek02IDJsMi4yNSAyLjI1TDUgNy41IDYuNSA5bDMuMjUtMy4yNUwxMiA4VjJINnpcIi8+JyxcclxuXHRcdFx0dmlld0JveDogJzAgMCAxMiAxNidcclxuXHRcdH0sIHtcclxuXHRcdFx0aWQ6ICdtYWlsJyxcclxuXHRcdFx0c3ZnOiAnPHBhdGggZD1cIk0wIDR2OGMwIC41NS40NSAxIDEgMWgxMmMuNTUgMCAxLS40NSAxLTFWNGMwLS41NS0uNDUtMS0xLTFIMWMtLjU1IDAtMSAuNDUtMSAxem0xMyAwTDcgOSAxIDRoMTJ6TTEgNS41bDQgMy00IDN2LTZ6TTIgMTJsMy41LTNMNyAxMC41IDguNSA5bDMuNSAzSDJ6bTExLS41bC00LTMgNC0zdjZ6XCIvPicsXHJcblx0XHRcdHZpZXdCb3g6ICcwIDAgMTQgMTYnXHJcblx0XHR9LCB7XHJcblx0XHRcdGlkOiAnc2VhcmNoJyxcclxuXHRcdFx0c3ZnOiAnPHBhdGggZD1cIk0xNS43IDEzLjNsLTMuODEtMy44M0E1LjkzIDUuOTMgMCAwIDAgMTMgNmMwLTMuMzEtMi42OS02LTYtNlMxIDIuNjkgMSA2czIuNjkgNiA2IDZjMS4zIDAgMi40OC0uNDEgMy40Ny0xLjExbDMuODMgMy44MWMuMTkuMi40NS4zLjcuMy4yNSAwIC41Mi0uMDkuNy0uM2EuOTk2Ljk5NiAwIDAgMCAwLTEuNDF2LjAxek03IDEwLjdjLTIuNTkgMC00LjctMi4xMS00LjctNC43IDAtMi41OSAyLjExLTQuNyA0LjctNC43IDIuNTkgMCA0LjcgMi4xMSA0LjcgNC43IDAgMi41OS0yLjExIDQuNy00LjcgNC43elwiLz4nLFxyXG5cdFx0XHR2aWV3Qm94OiAnMCAwIDE2IDE2J1xyXG5cdFx0fSwge1xyXG5cdFx0XHRpZDogJ3phcCcsXHJcblx0XHRcdHN2ZzogJzxwYXRoIGQ9XCJNMTAgN0g2bDMtNy05IDloNGwtMyA3elwiLz4nLFxyXG5cdFx0XHR2aWV3Qm94OiAnMCAwIDEwIDE2J1xyXG5cdFx0fV07XHJcblxyXG5cdFx0dGhpcy5hZGQgPSBpY29uID0+IHtcclxuXHRcdFx0aWNvbnMudW5zaGlmdChpY29uKTtcclxuXHRcdFx0cmV0dXJuIHRoaXM7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuJGdldCA9ICgpID0+IGljb25zO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gdWV4SWNvbih1ZXhJY29ucykge1xyXG5cdFx0dmFyIGljb25zID0gdWV4SWNvbnM7XHJcblxyXG5cdFx0ZnVuY3Rpb24gaWRFeGlzdHMoaWRzLCBpZCkge1xyXG5cdFx0XHR2YXIgYWxsID0gaWRzLnNwbGl0KCcsJyk7XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgYWxsLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0aWYgKGFsbFtpXS50cmltKCkgPT09IGlkKVxyXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGZpbmRJY29uQnlJZChpZCkge1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGljb25zLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0dmFyIGljb24gPSBpY29uc1tpXTtcclxuXHJcblx0XHRcdFx0aWYgKGlkRXhpc3RzKGljb24uaWQsIGlkKSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIGljb247XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcigndWV4SWNvbjogXCInICsgaWQgKyAnXCIgaGFzIG5vdCBiZWVuIGZvdW5kLicpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIHdyYXAoY29udGVudCwgdmlld0JveCkge1xyXG5cdFx0XHR2aWV3Qm94ID0gdmlld0JveCB8fCAnMCAwIDUxMiA1MTInO1xyXG5cdFx0XHRyZXR1cm4gJzxzdmcgdmVyc2lvbj1cIjEuMVwiIHg9XCIwcHhcIiB5PVwiMHB4XCIgdmlld0JveD1cIicgKyB2aWV3Qm94ICsgJ1wiPicgKyBjb250ZW50ICsgJzwvc3ZnPic7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0cmVzdHJpY3Q6ICdFQScsXHJcblx0XHRcdGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMpIHtcclxuXHRcdFx0XHR2YXIgaWQsIGljb247XHJcblx0XHRcdFx0aWYgKCRhdHRycy51ZXhJY29uKSB7XHJcblx0XHRcdFx0XHRpZCA9ICRhdHRycy51ZXhJY29uO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRpZCA9ICRhdHRycy5pY29uO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0aWNvbiA9IGZpbmRJY29uQnlJZChpZCk7XHJcblx0XHRcdFx0aWYgKCFpY29uLnN2Zykge1xyXG5cdFx0XHRcdFx0aWNvbiA9IGZpbmRJY29uQnlJZChpY29uLnJlZik7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHR2YXIgY29udGVudCA9IHdyYXAoaWNvbi5zdmcsIGljb24udmlld0JveCB8fCBpY29uLnZpZXdib3gpO1xyXG5cdFx0XHRcdCRlbGVtZW50LmVtcHR5KCk7XHJcblx0XHRcdFx0JGVsZW1lbnQuYXBwZW5kKGNvbnRlbnQpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxufSkoKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdGFuZ3VsYXJcclxuXHRcdC5tb2R1bGUoJ21yLnVleCcpXHJcblx0XHQuZGlyZWN0aXZlKCd1ZXhBbGlhcycsIHVleEFsaWFzKTtcclxuXHJcblx0ZnVuY3Rpb24gdWV4QWxpYXMoKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRyZXN0cmljdDogJ0EnLFxyXG5cdFx0XHRsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzKSB7XHJcblx0XHRcdFx0dmFyIGV4cHIgPSAkYXR0cnMudWV4QWxpYXMsXHJcblx0XHRcdFx0XHRwYXJ0cyA9IGV4cHIuc3BsaXQoJyAnKSxcclxuXHRcdFx0XHRcdHNvdXJjZSA9IHBhcnRzWzBdLFxyXG5cdFx0XHRcdFx0ZGVzdCA9IHBhcnRzWzFdO1xyXG5cclxuXHRcdFx0XHQkc2NvcGUuJHdhdGNoKCgpID0+ICRzY29wZS4kZXZhbChzb3VyY2UpLCAobiwgbykgPT4ge1xyXG5cdFx0XHRcdFx0JHNjb3BlW2Rlc3RdID0gbjtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcbn0pKCk7XHJcbiIsIihmdW5jdGlvbiAoKSB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cclxuXHRhbmd1bGFyXHJcblx0XHQubW9kdWxlKCdtci51ZXgnKVxyXG5cdFx0LmRpcmVjdGl2ZSgndWV4Rm9jdXMnLCB1ZXhGb2N1cyk7XHJcblxyXG5cdGZ1bmN0aW9uIHVleEZvY3VzKCR0aW1lb3V0KSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRyZXN0cmljdDogJ0EnLFxyXG5cdFx0XHRsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzKSB7XHJcblx0XHRcdFx0JHNjb3BlLiRvbigndWV4LmZvY3VzJywgKCkgPT4ge1xyXG5cdFx0XHRcdFx0JHRpbWVvdXQoJGVsZW1lbnQuZm9jdXMpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxufSkoKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdGFuZ3VsYXJcclxuXHRcdC5tb2R1bGUoJ21yLnVleCcpXHJcblx0XHQuZmFjdG9yeSgndWV4UG9zaXRpb25lcicsIHBvc2l0aW9uZXIpO1xyXG5cclxuXHRmdW5jdGlvbiBwb3NpdGlvbmVyKCkge1xyXG5cdFx0dmFyICR3aW5kb3csXHJcblx0XHRcdCRib2R5O1xyXG5cclxuXHRcdGZ1bmN0aW9uIGVuc3VyZSgpIHtcclxuXHRcdFx0aWYgKCR3aW5kb3cpIHJldHVybjtcclxuXHJcblx0XHRcdCR3aW5kb3cgPSAkKHdpbmRvdyk7XHJcblx0XHRcdCRib2R5ID0gJChkb2N1bWVudC5ib2R5KTtcclxuXHRcdH1cclxuXHJcblx0XHRlbnN1cmUoKTtcclxuXHJcblx0XHRmdW5jdGlvbiBwYXJzZVBsYWNlbWVudChwbGFjZW1lbnQpIHtcclxuXHRcdFx0dmFyIHJldCA9IHt9LFxyXG5cdFx0XHRcdGFyciA9IHBsYWNlbWVudC5zcGxpdCgnICcpO1xyXG5cdFx0XHRyZXQucGxhY2UgPSBhcnJbMF07XHJcblx0XHRcdHJldC5hbGlnbiA9IGFyclsxXTtcclxuXHRcdFx0cmV0dXJuIHJldDtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBtZWFzdXJlKGVsZW1lbnQsIGZuKSB7XHJcblx0XHRcdHZhciBlbCA9IGVsZW1lbnQuY2xvbmUoZmFsc2UpO1xyXG5cdFx0XHRlbC5jc3MoJ3Zpc2liaWxpdHknLCAnaGlkZGVuJyk7XHJcblx0XHRcdGVsLmNzcygncG9zaXRpb24nLCAnYWJzb2x1dGUnKTtcclxuXHRcdFx0JGJvZHkuYXBwZW5kKGVsKTtcclxuXHRcdFx0dmFyIHJlc3VsdCA9IGZuKGVsKTtcclxuXHRcdFx0ZWwucmVtb3ZlKCk7XHJcblx0XHRcdHJldHVybiByZXN1bHQ7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gY29tcHV0ZUxlZnRGb3JWZXJ0aWNhbCh0cCwgZXAsIG9mZnNldCwgYWxpZ24pIHtcclxuXHRcdFx0c3dpdGNoIChhbGlnbikge1xyXG5cdFx0XHRcdGNhc2UgJ3N0YXJ0JzpcclxuXHRcdFx0XHRcdG9mZnNldC5sZWZ0ID0gdHAubGVmdDtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRjYXNlICdjZW50ZXInOlxyXG5cdFx0XHRcdFx0b2Zmc2V0LmxlZnQgPSB0cC5sZWZ0ICsgKHRwLndpZHRoIC8gMikgLSAoZXAud2lkdGggLyAyKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRjYXNlICdlbmQnOlxyXG5cdFx0XHRcdFx0b2Zmc2V0LmxlZnQgPSB0cC5sZWZ0ICsgdHAud2lkdGggLSBlcC53aWR0aDtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gY29tcHV0ZVRvcEZvckhvcml6b250YWwodHAsIGVwLCBvZmZzZXQsIGFsaWduKSB7XHJcblx0XHRcdHN3aXRjaCAoYWxpZ24pIHtcclxuXHRcdFx0XHRjYXNlICdzdGFydCc6XHJcblx0XHRcdFx0XHRvZmZzZXQudG9wID0gdHAudG9wO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdGNhc2UgJ2NlbnRlcic6XHJcblx0XHRcdFx0XHRvZmZzZXQudG9wID0gdHAudG9wICsgKHRwLmhlaWdodCAvIDIpIC0gKGVwLmhlaWdodCAvIDIpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdGNhc2UgJ2VuZCc6XHJcblx0XHRcdFx0XHRvZmZzZXQudG9wID0gdHAudG9wICsgdHAuaGVpZ2h0IC0gZXAuaGVpZ2h0O1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBjb21wdXRlT2Zmc2V0KGNvbnRleHQsIG9wdGlvbnMpIHtcclxuXHRcdFx0dmFyIHBsYWNlID0gb3B0aW9ucy5wbGFjZSxcclxuXHRcdFx0XHRhbGlnbiA9IG9wdGlvbnMuYWxpZ24sXHJcblx0XHRcdFx0byA9IG9wdGlvbnMub2Zmc2V0LFxyXG5cdFx0XHRcdGVwID0gY29udGV4dC5lcCxcclxuXHRcdFx0XHR0cCA9IGNvbnRleHQudHA7XHJcblxyXG5cdFx0XHR2YXIgb2Zmc2V0ID0ge1xyXG5cdFx0XHRcdHRvcDogMCxcclxuXHRcdFx0XHRsZWZ0OiAwXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRzd2l0Y2ggKHBsYWNlKSB7XHJcblx0XHRcdFx0Y2FzZSAndG9wJzpcclxuXHRcdFx0XHRcdG9mZnNldC50b3AgPSB0cC50b3AgLSBlcC5oZWlnaHQgLSBvO1xyXG5cdFx0XHRcdFx0Y29tcHV0ZUxlZnRGb3JWZXJ0aWNhbCh0cCwgZXAsIG9mZnNldCwgYWxpZ24pO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdGNhc2UgJ3JpZ2h0JzpcclxuXHRcdFx0XHRcdG9mZnNldC5sZWZ0ID0gdHAubGVmdCArIHRwLndpZHRoICsgbztcclxuXHRcdFx0XHRcdGNvbXB1dGVUb3BGb3JIb3Jpem9udGFsKHRwLCBlcCwgb2Zmc2V0LCBhbGlnbik7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0Y2FzZSAnYm90dG9tJzpcclxuXHRcdFx0XHRcdG9mZnNldC50b3AgPSB0cC50b3AgKyB0cC5oZWlnaHQgKyBvO1xyXG5cdFx0XHRcdFx0Y29tcHV0ZUxlZnRGb3JWZXJ0aWNhbCh0cCwgZXAsIG9mZnNldCwgYWxpZ24pO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdGNhc2UgJ2xlZnQnOlxyXG5cdFx0XHRcdFx0b2Zmc2V0LmxlZnQgPSB0cC5sZWZ0IC0gZXAud2lkdGggLSBvO1xyXG5cdFx0XHRcdFx0Y29tcHV0ZVRvcEZvckhvcml6b250YWwodHAsIGVwLCBvZmZzZXQsIGFsaWduKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gb2Zmc2V0O1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGNvYXJzZU9mZnNldChjb250ZXh0LCBvcHRpb25zKSB7XHJcblx0XHRcdHZhciBvZmZzZXQgPSBjb250ZXh0Lm9mZnNldCxcclxuXHRcdFx0XHRtYXJnaW4gPSBvcHRpb25zLm1hcmdpbiB8fCAwLFxyXG5cdFx0XHRcdHNjcm9sbFRvcCA9ICR3aW5kb3cuc2Nyb2xsVG9wKCksXHJcblx0XHRcdFx0Z3AgPSB7XHJcblx0XHRcdFx0XHRsZWZ0OiBtYXJnaW4sXHJcblx0XHRcdFx0XHR0b3A6IG1hcmdpbixcclxuXHRcdFx0XHRcdHdpZHRoOiAkd2luZG93LndpZHRoKCkgLSBtYXJnaW4gKiAyLFxyXG5cdFx0XHRcdFx0aGVpZ2h0OiAkd2luZG93LmhlaWdodCgpIC0gbWFyZ2luICogMlxyXG5cdFx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBDb2Fyc2UgbGVmdFxyXG5cdFx0XHRpZiAob2Zmc2V0LmxlZnQgKyBjb250ZXh0LmVwLndpZHRoID4gZ3Aud2lkdGgpIHtcclxuXHRcdFx0XHRvZmZzZXQubGVmdCAtPSBvZmZzZXQubGVmdCArIGNvbnRleHQuZXAud2lkdGggLSBncC53aWR0aDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ29hcnNlIHRvcFxyXG5cdFx0XHRpZiAob2Zmc2V0LnRvcCArIGNvbnRleHQuZXAuaGVpZ2h0ID4gZ3AuaGVpZ2h0ICsgc2Nyb2xsVG9wKSB7XHJcblx0XHRcdFx0b2Zmc2V0LnRvcCAtPSBvZmZzZXQudG9wICsgY29udGV4dC5lcC5oZWlnaHQgLSBncC5oZWlnaHQgLSBzY3JvbGxUb3A7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENvYXJzZSBuZWdhdGl2ZXNcclxuXHRcdFx0aWYgKG9mZnNldC5sZWZ0IDwgZ3AubGVmdCkgb2Zmc2V0LmxlZnQgPSBncC5sZWZ0O1xyXG5cdFx0XHRpZiAob2Zmc2V0LnRvcCA8IGdwLnRvcCArIHNjcm9sbFRvcCkgb2Zmc2V0LnRvcCA9IGdwLnRvcCArIHNjcm9sbFRvcDtcclxuXHJcblx0XHRcdC8vIFNldCBtYXhXaWR0aFxyXG5cdFx0XHRvZmZzZXQubWF4V2lkdGggPSBncC53aWR0aDtcclxuXHJcblx0XHRcdC8vIFNldCBtYXhIZWlnaHRcclxuXHRcdFx0b2Zmc2V0Lm1heEhlaWdodCA9IGdwLmhlaWdodDtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBtZWFzdXJpbmcob3B0aW9ucywgZm4pIHtcclxuXHRcdFx0aWYgKG9wdGlvbnMuc3R1YiA9PT0gdHJ1ZSkge1xyXG5cdFx0XHRcdG1lYXN1cmUob3B0aW9ucy5lbGVtZW50LCBmbik7XHJcblx0XHRcdH0gZWxzZSBpZiAob3B0aW9ucy5zdHViKSB7XHJcblx0XHRcdFx0Zm4ob3B0aW9ucy5zdHViKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRmbihvcHRpb25zLmVsZW1lbnQpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gdGFyZ2V0OiB0aGUgdGFyZ2V0IGVsZW1lbnRcclxuXHRcdC8vIGVsZW1lbnQ6IHRoZSBlbGVtZW50IHRvIGJlIHBvc2l0aW9uZWRcclxuXHRcdC8vIHBsYWNlbWVudDogW3RvcCwgcmlnaHQsIGJvdHRvbSwgbGVmdF0gW3N0YXJ0LCBjZW50ZXIsIGVuZF1cclxuXHRcdC8vIG1hcmdpbjogdGhlIG1hcmdpbiBmcm9tIHRoZSBvdXRlciB3aW5kb3dcclxuXHRcdC8vIG9mZnNldDogdGhlIG9mZnNldCBmcm9tIHRoZSB0YXJnZXRcclxuXHRcdC8vIHN0dWI6IHRydWUgdG8gc3R1YiB0aGUgZWxlbWVudCBiZWZvcmUgbWVhc3VyaW5nLCBvciB0aGUgc3R1YiBlbGVtZW50IGl0c2VsZlxyXG5cdFx0Ly9cclxuXHRcdHZhciBmdW5jID0gb3B0aW9ucyA9PiB7XHJcblx0XHRcdG9wdGlvbnMubWFyZ2luID0gb3B0aW9ucy5tYXJnaW4gfHwgNTtcclxuXHRcdFx0b3B0aW9ucy5vZmZzZXQgPSBvcHRpb25zLm9mZnNldCB8fCA1O1xyXG5cdFx0XHRpZiAob3B0aW9ucy5wbGFjZW1lbnQpIHtcclxuXHRcdFx0XHRvcHRpb25zLnBsYWNlbWVudE9iamVjdCA9IHBhcnNlUGxhY2VtZW50KG9wdGlvbnMucGxhY2VtZW50KTtcclxuXHRcdFx0XHRvcHRpb25zLnBsYWNlID0gb3B0aW9ucy5wbGFjZW1lbnRPYmplY3QucGxhY2U7XHJcblx0XHRcdFx0b3B0aW9ucy5hbGlnbiA9IG9wdGlvbnMucGxhY2VtZW50T2JqZWN0LmFsaWduO1xyXG5cdFx0XHR9XHJcblx0XHRcdG9wdGlvbnMucGxhY2UgPSBvcHRpb25zLnBsYWNlIHx8ICdib3R0b20nO1xyXG5cdFx0XHRvcHRpb25zLmFsaWduID0gb3B0aW9ucy5hbGlnbiB8fCAnc3RhcnQnO1xyXG5cclxuXHRcdFx0dmFyIHRhcmdldCA9IG9wdGlvbnMudGFyZ2V0LFxyXG5cdFx0XHRcdGVsZW1lbnQgPSBvcHRpb25zLmVsZW1lbnQsXHJcblx0XHRcdFx0dGFyZ2V0T2Zmc2V0ID0gdGFyZ2V0Lm9mZnNldCgpO1xyXG5cclxuXHRcdFx0dmFyIHRwID0ge1xyXG5cdFx0XHRcdHRvcDogdGFyZ2V0T2Zmc2V0LnRvcCxcclxuXHRcdFx0XHRsZWZ0OiB0YXJnZXRPZmZzZXQubGVmdCxcclxuXHRcdFx0XHR3aWR0aDogdGFyZ2V0Lm91dGVyV2lkdGgoKSxcclxuXHRcdFx0XHRoZWlnaHQ6IHRhcmdldC5vdXRlckhlaWdodCgpXHJcblx0XHRcdH07XHJcblx0XHRcdHZhciBlcCA9IHt9O1xyXG5cdFx0XHRtZWFzdXJpbmcob3B0aW9ucywgZWwgPT4ge1xyXG5cdFx0XHRcdGVwLndpZHRoID0gZWwub3V0ZXJXaWR0aCgpO1xyXG5cdFx0XHRcdGVwLmhlaWdodCA9IGVsLm91dGVySGVpZ2h0KCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0XHR2YXIgY29udGV4dCA9IHtcclxuXHRcdFx0XHR0YXJnZXQ6IHRhcmdldCxcclxuXHRcdFx0XHRlbGVtZW50OiBlbGVtZW50LFxyXG5cdFx0XHRcdHRwOiB0cCxcclxuXHRcdFx0XHRlcDogZXBcclxuXHRcdFx0fTtcclxuXHRcdFx0dmFyIG9mZnNldCA9IGNvbXB1dGVPZmZzZXQoY29udGV4dCwgb3B0aW9ucyk7XHJcblx0XHRcdGNvbnRleHQub2Zmc2V0ID0gb2Zmc2V0O1xyXG5cdFx0XHRjb2Fyc2VPZmZzZXQoY29udGV4dCwgb3B0aW9ucyk7XHJcblx0XHRcdGNvbnRleHQuZXAubGVmdCA9IG9mZnNldC5sZWZ0O1xyXG5cdFx0XHRjb250ZXh0LmVwLnRvcCA9IG9mZnNldC50b3A7XHJcblxyXG5cdFx0XHRyZXR1cm4gY29udGV4dDtcclxuXHRcdH07XHJcblxyXG5cdFx0ZnVuYy5hcHBseSA9IChjb250ZXh0KSA9PiB7XHJcblx0XHRcdHZhciBlbGVtZW50ID0gY29udGV4dC5lbGVtZW50LFxyXG5cdFx0XHRcdG9mZnNldCA9IGNvbnRleHQub2Zmc2V0O1xyXG5cclxuXHRcdFx0ZWxlbWVudC5jc3MoJ3RvcCcsIG9mZnNldC50b3ApO1xyXG5cdFx0XHRlbGVtZW50LmNzcygnbGVmdCcsIG9mZnNldC5sZWZ0KTtcclxuXHRcdFx0aWYgKG9mZnNldC5tYXhXaWR0aCkge1xyXG5cdFx0XHRcdGVsZW1lbnQuY3NzKCdtYXgtd2lkdGgnLCBvZmZzZXQubWF4V2lkdGgpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChvZmZzZXQubWF4SGVpZ2h0KSB7XHJcblx0XHRcdFx0ZWxlbWVudC5jc3MoJ21heC1oZWlnaHQnLCBvZmZzZXQubWF4SGVpZ2h0KTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHRmdW5jLnBhcnNlUGxhY2VtZW50ID0gcGFyc2VQbGFjZW1lbnQ7XHJcblxyXG5cdFx0cmV0dXJuIGZ1bmM7XHJcblx0fVxyXG59KSgpO1xyXG4iLCIoZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0YW5ndWxhclxyXG5cdFx0Lm1vZHVsZSgnbXIudWV4JylcclxuXHRcdC5mYWN0b3J5KCd1ZXhQb3NpdGlvbmluZ1Rocm90dGxlcicsIHBvc2l0aW9uaW5nVGhyb3R0bGVyKTtcclxuXHJcblx0ZnVuY3Rpb24gbm93KCkge1xyXG5cdFx0cmV0dXJuICtuZXcgRGF0ZSgpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gcmVtb3ZlKGFycmF5LCBpdGVtKSB7XHJcblx0XHR2YXIgaW5kZXggPSBhcnJheS5pbmRleE9mKGl0ZW0pO1xyXG5cdFx0YXJyYXkuc3BsaWNlKGluZGV4LCAxKTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHBvc2l0aW9uaW5nVGhyb3R0bGVyKCkge1xyXG5cdFx0dmFyIGhhbmRsZXJzID0gW10sXHJcblx0XHRcdCR3aW5kb3cgPSAkKHdpbmRvdyksXHJcblx0XHRcdGxhc3RDYWxsID0gbnVsbCxcclxuXHRcdFx0bGFzdER1cmF0aW9uID0gbnVsbCxcclxuXHRcdFx0cGVuZGluZ1RpbWVvdXQgPSBudWxsO1xyXG5cclxuXHRcdHZhciBnZXRDb250ZXh0ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdGNsaWVudDoge1xyXG5cdFx0XHRcdFx0aGVpZ2h0OiAkd2luZG93LmhlaWdodCgpLFxyXG5cdFx0XHRcdFx0d2lkdGg6ICR3aW5kb3cud2lkdGgoKSxcclxuXHRcdFx0XHRcdHRvcDogJHdpbmRvdy5zY3JvbGxUb3AoKVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHRcdH07XHJcblxyXG5cdFx0ZnVuY3Rpb24gaGFuZGxlclNhdGlzZmllcyhldmVudHMsIGUpIHtcclxuXHRcdFx0aWYgKCFldmVudHMpIHtcclxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0XHR2YXIgdHlwZSA9IGUudHlwZSxcclxuXHRcdFx0XHRmb3VuZCA9IGZhbHNlO1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGV2ZW50cy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdGlmIChldmVudHNbaV0gPT09IHR5cGUpIGZvdW5kID0gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gZm91bmQ7XHJcblx0XHR9XHJcblxyXG5cdFx0dmFyIHByb2Nlc3NIYW5kbGVycyA9IGUgPT4ge1xyXG5cdFx0XHR2YXIgY29udGV4dCA9IGdldENvbnRleHQoKTtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBoYW5kbGVycy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdHZhciBjb21wb3NpdGUgPSBoYW5kbGVyc1tpXSxcclxuXHRcdFx0XHRcdGhhbmRsZXIgPSBjb21wb3NpdGUuaGFuZGxlcixcclxuXHRcdFx0XHRcdGV2ZW50cyA9IGNvbXBvc2l0ZS5ldmVudHM7XHJcblx0XHRcdFx0aWYgKGUgJiYgIWhhbmRsZXJTYXRpc2ZpZXMoZXZlbnRzLCBlKSkgIHtcclxuXHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRoYW5kbGVyKGNvbnRleHQpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdHZhciB0aWNrID0gZnVuY3Rpb24gKGUpIHtcclxuXHRcdFx0aWYgKHR5cGVvZiBsYXN0RHVyYXRpb24gIT09ICd1bmRlZmluZWQnICYmIGxhc3REdXJhdGlvbiA+IDE2KSB7XHJcblx0XHRcdFx0bGFzdER1cmF0aW9uID0gTWF0aC5taW4obGFzdER1cmF0aW9uIC0gMTYsIDI1MCk7XHJcblxyXG5cdFx0XHRcdHBlbmRpbmdUaW1lb3V0ID0gc2V0VGltZW91dCh0aWNrLCAyNTApO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKHR5cGVvZiBsYXN0Q2FsbCAhPT0gJ3VuZGVmaW5lZCcgJiYgbm93KCkgLSBsYXN0Q2FsbCA8IDEwKSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAodHlwZW9mIHBlbmRpbmdUaW1lb3V0ICE9PSAndW5kZWZpbmVkJykge1xyXG5cdFx0XHRcdGNsZWFyVGltZW91dChwZW5kaW5nVGltZW91dCk7XHJcblx0XHRcdFx0cGVuZGluZ1RpbWVvdXQgPSBudWxsO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRsYXN0Q2FsbCA9IG5vdygpO1xyXG5cdFx0XHRwcm9jZXNzSGFuZGxlcnMoZSk7XHJcblx0XHRcdGxhc3REdXJhdGlvbiA9IG5vdygpIC0gbGFzdENhbGw7XHJcblx0XHR9O1xyXG5cclxuXHRcdCQoKCkgPT4ge1xyXG5cdFx0XHRwcm9jZXNzSGFuZGxlcnMoKTtcclxuXHRcdFx0WydyZXNpemUnLCAnc2Nyb2xsJywgJ3RvdWNobW92ZSddLmZvckVhY2goZXZlbnQgPT4ge1xyXG5cdFx0XHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCB0aWNrKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRzdWJzY3JpYmU6IChoYW5kbGVyLCBldmVudHMpID0+IHtcclxuXHRcdFx0XHRpZiAoYW5ndWxhci5pc1N0cmluZyhldmVudHMpKSB7XHJcblx0XHRcdFx0XHRldmVudHMgPSBbZXZlbnRzXTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0aGFuZGxlcnMucHVzaCh7aGFuZGxlcjogaGFuZGxlciwgZXZlbnRzOiBldmVudHN9KTtcclxuXHRcdFx0XHRwcm9jZXNzSGFuZGxlcnMoKTtcclxuXHRcdFx0XHRyZXR1cm4gKCkgPT4ge1xyXG5cdFx0XHRcdFx0cmVtb3ZlKGhhbmRsZXJzLCBoYW5kbGVyKTtcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxufSkoKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdGFuZ3VsYXJcclxuXHRcdC5tb2R1bGUoJ21yLnVleCcpXHJcblx0XHQuZmFjdG9yeSgndWV4VXRpbCcsIHV0aWwpO1xyXG5cclxuXHRmdW5jdGlvbiB1dGlsKCkge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0Y2FtZWxUb0Rhc2g6IHN0ciA9PiB7XHJcblx0XHRcdFx0cmV0dXJuIHN0ci5yZXBsYWNlKC9cXFcrL2csICctJykucmVwbGFjZSgvKFthLXpcXGRdKShbQS1aXSkvZywgJyQxLSQyJyk7XHJcblx0XHRcdH0sXHJcblx0XHRcdGRhc2hUb0NhbWVsOiBzdHIgPT4ge1xyXG5cdFx0XHRcdHJldHVybiBzdHIucmVwbGFjZSgvXFxXKyguKS9nLCAoeCwgY2hyKSA9PiBjaHIudG9VcHBlckNhc2UoKSk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG59KSgpO1xyXG4iLCIoZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0YW5ndWxhclxyXG5cdFx0Lm1vZHVsZSgnbXIudWV4JylcclxuXHRcdC5mYWN0b3J5KCd1ZXhNb2RhbCcsIG1vZGFsKTtcclxuXHJcblx0ZnVuY3Rpb24gbW9kYWwoJHJvb3RTY29wZSwgJGNvbXBpbGUsICRjb250cm9sbGVyLCAkYW5pbWF0ZSwgJHRlbXBsYXRlUmVxdWVzdCwgJHEsIHVleFV0aWwpIHtcclxuXHRcdHZhciBpbnN0YW5jZXMgPSBbXSxcclxuXHRcdFx0JGJvZHkgPSAkKGRvY3VtZW50LmJvZHkpLFxyXG5cdFx0XHQkYmQgPSBhbmd1bGFyLmVsZW1lbnQoJzxkaXYgY2xhc3M9XCJ1ZXgtbW9kYWwtYmRcIiAvPicpO1xyXG5cclxuXHRcdCRib2R5Lm9uKCdrZXlkb3duJywgZSA9PiB7XHJcblx0XHRcdGlmICghZS5pc0RlZmF1bHRQcmV2ZW50ZWQoKSAmJiBlLndoaWNoID09PSAyNykge1xyXG5cdFx0XHRcdCRyb290U2NvcGUuJGFwcGx5KCgpID0+IHtcclxuXHRcdFx0XHRcdGRpc21pc3NUb3BNb2RhbChlKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gb3B0aW9uczpcclxuXHRcdC8vICAgc2NvcGVcclxuXHRcdC8vICAgdGVtcGxhdGUgLSB0ZW1wbGF0ZVVybFxyXG5cdFx0Ly8gICBjb21wb25lbnRcclxuXHRcdC8vICAgdGl0bGVcclxuXHRcdC8vICAgY2xhc3Nlc1xyXG5cdFx0Ly8gICBsb2NhbHNcclxuXHRcdC8vICAgY2FuQmVEaXNtaXNzZWRGcm9tQkRcclxuXHRcdC8vXHJcblx0XHR2YXIgZnVuYyA9IG9wdGlvbnMgPT4ge1xyXG5cdFx0XHRvcHRpb25zID0gYW5ndWxhci5pc1N0cmluZyhvcHRpb25zKSA/IHtcclxuXHRcdFx0XHRjb21wb25lbnQ6IG9wdGlvbnNcclxuXHRcdFx0fSA6IG9wdGlvbnM7XHJcblx0XHRcdC8vIG9wdGlvbnMuY2FuQmVEaXNtaXNzZWRGcm9tQkQgPSBvcHRpb25zLmNhbkJlRGlzbWlzc2VkRnJvbUJEID09PSB1bmRlZmluZWQgPyBmYWxzZSA6IHRydWU7XHJcblx0XHRcdHZhciBzY29wZSA9IChvcHRpb25zLnNjb3BlIHx8ICRyb290U2NvcGUpLiRuZXcoKSxcclxuXHRcdFx0XHQkZWxlbWVudCA9ICQoZ2V0VGVtcGxhdGVNb2RhbENvbnRhaW5lcihvcHRpb25zKSk7XHJcblxyXG5cdFx0XHR2YXIgZGVzdHJveUFuZENsZWFuID0gaW5zdGFuY2UgPT4ge1xyXG5cdFx0XHRcdGluc3RhbmNlLnNjb3BlLiRkZXN0cm95KCk7XHJcblx0XHRcdFx0dmFyIGRlbGVnYXRlcyA9IGluc3RhbmNlLl9kZWxlZ2F0ZXM7XHJcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBkZWxlZ2F0ZXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRcdGRlbGVnYXRlc1tpXSgpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCksXHJcblx0XHRcdFx0aW5zdGFuY2UgPSB7XHJcblx0XHRcdFx0XHRfZGVsZWdhdGVzOiBbXSxcclxuXHRcdFx0XHRcdHNjb3BlOiBzY29wZSxcclxuXHRcdFx0XHRcdGVsZW1lbnQ6ICRlbGVtZW50LFxyXG5cdFx0XHRcdFx0Y2FuQmVEaXNtaXNzZWRGcm9tQkQ6IG9wdGlvbnMuY2FuQmVEaXNtaXNzZWRGcm9tQkQsXHJcblx0XHRcdFx0XHR0aXRsZTogdiA9PiB7XHJcblx0XHRcdFx0XHRcdHNjb3BlLiR0aXRsZSA9IHY7XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0cmVzb2x2ZTogdiA9PiB7XHJcblx0XHRcdFx0XHRcdGRlZmVycmVkLnJlc29sdmUodik7XHJcblx0XHRcdFx0XHRcdGluc3RhbmNlLmRpc21pc3MoKTtcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRyZWplY3Q6IHJlYXNvbiA9PiB7XHJcblx0XHRcdFx0XHRcdGluc3RhbmNlLmRpc21pc3MocmVhc29uKTtcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRkaXNtaXNzOiByZWFzb24gPT4ge1xyXG5cdFx0XHRcdFx0XHR2YXIgaSA9IGluc3RhbmNlcy5pbmRleE9mKGluc3RhbmNlKTtcclxuXHRcdFx0XHRcdFx0aW5zdGFuY2VzLnNwbGljZShpLCAxKTtcclxuXHRcdFx0XHRcdFx0dmFyIGxlYXZpbmcgPSAkYW5pbWF0ZS5sZWF2ZSgkZWxlbWVudCk7XHJcblxyXG5cdFx0XHRcdFx0XHRpZiAoaW5zdGFuY2VzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRcdFx0XHRcdGxlYXZpbmcudGhlbigoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHQkYW5pbWF0ZS5sZWF2ZSgkYmQpO1xyXG5cdFx0XHRcdFx0XHRcdFx0JGJvZHkucmVtb3ZlQ2xhc3MoJ3VleC1tb2RhbC1hY3RpdmUnKTtcclxuXHRcdFx0XHRcdFx0XHRcdGRlc3Ryb3lBbmRDbGVhbihpbnN0YW5jZSk7XHJcblx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0aW5zdGFuY2VzW2luc3RhbmNlcy5sZW5ndGggLSAxXS5fYWN0aXZlKHRydWUpO1xyXG5cdFx0XHRcdFx0XHRcdGRlc3Ryb3lBbmRDbGVhbihpbnN0YW5jZSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdGRlZmVycmVkLnJlamVjdChyZWFzb24pO1xyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdG9uRGlzbWlzczogYWN0aW9uID0+IHtcclxuXHRcdFx0XHRcdFx0aW5zdGFuY2UuX2RlbGVnYXRlcy5wdXNoKGFjdGlvbik7XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0X2FjdGl2ZTogdmFsdWUgPT4ge1xyXG5cdFx0XHRcdFx0XHRpZiAodmFsdWUpIGluc3RhbmNlLmVsZW1lbnQucmVtb3ZlQ2xhc3MoJ2luYWN0aXZlJyk7XHJcblx0XHRcdFx0XHRcdGVsc2UgaW5zdGFuY2UuZWxlbWVudC5hZGRDbGFzcygnaW5hY3RpdmUnKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9O1xyXG5cdFx0XHRpbnN0YW5jZXMucHVzaChpbnN0YW5jZSk7XHJcblxyXG5cdFx0XHR2YXIgcmVzb2x2ZSA9IGFuZ3VsYXIuZXh0ZW5kKHt9LFxyXG5cdFx0XHRcdG9wdGlvbnMubG9jYWxzIHx8IHt9LCB7XHJcblx0XHRcdFx0XHRtb2RhbDogaW5zdGFuY2VcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0dmFyIHRlbXBsYXRlUHJvbWlzZSA9IGdldFRlbXBsYXRlUHJvbWlzZShvcHRpb25zLCByZXNvbHZlKTtcclxuXHJcblx0XHRcdHRlbXBsYXRlUHJvbWlzZS50aGVuKHRlbXBsYXRlID0+IHtcclxuXHRcdFx0XHQkZWxlbWVudC5maW5kKCcudWV4LW1vZGFsLWNvbnRlbnQnKS5odG1sKHRlbXBsYXRlKTtcclxuXHJcblx0XHRcdFx0JGNvbXBpbGUoJGVsZW1lbnQpKGFuZ3VsYXIuZXh0ZW5kKHNjb3BlLCB7XHJcblx0XHRcdFx0XHQkdGl0bGU6IG9wdGlvbnMudGl0bGUgfHwgJ01vZGFsJyxcclxuXHRcdFx0XHRcdCRtb2RhbDogaW5zdGFuY2UsXHJcblx0XHRcdFx0XHQkcmVzb2x2ZTogcmVzb2x2ZSxcclxuXHRcdFx0XHRcdF90cnlEaXNtaXNzOiBldmVudCA9PiB7XHJcblx0XHRcdFx0XHRcdGlmIChzY29wZS4kbW9kYWwuY2FuQmVEaXNtaXNzZWRGcm9tQkQgJiYgJChldmVudC50YXJnZXQpLmlzKCcudWV4LW1vZGFsJykpIHtcclxuXHRcdFx0XHRcdFx0XHRzY29wZS4kbW9kYWwuZGlzbWlzcygpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSkpO1xyXG5cclxuXHRcdFx0XHRpZiAoaW5zdGFuY2VzLmxlbmd0aCAhPT0gMSkge1xyXG5cdFx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBpbnN0YW5jZXMubGVuZ3RoIC0gMTsgaSsrKSB7XHJcblx0XHRcdFx0XHRcdGluc3RhbmNlc1tpXS5fYWN0aXZlKGZhbHNlKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdCRib2R5LmFkZENsYXNzKCd1ZXgtbW9kYWwtYWN0aXZlJyk7XHJcblx0XHRcdFx0dmFyIGJkRW50ZXJpbmc7XHJcblx0XHRcdFx0aWYgKGluc3RhbmNlcy5sZW5ndGggPT09IDEpIHtcclxuXHRcdFx0XHRcdGJkRW50ZXJpbmcgPSAkYW5pbWF0ZS5lbnRlcigkYmQsICRib2R5LCAkYm9keS5jaGlsZHJlbigpLmxhc3QoKSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdChiZEVudGVyaW5nIHx8ICRxLndoZW4oKSkudGhlbigoKSA9PiB7XHJcblx0XHRcdFx0XHQkYW5pbWF0ZS5lbnRlcigkZWxlbWVudCwgJGJvZHksICRib2R5LmNoaWxkcmVuKCkubGFzdCgpKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSwgKCkgPT4ge1xyXG5cdFx0XHRcdGRlc3Ryb3lBbmRDbGVhbihpbnN0YW5jZSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRfaW5zdGFuY2U6IGluc3RhbmNlLFxyXG5cdFx0XHRcdHByb21pc2U6IGRlZmVycmVkLnByb21pc2UsXHJcblx0XHRcdFx0c2NvcGU6IGluc3RhbmNlLnNjb3BlLFxyXG5cdFx0XHRcdGVsZW1lbnQ6IGluc3RhbmNlLiRlbGVtZW50LFxyXG5cdFx0XHRcdGRpc21pc3M6IGluc3RhbmNlLmRpc21pc3NcclxuXHRcdFx0fTtcclxuXHRcdH07XHJcblxyXG5cdFx0ZnVuYy5jb25maXJtID0gKCkgPT4ge1xyXG5cdFx0XHR2YXIgb3B0aW9ucyA9IHtcclxuXHRcdFx0XHR0aXRsZTogJ0NvbmZpcm0nLFxyXG5cdFx0XHRcdHRlbXBsYXRlOiAnQXJlIHlvdSBzdXJlPycsXHJcblx0XHRcdFx0ZGFuZ2VyOiBmYWxzZSxcclxuXHRcdFx0XHR5ZXNUZXh0OiAnWWVzJyxcclxuXHRcdFx0XHRub1RleHQ6ICdDYW5jZWwnLFxyXG5cdFx0XHRcdGluZm86IGZhbHNlXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHR2YXIgcmV0ID0ge1xyXG5cdFx0XHRcdG9wZW46IHBhcmVudFNjb3BlID0+IHtcclxuXHRcdFx0XHRcdHZhciBzY29wZSA9IChwYXJlbnRTY29wZSB8fCAkcm9vdFNjb3BlKS4kbmV3KCksXHJcblx0XHRcdFx0XHRcdGluc3RhbmNlID0gZnVuYyh7XHJcblx0XHRcdFx0XHRcdFx0dGl0bGU6IG9wdGlvbnMudGl0bGUsXHJcblx0XHRcdFx0XHRcdFx0c2NvcGU6IGFuZ3VsYXIuZXh0ZW5kKHNjb3BlLCB7XHJcblx0XHRcdFx0XHRcdFx0XHRkYW5nZXI6IG9wdGlvbnMuZGFuZ2VyLFxyXG5cdFx0XHRcdFx0XHRcdFx0eWVzVGV4dDogb3B0aW9ucy55ZXNUZXh0LFxyXG5cdFx0XHRcdFx0XHRcdFx0bm9UZXh0OiBvcHRpb25zLm5vVGV4dCxcclxuXHRcdFx0XHRcdFx0XHRcdGluZm86IG9wdGlvbnMuaW5mbyxcclxuXHRcdFx0XHRcdFx0XHRcdHJlc29sdmU6IHYgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRpbnN0YW5jZS5faW5zdGFuY2UucmVzb2x2ZSh2KTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9KSxcclxuXHRcdFx0XHRcdFx0XHR0ZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJ1ZXgtbW9kYWwtdC1jb25maXJtXCI+XFxcclxuXHQ8ZGl2IGNsYXNzPVwidWV4LW1vZGFsLXQtY29uZmlybS1jb250ZW50XCI+JyArIG9wdGlvbnMudGVtcGxhdGUgKyAnXFxcclxuXHQ8L2Rpdj5cXFxyXG5cdDxkaXYgY2xhc3M9XCJ1ZXgtbW9kYWwtdC1jb25maXJtLWFjdGlvbnNcIj5cXFxyXG5cdFx0PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJidG4gYnRuLWRlZmF1bHQgbm8tYnRuXCIgbmctY2xpY2s9XCIkbW9kYWwuZGlzbWlzcygpXCIgbmctaWY9XCI6OiFpbmZvXCI+e3s6Om5vVGV4dH19PC9idXR0b24+XFxcclxuXHRcdDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiYnRuIHllcy1idG5cIiBuZy1jbGljaz1cInJlc29sdmUoKVwiIG5nLWNsYXNzPVwie2RhbmdlcjogZGFuZ2VyLCBcXCdidG4tZGFuZ2VyXFwnOiBkYW5nZXIsIFxcJ2J0bi1wcmltYXJ5XFwnOiAhZGFuZ2VyfVwiPnt7Ojp5ZXNUZXh0fX08L2J1dHRvbj5cXFxyXG5cdDwvZGl2PlxcXHJcbjwvZGl2PidcclxuXHRcdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0aW5zdGFuY2UucHJvbWlzZS50aGVuKG51bGwsICgpID0+IHtcclxuXHRcdFx0XHRcdFx0c2NvcGUuJGRlc3Ryb3koKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRcdHJldHVybiBpbnN0YW5jZS5wcm9taXNlO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0dGl0bGU6IHYgPT4ge1xyXG5cdFx0XHRcdFx0b3B0aW9ucy50aXRsZSA9IHY7XHJcblx0XHRcdFx0XHRyZXR1cm4gcmV0O1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0ZGFuZ2VyOiAoKSA9PiB7XHJcblx0XHRcdFx0XHRvcHRpb25zLmRhbmdlciA9IHRydWU7XHJcblx0XHRcdFx0XHRyZXR1cm4gcmV0O1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0eWVzOiB2ID0+IHtcclxuXHRcdFx0XHRcdG9wdGlvbnMueWVzVGV4dCA9IHY7XHJcblx0XHRcdFx0XHRyZXR1cm4gcmV0O1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0bm86IHYgPT4ge1xyXG5cdFx0XHRcdFx0b3B0aW9ucy5ub1RleHQgPSB2O1xyXG5cdFx0XHRcdFx0cmV0dXJuIHJldDtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHRleHQ6IHYgPT4ge1xyXG5cdFx0XHRcdFx0b3B0aW9ucy50ZW1wbGF0ZSA9IHY7XHJcblx0XHRcdFx0XHRyZXR1cm4gcmV0O1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0dGVtcGxhdGU6IHYgPT4ge1xyXG5cdFx0XHRcdFx0b3B0aW9ucy50ZW1wbGF0ZSA9IHY7XHJcblx0XHRcdFx0XHRyZXR1cm4gcmV0O1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0Y2xhc3NlczogdiA9PiB7XHJcblx0XHRcdFx0XHRvcHRpb25zLmNsYXNzZXMgPSB2O1xyXG5cdFx0XHRcdFx0cmV0dXJuIHJldDtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGluZm86ICgpID0+IHtcclxuXHRcdFx0XHRcdG9wdGlvbnMuaW5mbyA9IHRydWU7XHJcblx0XHRcdFx0XHRyZXR1cm4gcmV0O1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHJldHVybiByZXQ7XHJcblx0XHR9O1xyXG5cclxuXHRcdGZ1bmMuaW5mbyA9ICgpID0+IHtcclxuXHRcdFx0cmV0dXJuIGZ1bmMuY29uZmlybSgpLmluZm8oKS50aXRsZSgnSW5mbycpLnllcygnT0snKTtcclxuXHRcdH07XHJcblxyXG5cdFx0cmV0dXJuIGZ1bmM7XHJcblxyXG5cdFx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcblx0XHRmdW5jdGlvbiBkaXNtaXNzVG9wTW9kYWwoZSkge1xyXG5cdFx0XHRpZiAoaW5zdGFuY2VzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHR2YXIgdG9wID0gaW5zdGFuY2VzW2luc3RhbmNlcy5sZW5ndGggLSAxXTtcclxuXHRcdFx0dG9wLmRpc21pc3MoKTtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBnZXRDbGFzc2VzT3B0aW9uKG9wdGlvbnMpIHtcclxuXHRcdFx0cmV0dXJuIG9wdGlvbnMuY2xhc3NlcyB8fCBvcHRpb25zWydjbGFzcyddO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGdldFdyYXBwZXJDbGFzc2VzKG9wdGlvbnMpIHtcclxuXHRcdFx0dmFyIGNsYXNzZXMgPSBnZXRDbGFzc2VzT3B0aW9uKG9wdGlvbnMpO1xyXG5cdFx0XHRyZXR1cm4gY2xhc3NlcyA/ICcgJyArIGNsYXNzZXMgOiAnJztcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBnZXRUZW1wbGF0ZU1vZGFsQ29udGFpbmVyKG9wdGlvbnMpIHtcclxuXHRcdFx0cmV0dXJuICdcXFxyXG48ZGl2IGNsYXNzPVwidWV4LW1vZGFsJyArIGdldFdyYXBwZXJDbGFzc2VzKG9wdGlvbnMpICsgJ1wiIG5nLWNsaWNrPVwiX3RyeURpc21pc3MoJGV2ZW50KVwiPlxcXHJcblx0PGRpdiBjbGFzcz1cInVleC1tb2RhbC1jb250YWluZXJcIj5cXFxyXG5cdFx0PGRpdiBjbGFzcz1cInVleC1tb2RhbC1oZWFkZXJcIj5cXFxyXG5cdFx0XHQ8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cInVleC1tb2RhbC1jbG9zZVwiIG5nLWNsaWNrPVwiJG1vZGFsLmRpc21pc3MoKVwiPlxcXHJcblx0XHRcdFx0PHVleC1pY29uIGljb249XCJjbG9zZVwiPjwvdWV4LWljb24+XFxcclxuXHRcdFx0PC9idXR0b24+XFxcclxuXHRcdFx0PGgyPnt7JHRpdGxlfX08L2gyPlxcXHJcblx0XHQ8L2Rpdj5cXFxyXG5cdFx0PGRpdiBjbGFzcz1cInVleC1tb2RhbC1jb250ZW50XCI+PC9kaXY+XFxcclxuXHQ8L2Rpdj5cXFxyXG48L2Rpdj4nO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIHRlbXBsYXRlRm9yQ29tcG9uZW50KG5hbWUsIHJlc29sdmUpIHtcclxuXHRcdFx0dmFyIHQgPSAnPCcgKyBuYW1lO1xyXG5cdFx0XHRpZiAocmVzb2x2ZSkge1xyXG5cdFx0XHRcdGZvciAodmFyIHAgaW4gcmVzb2x2ZSkge1xyXG5cdFx0XHRcdFx0dmFyIHBOYW1lID0gdWV4VXRpbC5jYW1lbFRvRGFzaChwKTtcclxuXHRcdFx0XHRcdHQgKz0gJyAnICsgcE5hbWUgKyAnPVwiOjokcmVzb2x2ZS4nICsgcCArICdcIic7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdHQgKz0gJz48LycgKyBuYW1lICsgJz4nO1xyXG5cdFx0XHRyZXR1cm4gdDtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBnZXRUZW1wbGF0ZVByb21pc2Uob3B0aW9ucywgcmVzb2x2ZSkge1xyXG5cdFx0XHRpZiAob3B0aW9ucy5jb21wb25lbnQpIHtcclxuXHRcdFx0XHR2YXIgY29tcG9uZW50TmFtZSA9IHVleFV0aWwuY2FtZWxUb0Rhc2gob3B0aW9ucy5jb21wb25lbnQpO1xyXG5cdFx0XHRcdHJldHVybiAkcS53aGVuKHRlbXBsYXRlRm9yQ29tcG9uZW50KFxyXG5cdFx0XHRcdFx0Y29tcG9uZW50TmFtZSxcclxuXHRcdFx0XHRcdHJlc29sdmUpKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIG9wdGlvbnMudGVtcGxhdGUgPyAkcS53aGVuKG9wdGlvbnMudGVtcGxhdGUudHJpbSgpKSA6XHJcblx0XHRcdFx0JHRlbXBsYXRlUmVxdWVzdChhbmd1bGFyLmlzRnVuY3Rpb24ob3B0aW9ucy50ZW1wbGF0ZVVybCkgP1xyXG5cdFx0XHRcdFx0b3B0aW9ucy50ZW1wbGF0ZVVybCgpIDogb3B0aW9ucy50ZW1wbGF0ZVVybCk7XHJcblx0XHR9XHJcblx0fVxyXG59KSgpO1xyXG4iLCIoZnVuY3Rpb24gKCkge1xyXG5cdFwidXNlIHN0cmljdFwiO1xyXG5cclxuXHRhbmd1bGFyXHJcblx0XHQubW9kdWxlKCdtci51ZXgnKVxyXG5cdFx0LmRpcmVjdGl2ZSgndWV4TW9kYWwnLCBtb2RhbClcclxuXHRcdC5kaXJlY3RpdmUoJ3VleE1vZGFsQ29uZmlybScsIG1vZGFsQ29uZmlybSk7XHJcblxyXG5cdGZ1bmN0aW9uIG1vZGFsKHVleE1vZGFsKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRyZXN0cmljdDogJ0UnLFxyXG5cdFx0XHRzY29wZTogdHJ1ZSxcclxuXHRcdFx0dGVtcGxhdGU6ICgkZWxlbWVudCwgJGF0dHJzKSA9PiB7XHJcblx0XHRcdFx0JGF0dHJzLiRodG1sID0gJGVsZW1lbnQuaHRtbCgpO1xyXG5cdFx0XHRcdCRlbGVtZW50LmVtcHR5KCk7XHJcblx0XHRcdH0sXHJcblx0XHRcdGJpbmRUb0NvbnRyb2xsZXI6IHtcclxuXHRcdFx0XHRkZWxlZ2F0ZTogJz0nXHJcblx0XHRcdH0sXHJcblx0XHRcdGNvbnRyb2xsZXJBczogJyR1ZXhNb2RhbEN0cmwnLFxyXG5cdFx0XHRjb250cm9sbGVyOiBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzKSB7XHJcblx0XHRcdFx0dmFyIHRpdGxlID0gJGF0dHJzLnRpdGxlLFxyXG5cdFx0XHRcdFx0Y2xhc3NlcyA9ICRhdHRyc1snY2xhc3MnXSxcclxuXHRcdFx0XHRcdHRlbXBsYXRlID0gJGF0dHJzLiRodG1sO1xyXG5cclxuXHRcdFx0XHR0aGlzLmRlbGVnYXRlID0ge1xyXG5cdFx0XHRcdFx0b3Blbjogb3B0aW9ucyA9PiB7XHJcblx0XHRcdFx0XHRcdHJldHVybiB1ZXhNb2RhbChhbmd1bGFyLmV4dGVuZCh7XHJcblx0XHRcdFx0XHRcdFx0c2NvcGU6ICRzY29wZSxcclxuXHRcdFx0XHRcdFx0XHR0aXRsZTogdGl0bGUsXHJcblx0XHRcdFx0XHRcdFx0Y2xhc3NlczogY2xhc3NlcyxcclxuXHRcdFx0XHRcdFx0XHR0ZW1wbGF0ZTogdGVtcGxhdGVcclxuXHRcdFx0XHRcdFx0fSwgb3B0aW9ucykpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBtb2RhbENvbmZpcm0odWV4TW9kYWwpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHJlc3RyaWN0OiAnRScsXHJcblx0XHRcdHNjb3BlOiB0cnVlLFxyXG5cdFx0XHR0ZW1wbGF0ZTogKCRlbGVtZW50LCAkYXR0cnMpID0+IHtcclxuXHRcdFx0XHQkYXR0cnMuJGh0bWwgPSAkZWxlbWVudC5odG1sKCk7XHJcblx0XHRcdFx0JGVsZW1lbnQuZW1wdHkoKTtcclxuXHRcdFx0fSxcclxuXHRcdFx0YmluZFRvQ29udHJvbGxlcjoge1xyXG5cdFx0XHRcdGRlbGVnYXRlOiAnPSdcclxuXHRcdFx0fSxcclxuXHRcdFx0Y29udHJvbGxlckFzOiAnJHVleE1vZGFsQ29uZmlybUN0cmwnLFxyXG5cdFx0XHRjb250cm9sbGVyOiBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzKSB7XHJcblx0XHRcdFx0dmFyIHRpdGxlID0gJGF0dHJzLnRpdGxlLFxyXG5cdFx0XHRcdFx0Y2xhc3NlcyA9ICRhdHRyc1snY2xhc3MnXSxcclxuXHRcdFx0XHRcdHRlbXBsYXRlID0gJGF0dHJzLiRodG1sO1xyXG5cclxuXHRcdFx0XHR0aGlzLmRlbGVnYXRlID0ge1xyXG5cdFx0XHRcdFx0b3BlbjogKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gdWV4TW9kYWwuY29uZmlybSgpXHJcblx0XHRcdFx0XHRcdFx0LmNsYXNzZXMoY2xhc3NlcylcclxuXHRcdFx0XHRcdFx0XHQudGl0bGUodGl0bGUpXHJcblx0XHRcdFx0XHRcdFx0LnRlbXBsYXRlKHRlbXBsYXRlKVxyXG5cdFx0XHRcdFx0XHRcdC5vcGVuKCRzY29wZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcbn0pKCk7XHJcbiIsIihmdW5jdGlvbiAoKSB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cclxuXHRhbmd1bGFyXHJcblx0XHQubW9kdWxlKCdtci51ZXgnKVxyXG5cdFx0LnByb3ZpZGVyKCd1ZXhQJywgdWV4UFByb3ZpZGVyKVxyXG5cdFx0LmRpcmVjdGl2ZSgndWV4UCcsIHVleFApXHJcblx0XHQuZGlyZWN0aXZlKCd1ZXhQU3JjJywgdWV4UFNyYylcclxuXHRcdC5kaXJlY3RpdmUoJ3VleFBSdW5uaW5nJywgdWV4UFJ1bm5pbmcpXHJcblx0XHQuZGlyZWN0aXZlKCd1ZXhQU3VjY2VzcycsIHVleFBTdWNjZXNzKVxyXG5cdFx0LmRpcmVjdGl2ZSgndWV4UEVycm9yJywgdWV4UEVycm9yKVxyXG5cdFx0LmRpcmVjdGl2ZSgndWV4UFN0YXR1cycsIHVleFBTdGF0dXMpXHJcblx0XHQuZGlyZWN0aXZlKCd1ZXhQQnRuJywgdWV4UEJ0bik7XHJcblxyXG5cdGZ1bmN0aW9uIHVleFBQcm92aWRlcigpIHtcclxuXHRcdHRoaXMub3B0cyA9IHtcclxuXHRcdFx0c3VjY2Vzc0ludGVydmFsOiAxMDAwLFxyXG5cdFx0XHRlcnJvckludGVydmFsOiAxMDAwXHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuJGdldCA9ICgpID0+IHRoaXMub3B0cztcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHVleFAoJHBhcnNlLCB1ZXhQKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRyZXN0cmljdDogJ0EnLFxyXG5cdFx0XHRzY29wZTogdHJ1ZSxcclxuXHRcdFx0Y29udHJvbGxlcjogY29udHJvbGxlcixcclxuXHRcdFx0Y29udHJvbGxlckFzOiAnJHVleFAnXHJcblx0XHR9O1xyXG5cclxuXHRcdGZ1bmN0aW9uIGNvbnRyb2xsZXIoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzLCAkdGltZW91dCwgJHEpIHtcclxuXHRcdFx0dmFyIHByb21pc2UsXHJcblx0XHRcdFx0Zm4gPSAkcGFyc2UoJGF0dHJzLnVleFApLFxyXG5cdFx0XHRcdG9wdGlvbnMgPSAkc2NvcGUuJGV2YWwoJGF0dHJzLnVleFBPcHRzKSB8fCB7fSxcclxuXHRcdFx0XHQkJHByb21pc2VzID0ge307XHJcblxyXG5cdFx0XHR0aGlzLnJ1bm5pbmcgPSBmYWxzZTtcclxuXHRcdFx0dGhpcy5zdWNjZXNzID0gZmFsc2U7XHJcblx0XHRcdHRoaXMuZXJyb3IgPSBmYWxzZTtcclxuXHJcblx0XHRcdGlmICgkZWxlbWVudC5pcygnZm9ybScpICYmICRhdHRycy51ZXhQU3JjID09PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0XHQkZWxlbWVudC5vbignc3VibWl0JywgZSA9PiB7XHJcblx0XHRcdFx0XHQkc2NvcGUuJGFwcGx5KHRoaXMucnVuKGUpKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0ZnVuY3Rpb24gZ2V0TG9jYWxzKGFyZ3MpIHtcclxuXHRcdFx0XHRpZiAoIWFyZ3MgfHwgYXJncy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0JGV2ZW50OiBhcmdzWzBdXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dmFyIGludGVycG9sYXRlID0gKG5hbWUsIGludGVydmFsKSA9PiB7XHJcblx0XHRcdFx0dGhpc1tuYW1lXSA9IHRydWU7XHJcblx0XHRcdFx0dmFyIHAgPSAkJHByb21pc2VzW25hbWVdID0gJHRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKCQkcHJvbWlzZXNbbmFtZV0gPT09IHApIHtcclxuXHRcdFx0XHRcdFx0dGhpc1tuYW1lXSA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0sIGludGVydmFsKTtcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHRoaXMucnVuID0gZSA9PiB7XHJcblx0XHRcdFx0aWYgKGUuaXNEZWZhdWx0UHJldmVudGVkKCkpIHtcclxuXHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0XHR2YXIgcCA9IGZuKCRzY29wZSwgZ2V0TG9jYWxzKGFyZ3VtZW50cykpO1xyXG5cdFx0XHRcdGlmIChwICYmIHAuZmluYWxseSkge1xyXG5cdFx0XHRcdFx0cHJvbWlzZSA9IHA7XHJcblx0XHRcdFx0XHR0aGlzLnJ1bm5pbmcgPSB0cnVlO1xyXG5cdFx0XHRcdFx0cHJvbWlzZS50aGVuKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0aW50ZXJwb2xhdGUoJ3N1Y2Nlc3MnLCBvcHRpb25zLnN1Y2Nlc3NJbnRlcnZhbCB8fCB1ZXhQLnN1Y2Nlc3NJbnRlcnZhbCk7XHJcblx0XHRcdFx0XHR9LCAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdGludGVycG9sYXRlKCdlcnJvcicsIG9wdGlvbnMuZXJyb3JJbnRlcnZhbCB8fCB1ZXhQLmVycm9ySW50ZXJ2YWwpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRwcm9taXNlLmZpbmFsbHkoKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRpZiAocCAhPT0gcHJvbWlzZSkgcmV0dXJuO1xyXG5cdFx0XHRcdFx0XHR0aGlzLnJ1bm5pbmcgPSBmYWxzZTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHVleFBTcmMoKSB7XHJcblx0XHRmdW5jdGlvbiBkZXRlcm1pbmVFdmVudCgkZWxlbWVudCwgdmFsdWUpIHtcclxuXHRcdFx0aWYgKHZhbHVlICYmIGFuZ3VsYXIuaXNTdHJpbmcodmFsdWUpKSByZXR1cm4gdmFsdWU7XHJcblx0XHRcdGlmICgkZWxlbWVudC5pcygnZm9ybScpKSByZXR1cm4gJ3N1Ym1pdCc7XHJcblx0XHRcdHJldHVybiAnY2xpY2snO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHJlc3RyaWN0OiAnQScsXHJcblx0XHRcdHJlcXVpcmU6ICdedWV4UCcsXHJcblx0XHRcdHNjb3BlOiBmYWxzZSxcclxuXHRcdFx0bGluazogZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQsICRhdHRycywgY3RybCkge1xyXG5cdFx0XHRcdHZhciBldmVudCA9IGRldGVybWluZUV2ZW50KCRlbGVtZW50LCAkYXR0cnMudWV4UFNyYyk7XHJcblx0XHRcdFx0JGVsZW1lbnQub24oZXZlbnQsIGUgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKCRlbGVtZW50LmF0dHIoJ2Rpc2FibGVkJykpIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdCRzY29wZS4kYXBwbHkoY3RybC5ydW4oZSkpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gdWV4UENvbW1vbihraW5kKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRyZXN0cmljdDogJ0EnLFxyXG5cdFx0XHRyZXF1aXJlOiAnXnVleFAnLFxyXG5cdFx0XHRzY29wZToge30sXHJcblx0XHRcdHRyYW5zY2x1ZGU6IHRydWUsXHJcblx0XHRcdHRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cInVleC1wLScgKyBraW5kICsgJ1wiIG5nLXNob3c9XCJzaG93blwiIG5nLXRyYW5zY2x1ZGU+PC9kaXY+JyxcclxuXHRcdFx0bGluazogZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQsICRhdHRycywgY3RybCkge1xyXG5cdFx0XHRcdCRlbGVtZW50LmFkZENsYXNzKCd1ZXgtcC0nICsga2luZCk7XHJcblx0XHRcdFx0JHNjb3BlLiR3YXRjaCgoKSA9PiBjdHJsW2tpbmRdLCAobiwgbykgPT4ge1xyXG5cdFx0XHRcdFx0JHNjb3BlLnNob3duID0gISFuO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gdWV4UFJ1bm5pbmcoKSB7XHJcblx0XHRyZXR1cm4gdWV4UENvbW1vbigncnVubmluZycpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gdWV4UFN1Y2Nlc3MoKSB7XHJcblx0XHRyZXR1cm4gdWV4UENvbW1vbignc3VjY2VzcycpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gdWV4UEVycm9yKCkge1xyXG5cdFx0cmV0dXJuIHVleFBDb21tb24oJ2Vycm9yJyk7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiB1ZXhQU3RhdHVzKCkge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0cmVzdHJpY3Q6ICdFQScsXHJcblx0XHRcdHNjb3BlOiB7fSxcclxuXHRcdFx0dGVtcGxhdGU6ICc8c3BhbiBuZy1zaG93PVwic3VjY2VzcyB8fCBlcnJvclwiIGNsYXNzPVwidWV4LXAtc3RhdHVzXCIgbmctY2xhc3M9XCJjbGFzc2VzXCI+e3t0ZXh0fX08L3NwYW4+JyxcclxuXHRcdFx0cmVxdWlyZTogJ151ZXhQJyxcclxuXHRcdFx0bGluazogZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQsICRhdHRycywgY3RybCkge1xyXG5cdFx0XHRcdHZhciBzdWNjZXNzVGV4dCA9ICRhdHRycy5zdWNjZXNzIHx8ICdTdWNjZXNzJyxcclxuXHRcdFx0XHRcdGVycm9yVGV4dCA9ICRhdHRycy5lcnJvciB8fCAnRXJyb3InO1xyXG5cdFx0XHRcdCRzY29wZS5jbGFzc2VzID0gJyc7XHJcblxyXG5cdFx0XHRcdCRzY29wZS4kd2F0Y2goKCkgPT4gY3RybC5zdWNjZXNzLCAobiwgbykgPT4ge1xyXG5cdFx0XHRcdFx0JHNjb3BlLnN1Y2Nlc3MgPSBuO1xyXG5cdFx0XHRcdFx0aWYgKG4pIHtcclxuXHRcdFx0XHRcdFx0JHNjb3BlLmNsYXNzZXMgPSAndWV4LXAtc3VjY2Vzcyc7XHJcblx0XHRcdFx0XHRcdCRzY29wZS50ZXh0ID0gc3VjY2Vzc1RleHQ7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdCRzY29wZS4kd2F0Y2goKCkgPT4gY3RybC5lcnJvciwgKG4sIG8pID0+IHtcclxuXHRcdFx0XHRcdCRzY29wZS5lcnJvciA9IG47XHJcblx0XHRcdFx0XHRpZiAobikge1xyXG5cdFx0XHRcdFx0XHQkc2NvcGUuY2xhc3NlcyA9ICd1ZXgtcC1lcnJvcic7XHJcblx0XHRcdFx0XHRcdCRzY29wZS50ZXh0ID0gZXJyb3JUZXh0O1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gdWV4UEJ0bigpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHJlc3RyaWN0OiAnQScsXHJcblx0XHRcdHJlcXVpcmU6ICdedWV4UCcsXHJcblx0XHRcdGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMsIGN0cmwpIHtcclxuXHRcdFx0XHR2YXIgaXNPbmVUaW1lID0gJGF0dHJzLnVleFBCdG4gPT09ICdvbmV0aW1lJztcclxuXHRcdFx0XHQkc2NvcGUuJHdhdGNoKCgpID0+IGN0cmwucnVubmluZywgKG4sIG8pID0+IHtcclxuXHRcdFx0XHRcdGlmIChuKSB7XHJcblx0XHRcdFx0XHRcdCRlbGVtZW50LmF0dHIoJ2Rpc2FibGVkJywgJ2Rpc2FibGVkJyk7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRpZiAoY3RybC5lcnJvciB8fCAhaXNPbmVUaW1lKSB7XHJcblx0XHRcdFx0XHRcdFx0JGVsZW1lbnQucmVtb3ZlQXR0cignZGlzYWJsZWQnKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxufSkoKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdGFuZ3VsYXJcclxuXHRcdC5tb2R1bGUoJ21yLnVleCcpXHJcblx0XHQuZmFjdG9yeSgndWV4UG9wJywgcG9wKTtcclxuXHJcblx0ZnVuY3Rpb24gcG9wKCRyb290U2NvcGUsICRjb21waWxlLCAkYW5pbWF0ZSwgJHRlbXBsYXRlUmVxdWVzdCwgJHEsIHVleFBvc2l0aW9uaW5nVGhyb3R0bGVyLCB1ZXhQb3NpdGlvbmVyLCAkdGltZW91dCkge1xyXG5cdFx0dmFyIF9pbnN0YW5jZSxcclxuXHRcdFx0JGJvZHkgPSAkKGRvY3VtZW50LmJvZHkpO1xyXG5cclxuXHRcdCRib2R5Lm9uKCdrZXlkb3duJywgZSA9PiB7XHJcblx0XHRcdGlmICghZS5pc0RlZmF1bHRQcmV2ZW50ZWQoKSAmJiBlLndoaWNoID09PSAyNykge1xyXG5cdFx0XHRcdGRpc21pc3MoZSk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdHVleFBvc2l0aW9uaW5nVGhyb3R0bGVyLnN1YnNjcmliZShjb250ZXh0ID0+IHtcclxuXHRcdFx0aWYgKF9pbnN0YW5jZSkgX2luc3RhbmNlLnBvc2l0aW9uKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBvcHRpb25zOlxyXG5cdFx0Ly8gICBzY29wZVxyXG5cdFx0Ly8gICBwbGFjZW1lbnQ6IFt0b3AsIHJpZ2h0LCBib3R0b20sIGxlZnRdIFtzdGFydCwgY2VudGVyLCBlbmRdXHJcblx0XHQvLyAgIG9mZnNldFxyXG5cdFx0Ly8gICB0YXJnZXRcclxuXHRcdC8vICAgdGVtcGxhdGUgLSB0ZW1wbGF0ZVVybFxyXG5cdFx0Ly8gICBsYXp5XHJcblx0XHQvLyAgIGNsYXNzZXNcclxuXHRcdC8vICAgbG9jYWxzXHJcblx0XHQvLyAgIG9uUG9zaXRpb25cclxuXHRcdC8vXHJcblx0XHR2YXIgZnVuYyA9IG9wdGlvbnMgPT4ge1xyXG5cdFx0XHR2YWxpZGF0ZShvcHRpb25zKTtcclxuXHJcblx0XHRcdHZhciAkZWxlbWVudCA9ICQoZ2V0VGVtcGxhdGVQb3Aob3B0aW9ucykpLFxyXG5cdFx0XHRcdGxpbmtmbjtcclxuXHJcblx0XHRcdHZhciBjcmVhdGVTY29wZSA9ICgpID0+IHtcclxuXHRcdFx0XHRyZXR1cm4gKG9wdGlvbnMuc2NvcGUgfHwgJHJvb3RTY29wZSkuJG5ldygpO1xyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0dmFyIGluc3RhbmNlID0ge1xyXG5cdFx0XHRcdF9kZWxlZ2F0ZXM6IFtdLFxyXG5cdFx0XHRcdHRhcmdldDogYW5ndWxhci5lbGVtZW50KG9wdGlvbnMudGFyZ2V0KSxcclxuXHRcdFx0XHRvcGVuOiAoKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAoX2luc3RhbmNlICYmIF9pbnN0YW5jZSAhPT0gaW5zdGFuY2UpIHtcclxuXHRcdFx0XHRcdFx0X2luc3RhbmNlLmRpc21pc3MoKTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRfaW5zdGFuY2UgPSBpbnN0YW5jZTtcclxuXHJcblx0XHRcdFx0XHR2YXIgdGVtcGxhdGVQcm9taXNlO1xyXG5cdFx0XHRcdFx0aWYgKCFsaW5rZm4pIHtcclxuXHRcdFx0XHRcdFx0dGVtcGxhdGVQcm9taXNlID0gZ2V0VGVtcGxhdGVQcm9taXNlKG9wdGlvbnMpLnRoZW4odGVtcGxhdGUgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdCRlbGVtZW50LmZpbmQoJy51ZXgtcG9wLWNvbnRlbnQnKS5odG1sKHRlbXBsYXRlKTtcclxuXHRcdFx0XHRcdFx0XHRsaW5rZm4gPSAkY29tcGlsZSgkZWxlbWVudCk7XHJcblx0XHRcdFx0XHRcdH0sICgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRkZXN0cm95QW5kQ2xlYW4oaW5zdGFuY2UpO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdHRlbXBsYXRlUHJvbWlzZSA9ICRxLndoZW4oKTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRyZXR1cm4gdGVtcGxhdGVQcm9taXNlLnRoZW4oKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHR2YXIgc2NvcGUgPSBhbmd1bGFyLmV4dGVuZChjcmVhdGVTY29wZSgpLCB7XHJcblx0XHRcdFx0XHRcdFx0JHBvcDogaW5zdGFuY2UsXHJcblx0XHRcdFx0XHRcdH0sIG9wdGlvbnMubG9jYWxzIHx8IHt9KTtcclxuXHJcblx0XHRcdFx0XHRcdGxpbmtmbihzY29wZSwgKCRjbG9uZSwgc2NvcGUpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRpbnN0YW5jZS5zY29wZSA9IHNjb3BlO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRzY29wZS4kb24oJyRkZXN0cm95JywgKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0aW5zdGFuY2UuZGlzbWlzcygpO1xyXG5cdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHRcdGluc3RhbmNlLmVsZW1lbnQgPSBpbnN0YW5jZS5wb3AgPSAkY2xvbmU7XHJcblxyXG5cdFx0XHRcdFx0XHRcdGluc3RhbmNlLnRhcmdldC5hZGRDbGFzcygndWV4LXBvcC1vcGVuJyk7XHJcblx0XHRcdFx0XHRcdFx0JGJvZHkuYWRkQ2xhc3MoJ3VleC1wb3AtYWN0aXZlJyk7XHJcblx0XHRcdFx0XHRcdFx0JGFuaW1hdGUuZW50ZXIoJGNsb25lLCAkYm9keSwgJGJvZHkuY2hpbGRyZW4oKS5sYXN0KCkpO1xyXG5cdFx0XHRcdFx0XHRcdHNjb3BlLiRldmFsQXN5bmMoKCkgPT4gaW5zdGFuY2UucG9zaXRpb24oKSk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRkaXNtaXNzOiAoKSA9PiB7XHJcblx0XHRcdFx0XHQkYW5pbWF0ZS5sZWF2ZShpbnN0YW5jZS5lbGVtZW50KS50aGVuKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0aW5zdGFuY2UudGFyZ2V0LnJlbW92ZUNsYXNzKCd1ZXgtcG9wLW9wZW4nKTtcclxuXHRcdFx0XHRcdFx0JGJvZHkucmVtb3ZlQ2xhc3MoJ3VleC1wb3AtYWN0aXZlJyk7XHJcblx0XHRcdFx0XHRcdGRlc3Ryb3lBbmRDbGVhbihpbnN0YW5jZSk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHBvc2l0aW9uOiBzdHViID0+IHtcclxuXHRcdFx0XHRcdHZhciB0YXJnZXQgPSBpbnN0YW5jZS50YXJnZXQsXHJcblx0XHRcdFx0XHRcdHBvcCA9IGluc3RhbmNlLnBvcDtcclxuXHJcblx0XHRcdFx0XHR2YXIgbyA9IGFuZ3VsYXIuZXh0ZW5kKG9wdGlvbnMsIHtcclxuXHRcdFx0XHRcdFx0dGFyZ2V0OiB0YXJnZXQsXHJcblx0XHRcdFx0XHRcdGVsZW1lbnQ6IHBvcCxcclxuXHRcdFx0XHRcdFx0bWFyZ2luOiA1XHJcblx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHRpZiAoc3R1Yikge1xyXG5cdFx0XHRcdFx0XHRvLnN0dWIgPSB0cnVlO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0dmFyIGNvbnRleHQgPSB1ZXhQb3NpdGlvbmVyKG8pO1xyXG5cdFx0XHRcdFx0aWYgKG9wdGlvbnMub25Qb3NpdGlvbikge1xyXG5cdFx0XHRcdFx0XHRvcHRpb25zLm9uUG9zaXRpb24oY29udGV4dCk7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0dWV4UG9zaXRpb25lci5hcHBseShjb250ZXh0KTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uRGlzbWlzczogYWN0aW9uID0+IHtcclxuXHRcdFx0XHRcdGluc3RhbmNlLl9kZWxlZ2F0ZXMucHVzaChhY3Rpb24pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGlmICghb3B0aW9ucy5sYXp5KSB7XHJcblx0XHRcdFx0aW5zdGFuY2Uub3BlbigpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gaW5zdGFuY2U7XHJcblx0XHR9O1xyXG5cclxuXHRcdHJldHVybiBmdW5jO1xyXG5cclxuXHRcdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG5cdFx0ZnVuY3Rpb24gdmFsaWRhdGUob3B0aW9ucykge1xyXG5cdFx0XHRpZiAoIW9wdGlvbnMudGVtcGxhdGUgJiYgIW9wdGlvbnMudGVtcGxhdGVVcmwpIHtcclxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ3RlbXBsYXRlIG9yIHRlbXBsYXRlVXJsIG11c3QgYmUgcHJvdmlkZWQuJyk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBkaXNtaXNzKGUpIHtcclxuXHRcdFx0aWYgKF9pbnN0YW5jZSkge1xyXG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0XHRfaW5zdGFuY2UuZGlzbWlzcygpO1xyXG5cdFx0XHRcdCRyb290U2NvcGUuJGFwcGx5QXN5bmMoKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGRlc3Ryb3lBbmRDbGVhbihpbnN0YW5jZSkge1xyXG5cdFx0XHRpbnN0YW5jZS5zY29wZS4kZGVzdHJveSgpO1xyXG5cdFx0XHR2YXIgZGVsZWdhdGVzID0gaW5zdGFuY2UuX2RlbGVnYXRlcztcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBkZWxlZ2F0ZXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRkZWxlZ2F0ZXNbaV0oKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKGluc3RhbmNlID09PSBfaW5zdGFuY2UpIF9pbnN0YW5jZSA9IG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2V0Q2xhc3Nlc09wdGlvbihvcHRpb25zKSB7XHJcblx0XHRcdHJldHVybiBvcHRpb25zLmNsYXNzZXMgfHwgb3B0aW9uc1snY2xhc3MnXTtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBnZXRXcmFwcGVyQ2xhc3NlcyhvcHRpb25zKSB7XHJcblx0XHRcdHZhciBjbGFzc2VzID0gZ2V0Q2xhc3Nlc09wdGlvbihvcHRpb25zKTtcclxuXHRcdFx0cmV0dXJuIGNsYXNzZXMgPyAnICcgKyBjbGFzc2VzIDogJyc7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2V0VGVtcGxhdGVQb3Aob3B0aW9ucykge1xyXG5cdFx0XHRyZXR1cm4gJ1xcXHJcbjxkaXYgY2xhc3M9XCJ1ZXgtcG9wJyArIGdldFdyYXBwZXJDbGFzc2VzKG9wdGlvbnMpICsgJ1wiPlxcXHJcblx0PGRpdiBjbGFzcz1cInVleC1wb3AtYmRcIiBuZy1jbGljaz1cIiRwb3AuZGlzbWlzcygpXCI+PC9kaXY+XFxcclxuXHQ8ZGl2IGNsYXNzPVwidWV4LXBvcC1jb250ZW50XCI+XFxcclxuXHQ8L2Rpdj5cXFxyXG48L2Rpdj4nO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGdldFRlbXBsYXRlUHJvbWlzZShvcHRpb25zKSB7XHJcblx0XHRcdHJldHVybiBvcHRpb25zLnRlbXBsYXRlID8gJHEud2hlbihvcHRpb25zLnRlbXBsYXRlKSA6XHJcblx0XHRcdFx0JHRlbXBsYXRlUmVxdWVzdChhbmd1bGFyLmlzRnVuY3Rpb24ob3B0aW9ucy50ZW1wbGF0ZVVybCkgP1xyXG5cdFx0XHRcdFx0b3B0aW9ucy50ZW1wbGF0ZVVybCgpIDogb3B0aW9ucy50ZW1wbGF0ZVVybCk7XHJcblx0XHR9XHJcblx0fVxyXG59KSgpO1xyXG4iLCIoZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0YW5ndWxhclxyXG5cdFx0Lm1vZHVsZSgnbXIudWV4JylcclxuXHRcdC5kaXJlY3RpdmUoJ3VleFBvcENvbnRhaW5lcicsIHBvcENvbnRhaW5lcilcclxuXHRcdC5kaXJlY3RpdmUoJ3VleFBvcFRhcmdldCcsIHBvcFRhcmdldClcclxuXHRcdC5kaXJlY3RpdmUoJ3VleFBvcCcsIHBvcCk7XHJcblxyXG5cdGZ1bmN0aW9uIHBvcENvbnRhaW5lcigpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHJlc3RyaWN0OiAnQScsXHJcblx0XHRcdHNjb3BlOiBmYWxzZSxcclxuXHRcdFx0Y29udHJvbGxlcjogZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdHZhciBfdGFyZ2V0RWxlbWVudDtcclxuXHJcblx0XHRcdFx0dGhpcy5yZWdpc3RlclRhcmdldCA9IHRhcmdldEVsZW1lbnQgPT4ge1xyXG5cdFx0XHRcdFx0X3RhcmdldEVsZW1lbnQgPSB0YXJnZXRFbGVtZW50O1xyXG5cdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdHRoaXMuZ2V0VGFyZ2V0ID0gKCkgPT4gX3RhcmdldEVsZW1lbnQ7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBwb3BUYXJnZXQoKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRyZXN0cmljdDogJ0EnLFxyXG5cdFx0XHRzY29wZTogZmFsc2UsXHJcblx0XHRcdHJlcXVpcmU6IHtcclxuXHRcdFx0XHRwb3BDb250YWluZXI6ICdedWV4UG9wQ29udGFpbmVyJ1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRiaW5kVG9Db250cm9sbGVyOiB0cnVlLFxyXG5cdFx0XHRjb250cm9sbGVyQXM6ICckdWV4UG9wVGFyZ2V0Q3RybCcsXHJcblx0XHRcdGNvbnRyb2xsZXI6IGZ1bmN0aW9uICgkZWxlbWVudCkge1xyXG5cdFx0XHRcdHRoaXMuJG9uSW5pdCA9ICgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMucG9wQ29udGFpbmVyLnJlZ2lzdGVyVGFyZ2V0KCRlbGVtZW50KTtcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gcG9wKHVleFBvcCkge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0cmVzdHJpY3Q6ICdFJyxcclxuXHRcdFx0dGVybWluYWw6IHRydWUsXHJcblx0XHRcdHNjb3BlOiB0cnVlLFxyXG5cdFx0XHRyZXF1aXJlOiB7XHJcblx0XHRcdFx0cG9wQ29udGFpbmVyOiAnXnVleFBvcENvbnRhaW5lcidcclxuXHRcdFx0fSxcclxuXHRcdFx0YmluZFRvQ29udHJvbGxlcjoge1xyXG5cdFx0XHRcdGRlbGVnYXRlOiAnPT8nXHJcblx0XHRcdH0sXHJcblx0XHRcdGNvbnRyb2xsZXJBczogJyR1ZXhQb3BDdHJsJyxcclxuXHRcdFx0Y29udHJvbGxlcjogZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQsICRhdHRycykge1xyXG5cdFx0XHRcdHZhciB0YXJnZXQsXHJcblx0XHRcdFx0XHRjbGFzc2VzID0gJGF0dHJzWydjbGFzcyddLFxyXG5cdFx0XHRcdFx0dGVtcGxhdGUgPSAkZWxlbWVudC5odG1sKCksXHJcblx0XHRcdFx0XHRvbiA9ICRhdHRycy5vbiB8fCAnY2xpY2snO1xyXG5cclxuXHRcdFx0XHR2YXIgc2hvd1BvcCA9ICgpID0+IHtcclxuXHRcdFx0XHRcdHVleFBvcCh7XHJcblx0XHRcdFx0XHRcdHNjb3BlOiAkc2NvcGUsXHJcblx0XHRcdFx0XHRcdHRhcmdldDogdGFyZ2V0LFxyXG5cdFx0XHRcdFx0XHRwbGFjZW1lbnQ6ICRhdHRycy5wbGFjZW1lbnQsXHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IGNsYXNzZXMsXHJcblx0XHRcdFx0XHRcdHRlbXBsYXRlOiB0ZW1wbGF0ZVxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0dGhpcy4kb25Jbml0ID0gKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGFyZ2V0ID0gdGhpcy5wb3BDb250YWluZXIuZ2V0VGFyZ2V0KCk7XHJcblxyXG5cdFx0XHRcdFx0aWYgKG9uID09PSAnY2xpY2snKSB7XHJcblx0XHRcdFx0XHRcdHRhcmdldC5vbignY2xpY2snLCAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0c2hvd1BvcCgpO1xyXG5cdFx0XHRcdFx0XHRcdCRzY29wZS4kYXBwbHlBc3luYygpO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH0gZWxzZSBpZiAob24gPT09ICdob3ZlcicpIHtcclxuXHRcdFx0XHRcdFx0dGFyZ2V0Lm9uKCdtb3VzZWVudGVyJywgKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdHNob3dQb3AoKTtcclxuXHRcdFx0XHRcdFx0XHQkc2NvcGUuJGFwcGx5QXN5bmMoKTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0dGhpcy5kZWxlZ2F0ZSA9IHtcclxuXHRcdFx0XHRcdG9wZW46ICgpID0+IHtcclxuXHRcdFx0XHRcdFx0c2hvd1BvcCgpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdHRoaXMuJHBvc3RMaW5rID0gKCkgPT4ge1xyXG5cdFx0XHRcdFx0JGVsZW1lbnQucmVtb3ZlQ2xhc3MoKTtcclxuXHRcdFx0XHRcdCRlbGVtZW50LmVtcHR5KCk7XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcbn0pKCk7XHJcbiIsIihmdW5jdGlvbiAoKSB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cclxuXHRhbmd1bGFyXHJcblx0XHQubW9kdWxlKCdtci51ZXgnKVxyXG5cdFx0LmZhY3RvcnkoJ3VleFBvcHRpcCcsIHBvcHRpcCk7XHJcblxyXG5cdGZ1bmN0aW9uIHBvcHRpcCgkcm9vdFNjb3BlLCAkYW5pbWF0ZSwgJGNvbXBpbGUsIHVleFBvc2l0aW9uZXIpIHtcclxuXHRcdHZhciAkYm9keSA9ICQoZG9jdW1lbnQuYm9keSk7XHJcblxyXG5cdFx0Ly8gb3B0aW9uczpcclxuXHRcdC8vICAgc2NvcGVcclxuXHRcdC8vICAgcGxhY2VtZW50OiBbdG9wLCByaWdodCwgYm90dG9tLCBsZWZ0XSBbc3RhcnQsIGNlbnRlciwgZW5kXVxyXG5cdFx0Ly8gICBvZmZzZXRcclxuXHRcdC8vICAgdGFyZ2V0XHJcblx0XHQvLyAgIHRlbXBsYXRlXHJcblx0XHQvLyAgIGNsYXNzZXNcclxuXHRcdC8vICAgbG9jYWxzXHJcblx0XHQvLyAgIGRlbGF5XHJcblx0XHQvL1xyXG5cdFx0dmFyIGZ1bmMgPSBvcHRpb25zID0+IHtcclxuXHRcdFx0b3B0aW9ucy5wbGFjZW1lbnQgPSBvcHRpb25zLnBsYWNlbWVudCB8fCAnYm90dG9tIGNlbnRlcic7XHJcblx0XHRcdG9wdGlvbnMuZGVsYXkgPSBvcHRpb25zLmRlbGF5IHx8IDA7XHJcblx0XHRcdG9wdGlvbnMudHJpZ2dlciA9IG9wdGlvbnMudHJpZ2dlciB8fCAnaG92ZXInO1xyXG5cclxuXHRcdFx0dmFyIHNjb3BlID0gb3B0aW9ucy5zY29wZSB8fCAkcm9vdFNjb3BlLFxyXG5cdFx0XHRcdHRhcmdldCA9IG9wdGlvbnMudGFyZ2V0LFxyXG5cdFx0XHRcdGVsZW1lbnQgPSAkKGdldFRlbXBsYXRlUG9wdGlwKG9wdGlvbnMpKSxcclxuXHRcdFx0XHRhbmltYXRlRW50ZXIsXHJcblx0XHRcdFx0YW5pbWF0ZUxlYXZlLFxyXG5cdFx0XHRcdCRhcnJvdyA9IGVsZW1lbnQuZmluZCgnLnVleC1wb3B0aXAtYXJyb3cnKSxcclxuXHRcdFx0XHRldmVudEluICA9IG9wdGlvbnMudHJpZ2dlciA9PT0gJ2hvdmVyJyA/ICdtb3VzZWVudGVyJyA6ICdmb2N1c2luJyxcclxuXHRcdFx0XHRldmVudE91dCA9IG9wdGlvbnMudHJpZ2dlciA9PT0gJ2hvdmVyJyA/ICdtb3VzZWxlYXZlJyA6ICdmb2N1c291dCc7XHJcblxyXG5cdFx0XHR2YXIgcG9zaXRpb24gPSAoKSA9PiB7XHJcblx0XHRcdFx0dmFyIG8gPSBhbmd1bGFyLmV4dGVuZChvcHRpb25zLCB7XHJcblx0XHRcdFx0XHR0YXJnZXQ6IHRhcmdldCxcclxuXHRcdFx0XHRcdGVsZW1lbnQ6IGVsZW1lbnQsXHJcblx0XHRcdFx0XHRtYXJnaW46IDUsXHJcblx0XHRcdFx0XHRzdHViOiB0cnVlXHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdHZhciBjb250ZXh0ID0gdWV4UG9zaXRpb25lcihvKTtcclxuXHRcdFx0XHR1ZXhQb3NpdGlvbmVyLmFwcGx5KGNvbnRleHQpO1xyXG5cclxuXHRcdFx0XHR2YXIgdixcclxuXHRcdFx0XHRcdGVwID0gY29udGV4dC5lcCxcclxuXHRcdFx0XHRcdHRwID0gY29udGV4dC50cCxcclxuXHRcdFx0XHRcdHAgPSB1ZXhQb3NpdGlvbmVyLnBhcnNlUGxhY2VtZW50KG9wdGlvbnMucGxhY2VtZW50KTtcclxuXHRcdFx0XHRzd2l0Y2ggKHAucGxhY2UpIHtcclxuXHRcdFx0XHRcdGNhc2UgJ3RvcCc6XHJcblx0XHRcdFx0XHRjYXNlICdib3R0b20nOlxyXG5cdFx0XHRcdFx0XHR2ID0gdHAubGVmdCAtIGVwLmxlZnQgKyAodHAud2lkdGggLyAyKSAtIDU7XHJcblx0XHRcdFx0XHRcdGlmICh2IDwgNSkgdiA9IDU7XHJcblx0XHRcdFx0XHRcdGlmICh2ID4gZXAud2lkdGggLSAxNSkgdiA9IGVwLndpZHRoIC0gMTU7XHJcblx0XHRcdFx0XHRcdCRhcnJvdy5jc3MoJ2xlZnQnLCB2ICsgJ3B4Jyk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdGNhc2UgJ3JpZ2h0JzpcclxuXHRcdFx0XHRcdGNhc2UgJ2xlZnQnOlxyXG5cdFx0XHRcdFx0XHR2ID0gdHAudG9wIC0gZXAudG9wICsgKHRwLmhlaWdodCAvIDIpIC0gNTtcclxuXHRcdFx0XHRcdFx0aWYgKHYgPCA1KSB2ID0gNTtcclxuXHRcdFx0XHRcdFx0aWYgKHYgPiBlcC5oZWlnaHQgLSAxNSkgdiA9IGVwLmhlaWdodCAtIDE1O1xyXG5cdFx0XHRcdFx0XHQkYXJyb3cuY3NzKCd0b3AnLCB2ICsgJ3B4Jyk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0YW5pbWF0ZUVudGVyID0gJGFuaW1hdGUuZW50ZXIoZWxlbWVudCwgJGJvZHksICRib2R5LmNoaWxkcmVuKCkubGFzdCgpKTtcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdCRjb21waWxlKGVsZW1lbnQpKGFuZ3VsYXIuZXh0ZW5kKHNjb3BlLCBvcHRpb25zLmxvY2FscyB8fCB7fSkpO1xyXG5cclxuXHRcdFx0dmFyIGFkZFRvRE9NID0gKCkgPT4ge1xyXG5cdFx0XHRcdGlmIChhbmltYXRlTGVhdmUpICRhbmltYXRlLmNhbmNlbChhbmltYXRlTGVhdmUpO1xyXG5cdFx0XHRcdHBvc2l0aW9uKCk7XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHR2YXIgcmVtb3ZlRnJvbURPTSA9ICgpID0+IHtcclxuXHRcdFx0XHRpZiAoYW5pbWF0ZUVudGVyKSAkYW5pbWF0ZS5jYW5jZWwoYW5pbWF0ZUVudGVyKTtcclxuXHRcdFx0XHRhbmltYXRlTGVhdmUgPSAkYW5pbWF0ZS5sZWF2ZShlbGVtZW50KTtcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHNjb3BlLiRvbignJGRlc3Ryb3knLCAoKSA9PiB7XHJcblx0XHRcdFx0cmVtb3ZlRnJvbURPTSgpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHRhcmdldC5vbihldmVudEluLCAoKSA9PiB7XHJcblx0XHRcdFx0c2NvcGUuJGFwcGx5KCgpID0+IHtcclxuXHRcdFx0XHRcdGFkZFRvRE9NKCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0dGFyZ2V0Lm9uKGV2ZW50T3V0LCAoKSA9PiB7XHJcblx0XHRcdFx0c2NvcGUuJGFwcGx5KCgpID0+IHtcclxuXHRcdFx0XHRcdHJlbW92ZUZyb21ET00oKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHJldHVybiBmdW5jO1xyXG5cclxuXHRcdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2V0Q2xhc3Nlc09wdGlvbihvcHRpb25zKSB7XHJcblx0XHRcdHJldHVybiBvcHRpb25zLmNsYXNzZXMgfHwgb3B0aW9uc1snY2xhc3MnXTtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBnZXRXcmFwcGVyQ2xhc3NlcyhvcHRpb25zKSB7XHJcblx0XHRcdHZhciBjbGFzc2VzID0gZ2V0Q2xhc3Nlc09wdGlvbihvcHRpb25zKTtcclxuXHRcdFx0cmV0dXJuIGNsYXNzZXMgPyAnICcgKyBjbGFzc2VzIDogJyc7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2V0VGVtcGxhdGVQb3B0aXAob3B0aW9ucykge1xyXG5cdFx0XHRyZXR1cm4gICdcXFxyXG48ZGl2IGNsYXNzPVwidWV4LXBvcHRpcCB1ZXgtcG9wdGlwLXAtJyArIG9wdGlvbnMucGxhY2VtZW50ICsgZ2V0V3JhcHBlckNsYXNzZXMob3B0aW9ucykgKyAnXCI+XFxcclxuXHQ8ZGl2IGNsYXNzPVwidWV4LXBvcHRpcC1hcnJvd1wiPjwvZGl2PlxcXHJcblx0PGRpdiBjbGFzcz1cInVleC1wb3B0aXAtY29udGVudFwiPicgKyBvcHRpb25zLnRlbXBsYXRlICsgJzwvZGl2PlxcXHJcbjwvZGl2Pic7XHJcblx0XHR9XHJcblx0fVxyXG59KSgpO1xyXG4iLCIoZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0YW5ndWxhclxyXG5cdFx0Lm1vZHVsZSgnbXIudWV4JylcclxuXHRcdC5kaXJlY3RpdmUoJ3VleFBvcHRpcENvbnRhaW5lcicsIHBvcHRpcENvbnRhaW5lcilcclxuXHRcdC5kaXJlY3RpdmUoJ3VleFBvcHRpcFRhcmdldCcsIHBvcHRpcFRhcmdldClcclxuXHRcdC5kaXJlY3RpdmUoJ3VleFBvcHRpcCcsIHBvcHRpcCk7XHJcblxyXG5cdGZ1bmN0aW9uIHBvcHRpcENvbnRhaW5lcigpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHJlc3RyaWN0OiAnQScsXHJcblx0XHRcdHNjb3BlOiBmYWxzZSxcclxuXHRcdFx0Y29udHJvbGxlcjogZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdHZhciBfdGFyZ2V0RWxlbWVudDtcclxuXHJcblx0XHRcdFx0dGhpcy5yZWdpc3RlclRhcmdldCA9IHRhcmdldEVsZW1lbnQgPT4ge1xyXG5cdFx0XHRcdFx0X3RhcmdldEVsZW1lbnQgPSB0YXJnZXRFbGVtZW50O1xyXG5cdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdHRoaXMuZ2V0VGFyZ2V0ID0gKCkgPT4gX3RhcmdldEVsZW1lbnQ7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBwb3B0aXBUYXJnZXQoKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRyZXN0cmljdDogJ0EnLFxyXG5cdFx0XHRzY29wZTogZmFsc2UsXHJcblx0XHRcdHJlcXVpcmU6IHtcclxuXHRcdFx0XHRwb3B0aXBDb250YWluZXI6ICdedWV4UG9wdGlwQ29udGFpbmVyJ1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRiaW5kVG9Db250cm9sbGVyOiB0cnVlLFxyXG5cdFx0XHRjb250cm9sbGVyQXM6ICckdWV4UG9wdGlwVGFyZ2V0Q3RybCcsXHJcblx0XHRcdGNvbnRyb2xsZXI6IGZ1bmN0aW9uICgkZWxlbWVudCkge1xyXG5cdFx0XHRcdHRoaXMuJG9uSW5pdCA9ICgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMucG9wdGlwQ29udGFpbmVyLnJlZ2lzdGVyVGFyZ2V0KCRlbGVtZW50KTtcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gcG9wdGlwKHVleFBvcHRpcCkge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0cmVzdHJpY3Q6ICdFJyxcclxuXHRcdFx0dGVybWluYWw6IHRydWUsXHJcblx0XHRcdHNjb3BlOiBmYWxzZSxcclxuXHRcdFx0dGVtcGxhdGU6ICgkZWxlbWVudCwgJGF0dHJzKSA9PiB7XHJcblx0XHRcdFx0JGF0dHJzLiRodG1sID0gJGVsZW1lbnQuaHRtbCgpO1xyXG5cdFx0XHRcdCRlbGVtZW50LmVtcHR5KCk7XHJcblx0XHRcdH0sXHJcblx0XHRcdGJpbmRUb0NvbnRyb2xsZXI6IHRydWUsXHJcblx0XHRcdHJlcXVpcmU6IHtcclxuXHRcdFx0XHRwb3B0aXBDb250YWluZXI6ICdedWV4UG9wdGlwQ29udGFpbmVyJ1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRjb250cm9sbGVyQXM6ICckdWV4UG9wdGlwQ3RybCcsXHJcblx0XHRcdGNvbnRyb2xsZXI6IGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMpIHtcclxuXHRcdFx0XHR2YXIgdGVtcGxhdGUgPSAkYXR0cnMuJGh0bWw7XHJcblxyXG5cdFx0XHRcdHRoaXMuJG9uSW5pdCA9ICgpID0+IHtcclxuXHRcdFx0XHRcdHZhciB0YXJnZXQgPSB0aGlzLnBvcHRpcENvbnRhaW5lci5nZXRUYXJnZXQoKTtcclxuXHJcblx0XHRcdFx0XHR1ZXhQb3B0aXAoe1xyXG5cdFx0XHRcdFx0XHRzY29wZTogJHNjb3BlLFxyXG5cdFx0XHRcdFx0XHR0YXJnZXQ6IHRhcmdldCxcclxuXHRcdFx0XHRcdFx0cGxhY2VtZW50OiAkYXR0cnMucGxhY2VtZW50LFxyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiAkYXR0cnNbJ2NsYXNzJ10sXHJcblx0XHRcdFx0XHRcdHRyaWdnZXI6ICRhdHRycy50cmlnZ2VyLFxyXG5cdFx0XHRcdFx0XHR0ZW1wbGF0ZTogdGVtcGxhdGVcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG59KSgpO1xyXG4iLCIoZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0YW5ndWxhci5tb2R1bGUoJ21yLnVleCcpLmNvbXBvbmVudCgndWV4UmFkaW8nLCB7XHJcblx0XHR0ZW1wbGF0ZTogJ1xcXHJcblx0XHRcdDxkaXYgY2xhc3M9XCJfdWV4LWljb25cIj5cXFxyXG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJfdWV4LW9uXCI+PC9kaXY+XFxcclxuXHRcdFx0PC9kaXY+XFxcclxuXHRcdFx0PG5nLXRyYW5zY2x1ZGUgY2xhc3M9XCJfdWV4LWxhYmVsXCI+PC9uZy10cmFuc2NsdWRlPicsXHJcblx0XHR0cmFuc2NsdWRlOiB0cnVlLFxyXG5cdFx0Y29udHJvbGxlcjogJGN0cmwsXHJcblx0XHRyZXF1aXJlOiB7XHJcblx0XHRcdHVleFJhZGlvR3JvdXBDdHJsOiAnXnVleFJhZGlvR3JvdXAnXHJcblx0XHR9LFxyXG5cdFx0YmluZGluZ3M6IHtcclxuXHRcdFx0dmFsdWU6ICc8J1xyXG5cdFx0fVxyXG5cdH0pO1xyXG5cclxuXHRmdW5jdGlvbiAkY3RybCgkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMpIHtcclxuXHRcdHZhciBsYXN0Q2hlY2tlZDtcclxuXHJcblx0XHR2YXIgcmVuZGVyID0gKCkgPT4ge1xyXG5cdFx0XHR2YXIgYXR0clZhbHVlID0gJGF0dHJzLnZhbHVlO1xyXG5cdFx0XHR2YXIgY2hlY2tlZCA9IGF0dHJWYWx1ZSA9PT0gdGhpcy51ZXhSYWRpb0dyb3VwQ3RybC5tb2RlbDtcclxuXHRcdFx0aWYgKGNoZWNrZWQgPT09IGxhc3RDaGVja2VkKSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRsYXN0Q2hlY2tlZCA9IGNoZWNrZWQ7XHJcblx0XHRcdGlmIChjaGVja2VkKSB7XHJcblx0XHRcdFx0JGVsZW1lbnQuYWRkQ2xhc3MoJ2NoZWNrZWQnKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQkZWxlbWVudC5yZW1vdmVDbGFzcygnY2hlY2tlZCcpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdCRhdHRycy4kb2JzZXJ2ZSgndmFsdWUnLCByZW5kZXIpO1xyXG5cdFx0JHNjb3BlLiR3YXRjaCgoKSA9PiB0aGlzLnVleFJhZGlvR3JvdXBDdHJsLm1vZGVsLCByZW5kZXIpO1xyXG5cclxuXHRcdHZhciBjbGlja0xpc3RlbmVyID0gZSA9PiB7XHJcblx0XHRcdGlmIChlLmlzRGVmYXVsdFByZXZlbnRlZCgpIHx8ICRlbGVtZW50LmF0dHIoJ2Rpc2FibGVkJykpIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdCRzY29wZS4kYXBwbHkoKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMudWV4UmFkaW9Hcm91cEN0cmwuc2VsZWN0KCRhdHRycy52YWx1ZSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuJHBvc3RMaW5rID0gKCkgPT4ge1xyXG5cdFx0XHQkZWxlbWVudC5vbignY2xpY2snLCBjbGlja0xpc3RlbmVyKTtcclxuXHRcdH07XHJcblx0fVxyXG59KSgpO1xyXG4iLCIoZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0YW5ndWxhci5tb2R1bGUoJ21yLnVleCcpLmNvbXBvbmVudCgndWV4UmFkaW9Hcm91cCcsIHtcclxuXHRcdGNvbnRyb2xsZXI6ICRjdHJsLFxyXG5cdFx0cmVxdWlyZToge1xyXG5cdFx0XHRuZ01vZGVsQ3RybDogJ15uZ01vZGVsJ1xyXG5cdFx0fSxcclxuXHRcdGJpbmRpbmdzOiB7XHJcblx0XHRcdG1vZGVsOiAnPW5nTW9kZWwnXHJcblx0XHR9XHJcblx0fSk7XHJcblxyXG5cdGZ1bmN0aW9uICRjdHJsKCRzY29wZSkge1xyXG5cdFx0dGhpcy5zZWxlY3QgPSB2YWx1ZSA9PiB7XHJcblx0XHRcdHRoaXMubmdNb2RlbEN0cmwuJHNldFZpZXdWYWx1ZSh2YWx1ZSk7XHJcblx0XHR9O1xyXG5cdH1cclxufSkoKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdGFuZ3VsYXJcclxuXHRcdC5tb2R1bGUoJ21yLnVleCcpXHJcblx0XHQuY29tcG9uZW50KCd1ZXhTZWxlY3QnLCB7XHJcblx0XHRcdHRlbXBsYXRlOiAoJGVsZW1lbnQsICRhdHRycykgPT4ge1xyXG5cdFx0XHRcdCduZ0luamVjdCc7XHJcblxyXG5cdFx0XHRcdCRhdHRycy4kaHRtbCA9ICRlbGVtZW50Lmh0bWwoKTtcclxuXHRcdFx0XHQkZWxlbWVudC5lbXB0eSgpO1xyXG5cclxuXHRcdFx0XHRyZXR1cm4gJ1xcXHJcbjxkaXYgY2xhc3M9XCJ1ZXgtc2VsZWN0XCIgbmctY2xhc3M9XCJ7b3BlbjogJGN0cmwub3BlbmVkfVwiPlxcXHJcblx0PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJidXR0b24gaGFzLWNhcmV0XCIgbmctY2xpY2s9XCIkY3RybC5vcGVuKClcIj5cXFxyXG5cdFx0e3skY3RybC50ZXh0fX1cXFxyXG5cdDwvYnV0dG9uPlxcXHJcblx0PHVleC1pY29uIGljb249XCJjbG9zZVwiIGNsYXNzPVwiYnRuLXBsYWluIGJ0bi1kaW1cIiBuZy1pZj1cIiRjdHJsLmNsZWFyYWJsZSAmJiAkY3RybC5zZWxlY3RlZFwiIG5nLWNsaWNrPVwiJGN0cmwuY2xlYXIoKVwiPjwvdWV4LWljb24+XFxcclxuPC9kaXY+JztcclxuXHRcdFx0fSxcclxuXHRcdFx0Y29udHJvbGxlcjogdWV4U2VsZWN0Q3RybCxcclxuXHRcdFx0cmVxdWlyZToge1xyXG5cdFx0XHRcdG5nTW9kZWxDdHJsOiAnbmdNb2RlbCdcclxuXHRcdFx0fSxcclxuXHRcdFx0YmluZGluZ3M6IHtcclxuXHRcdFx0XHRleHA6ICdAJyxcclxuXHRcdFx0XHRvcmlnaW5hbFRleHQ6ICdAdGV4dCcsXHJcblx0XHRcdFx0aGVhZGVyOiAnQD8nLFxyXG5cdFx0XHRcdGNsYXNzZXM6ICdAPycsXHJcblx0XHRcdFx0Y2xlYXJhYmxlOiAnPD8nXHJcblx0XHRcdH1cclxuXHRcdH0pXHJcblx0XHQuZGlyZWN0aXZlKCd1ZXhTZWxlY3RUcmFuc2NsdWRlJywgdWV4U2VsZWN0VHJhbnNjbHVkZSlcclxuXHRcdC5kaXJlY3RpdmUoJ3VleFNlbGVjdFNpbXBsZScsIHVleFNlbGVjdFNpbXBsZSk7XHJcblxyXG5cdGZ1bmN0aW9uIHVleFNlbGVjdFRyYW5zY2x1ZGUoKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRyZXN0cmljdDogJ0EnLFxyXG5cdFx0XHRjb21waWxlOiBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdHByZTogZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQsICRhdHRycykge1xyXG5cdFx0XHRcdFx0XHR2YXIgY3RybCA9ICRzY29wZS4kY3RybDtcclxuXHRcdFx0XHRcdFx0Y3RybC5fcG9wdWxhdGVTY29wZSgkc2NvcGUpO1xyXG5cclxuXHRcdFx0XHRcdFx0JHNjb3BlLiRldmFsQXN5bmMoKCkgPT4gY3RybC5wb3AoKS5wb3NpdGlvbigpKTtcclxuXHJcblx0XHRcdFx0XHRcdCRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0XHRcdGN0cmwuX3JlbW92ZVNjb3BlKCRzY29wZSk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiB1ZXhTZWxlY3RDdHJsKCRzY29wZSwgJGVsZW1lbnQsICRhdHRycywgJHBhcnNlLCB1ZXhQb3ApIHtcclxuXHRcdHZhbGlkYXRlKCRhdHRycyk7XHJcblxyXG5cdFx0dmFyIHNjb3BlcyA9IFtdLFxyXG5cdFx0XHRvcmlnaW5hbFRleHQgPSB0aGlzLm9yaWdpbmFsVGV4dCxcclxuXHRcdFx0b3B0aW9ucyA9IHBhcnNlKHRoaXMuZXhwKSxcclxuXHRcdFx0a2V5TmFtZSA9IG9wdGlvbnMua2V5TmFtZSxcclxuXHRcdFx0Y2xhc3NlcyA9IHRoaXMuY2xhc3NlcyB8fCAnJyxcclxuXHRcdFx0cG9wSW5zdGFuY2U7XHJcblxyXG5cdFx0dmFyIGNvbnRlbnQgPSAkYXR0cnMuJGh0bWwsXHJcblx0XHRcdCRidXR0b247XHJcblxyXG5cdFx0dmFyIGRpc3BsYXkgPSBpdGVtID0+IHtcclxuXHRcdFx0aWYgKG9wdGlvbnMuYXNGbiA9PT0gYW5ndWxhci5ub29wKSByZXR1cm4gaXRlbTtcclxuXHRcdFx0dmFyIGxvY2FscyA9IHt9O1xyXG5cdFx0XHRsb2NhbHNba2V5TmFtZV0gPSBpdGVtO1xyXG5cdFx0XHRyZXR1cm4gb3B0aW9ucy5hc0ZuKCRzY29wZSwgbG9jYWxzKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dmFyIHRyYWNrID0gaXRlbSA9PiB7XHJcblx0XHRcdGlmIChvcHRpb25zLnRyYWNrRm4gPT09IGFuZ3VsYXIubm9vcCkgcmV0dXJuIGl0ZW07XHJcblx0XHRcdHZhciBsb2NhbHMgPSB7fTtcclxuXHRcdFx0bG9jYWxzW2tleU5hbWVdID0gaXRlbTtcclxuXHRcdFx0cmV0dXJuIG9wdGlvbnMudHJhY2tGbigkc2NvcGUsIGxvY2Fscyk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHZhciBnZXRJdGVtcyA9ICgpID0+IHtcclxuXHRcdFx0cmV0dXJuIG9wdGlvbnMuaW5Gbigkc2NvcGUuJHBhcmVudCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHZhciBzZXRUZXh0ID0gdCA9PiB7XHJcblx0XHRcdHRoaXMudGV4dCA9IHQ7XHJcblx0XHR9O1xyXG5cclxuXHRcdHZhciByZXNldFRleHQgPSAoKSA9PiB7XHJcblx0XHRcdHRoaXMudGV4dCA9IG9yaWdpbmFsVGV4dDtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy4kcG9zdExpbmsgPSAoKSA9PiB7XHJcblx0XHRcdCRidXR0b24gPSAkZWxlbWVudC5maW5kKCcuYnV0dG9uJyk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuJG9uSW5pdCA9ICgpID0+IHtcclxuXHRcdFx0dGhpcy5uZ01vZGVsQ3RybC4kcmVuZGVyID0gKCkgPT4ge1xyXG5cdFx0XHRcdHZhciB2YWx1ZSA9IHRoaXMubmdNb2RlbEN0cmwuJHZpZXdWYWx1ZTtcclxuXHRcdFx0XHR0aGlzLnNlbGVjdCh2YWx1ZSA/IHZhbHVlIDogbnVsbCk7XHJcblx0XHRcdH07XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuX3BvcHVsYXRlU2NvcGUgPSBzY29wZSA9PiB7XHJcblx0XHRcdHZhciBpdGVtID0gc2NvcGUuaXRlbTtcclxuXHRcdFx0c2NvcGVzLnB1c2goc2NvcGUpO1xyXG5cdFx0XHRpZiAoaXRlbSAmJiB0cmFjayhpdGVtKSA9PT0gdHJhY2sodGhpcy5zZWxlY3RlZCkpIHtcclxuXHRcdFx0XHRzY29wZS4kc2VsZWN0ZWQgPSB0cnVlO1xyXG5cdFx0XHR9IGVsc2UgaWYgKGl0ZW0pIHtcclxuXHRcdFx0XHRzY29wZS4kc2VsZWN0ZWQgPSBmYWxzZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoaXRlbSkge1xyXG5cdFx0XHRcdHNjb3BlW2tleU5hbWVdID0gaXRlbTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLl9yZW1vdmVTY29wZSA9IHNjb3BlID0+IHtcclxuXHRcdFx0dmFyIGluZGV4ID0gc2NvcGVzLmluZGV4T2Yoc2NvcGUpO1xyXG5cdFx0XHRpZiAoaW5kZXggPj0gMCkge1xyXG5cdFx0XHRcdHNjb3Blcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuX2ZpbmRTY29wZSA9IChpdGVtLCByZXNvbHZlLCByZWplY3QpID0+IHtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzY29wZXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHR2YXIgc2NvcGUgPSBzY29wZXNbaV07XHJcblx0XHRcdFx0aWYgKGl0ZW0gPT09IHNjb3BlLml0ZW0pIHtcclxuXHRcdFx0XHRcdGlmIChyZXNvbHZlKVxyXG5cdFx0XHRcdFx0XHRyZXNvbHZlKHNjb3BlKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0aWYgKHJlamVjdClcclxuXHRcdFx0XHRcdFx0cmVqZWN0KHNjb3BlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5vcGVuID0gKCkgPT4ge1xyXG5cdFx0XHR0aGlzLm9wZW5lZCA9IHRydWU7XHJcblx0XHRcdGlmICghcG9wSW5zdGFuY2UpIHtcclxuXHRcdFx0XHRwb3BJbnN0YW5jZSA9IHVleFBvcCh7XHJcblx0XHRcdFx0XHRzY29wZTogJHNjb3BlLFxyXG5cdFx0XHRcdFx0dGFyZ2V0OiAkYnV0dG9uLFxyXG5cdFx0XHRcdFx0cGxhY2VtZW50OiAnYm90dG9tIHN0YXJ0JyxcclxuXHRcdFx0XHRcdGNsYXNzZXM6ICd1ZXgtc2VsZWN0LXBvcCAnICsgY2xhc3NlcyxcclxuXHRcdFx0XHRcdHRlbXBsYXRlOiBnZXRUZW1wbGF0ZVBvcChjb250ZW50KVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdHBvcEluc3RhbmNlLm9uRGlzbWlzcygoKSA9PiB0aGlzLm9wZW5lZCA9IGZhbHNlKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRwb3BJbnN0YW5jZS5vcGVuKCk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5jbG9zZSA9ICgpID0+IHtcclxuXHRcdFx0aWYgKHBvcEluc3RhbmNlKSBwb3BJbnN0YW5jZS5kaXNtaXNzKCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuY2xlYXIgPSAoKSA9PiB0aGlzLnNlbGVjdChudWxsKTtcclxuXHJcblx0XHR0aGlzLnNlbGVjdCA9IGl0ZW0gPT4ge1xyXG5cdFx0XHRpZiAoIWl0ZW0gJiYgIXRoaXMuc2VsZWN0ZWQpIHJldHVybjtcclxuXHJcblx0XHRcdHRoaXMuc2VsZWN0ZWQgPSBpdGVtO1xyXG5cclxuXHRcdFx0aWYgKGl0ZW0pIHtcclxuXHRcdFx0XHR0aGlzLl9maW5kU2NvcGUoaXRlbSwgc2NvcGUgPT4ge1xyXG5cdFx0XHRcdFx0c2NvcGUuJHNlbGVjdGVkID0gdHJ1ZTtcclxuXHRcdFx0XHR9LCBzY29wZSA9PiB7XHJcblx0XHRcdFx0XHRzY29wZS4kc2VsZWN0ZWQgPSBmYWxzZTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHR0aGlzLm5nTW9kZWxDdHJsLiRzZXRWaWV3VmFsdWUoaXRlbSk7XHJcblx0XHRcdFx0c2V0VGV4dChkaXNwbGF5KGl0ZW0pKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0aGlzLl9maW5kU2NvcGUobnVsbCwgbnVsbCwgc2NvcGUgPT4ge1xyXG5cdFx0XHRcdFx0c2NvcGUuJHNlbGVjdGVkID0gZmFsc2U7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0dGhpcy5uZ01vZGVsQ3RybC4kc2V0Vmlld1ZhbHVlKG51bGwpO1xyXG5cdFx0XHRcdHJlc2V0VGV4dCgpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR0aGlzLmNsb3NlKCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuaXRlbXMgPSAoKSA9PiBnZXRJdGVtcygpO1xyXG5cclxuXHRcdHRoaXMucG9wID0gKCkgPT4gcG9wSW5zdGFuY2U7XHJcblxyXG5cdFx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcblx0XHRpZiAodGhpcy5jbGVhcmFibGUgPT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHR0aGlzLmNsZWFyYWJsZSA9IHRydWU7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKCF0aGlzLmhlYWRlcikge1xyXG5cdFx0XHR0aGlzLmhlYWRlciA9IG9yaWdpbmFsVGV4dDtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLm9wZW5lZCA9IGZhbHNlO1xyXG5cdFx0dGhpcy5zZWxlY3RlZCA9IG51bGw7XHJcblx0XHR0aGlzLnRleHQgPSBvcmlnaW5hbFRleHQ7XHJcblxyXG5cdFx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcblx0XHRmdW5jdGlvbiBwYXJzZShleHApIHtcclxuXHRcdFx0dmFyIG1hdGNoID0gZXhwLm1hdGNoKFxyXG5cdFx0XHRcdC9eXFxzKihbXFxzXFxTXSs/KVxccytpblxccysoW1xcc1xcU10rPykoPzpcXHMrYXNcXHMrKFtcXHNcXFNdKz8pKT8oPzpcXHMrdHJhY2tcXHMrYnlcXHMrKFtcXHNcXFNdKz8pKT9cXHMqJC8pO1xyXG5cclxuXHRcdFx0dmFyIHBhcnNlZCA9IHtcclxuXHRcdFx0XHRrZXlOYW1lOiBtYXRjaFsxXSxcclxuXHRcdFx0XHRpbkZuOiAkcGFyc2UobWF0Y2hbMl0pLFxyXG5cdFx0XHRcdGFzRm46ICRwYXJzZShtYXRjaFszXSksXHJcblx0XHRcdFx0dHJhY2tGbjogJHBhcnNlKG1hdGNoWzRdKVxyXG5cdFx0XHR9O1xyXG5cdFx0XHRwYXJzZWQuYXN5bmNNb2RlID0gIXBhcnNlZC5pbkZuLmFzc2lnbiAmJiAhcGFyc2VkLmluRm4ubGl0ZXJhbDtcclxuXHRcdFx0cmV0dXJuIHBhcnNlZDtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiB2YWxpZGF0ZSgkYXR0cnMpIHtcclxuXHRcdFx0aWYgKCEkYXR0cnMuZXhwKSB7XHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdcXCd1ZXhTZWxlY3RcXCc6IEF0dHJpYnV0ZSBcXCdleHBcXCcgaXMgcmVxdWlyZWQuJyk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBnZXRUZW1wbGF0ZVBvcChjb250ZW50KSB7XHJcblx0XHRcdHJldHVybiAnXFxcclxuPGhlYWRlcj5cXFxyXG5cdDx1ZXgtaWNvbiBpY29uPVwiY2xvc2VcIiBjbGFzcz1cImNsb3NlLWJ0biBidG4tcGxhaW4gYnRuLWRpbVwiIG5nLWNsaWNrPVwiJHBvcC5kaXNtaXNzKClcIj48L3VleC1pY29uPlxcXHJcblx0PGRpdiBjbGFzcz1cImhlYWRlci10ZXh0XCI+e3s6OiRjdHJsLmhlYWRlcn19PC9kaXY+XFxcclxuPC9oZWFkZXI+XFxcclxuPGRpdiBjbGFzcz1cIl91ZXgtY29udGVudFwiPlxcXHJcblx0PHVsIGNsYXNzPVwib3B0aW9ucyBuby1tYXJnaW5cIj5cXFxyXG5cdFx0PGxpIG5nLXJlcGVhdD1cIml0ZW0gaW4gJGN0cmwuaXRlbXMoKVwiIG5nLWNsaWNrPVwiJGN0cmwuc2VsZWN0KGl0ZW0pXCIgdWV4LXNlbGVjdC10cmFuc2NsdWRlPicgKyBjb250ZW50ICsgJzwvbGk+XFxcclxuXHQ8L3VsPlxcXHJcbjwvZGl2Pic7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiB1ZXhTZWxlY3RTaW1wbGUoKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRyZXN0cmljdDogJ0UnLFxyXG5cdFx0XHR0cmFuc2NsdWRlOiB0cnVlLFxyXG5cdFx0XHR0ZW1wbGF0ZTogJ1xcXHJcblx0XHRcdFx0PGRpdiBjbGFzcz1cInVleC1zZWxlY3Qtc2ltcGxlLWNvbnRlbnRcIiBuZy10cmFuc2NsdWRlPjwvZGl2PlxcXHJcblx0XHRcdFx0PHVleC1pY29uIGljb249XCJjaGVja1wiIG5nLWNsYXNzPVwie3Nob3duOiAkc2VsZWN0ZWR9XCI+PC91ZXgtaWNvbj4nXHJcblx0XHR9O1xyXG5cdH1cclxufSkoKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdGFuZ3VsYXJcclxuXHRcdC5tb2R1bGUoJ21yLnVleCcpXHJcblx0XHQuZGlyZWN0aXZlKCd1ZXhUb29sdGlwJywgdWV4VG9vbHRpcCk7XHJcblxyXG5cdGZ1bmN0aW9uIHVleFRvb2x0aXAoKSB7XHJcblx0XHRmdW5jdGlvbiBleHRyYWN0UGxhY2VtZW50KHYpIHtcclxuXHRcdFx0dmFyIGluZGV4ID0gdi5pbmRleE9mKCcsJyk7XHJcblx0XHRcdHJldHVybiB2LnNsaWNlKDAsIGluZGV4KS50cmltKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gZXh0cmFjdFRleHQodikge1xyXG5cdFx0XHR2YXIgaW5kZXggPSB2LmluZGV4T2YoJywnKTtcclxuXHRcdFx0cmV0dXJuIHYuc2xpY2UoaW5kZXggKyAxKS50cmltKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0cmVzdHJpY3Q6ICdBJyxcclxuXHRcdFx0c2NvcGU6IGZhbHNlLFxyXG5cdFx0XHRsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzKSB7XHJcblx0XHRcdFx0dmFyIHBsYWNlbWVudCA9IGV4dHJhY3RQbGFjZW1lbnQoJGF0dHJzLnVleFRvb2x0aXApO1xyXG5cdFx0XHRcdCRlbGVtZW50LmFkZENsYXNzKCd0b29sdGlwcGVkIHRvb2x0aXBwZWQtJyArIHBsYWNlbWVudCk7XHJcblxyXG5cdFx0XHRcdCRhdHRycy4kb2JzZXJ2ZSgndWV4VG9vbHRpcCcsIGZ1bmN0aW9uICh2KSB7XHJcblx0XHRcdFx0XHR2YXIgdGV4dCA9IGV4dHJhY3RUZXh0KHYpO1xyXG5cdFx0XHRcdFx0JGVsZW1lbnQuYXR0cignYXJpYS1sYWJlbCcsIHRleHQpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxufSkoKTtcclxuIl0sInNvdXJjZVJvb3QiOiIvY29tcG9uZW50cyJ9
