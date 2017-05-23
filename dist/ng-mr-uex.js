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
							template: '\
<div class="uex-modal-t-confirm">\
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
				clearable: '<?',
				placement: '@?'
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
					placement: this.placement || 'bottom start',
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUuanMiLCJhdXRvY29tcGxldGUvYXV0b2NvbXBsZXRlLmpzIiwiY2hlY2tib3gvY2hlY2tib3guanMiLCJpY29uL2ljb24uanMiLCJtaXNjL2FsaWFzLmpzIiwibWlzYy9mb2N1cy5qcyIsIm1pc2MvcG9zaXRpb25lci5qcyIsIm1pc2MvcG9zaXRpb25pbmdUaHJvdHRsZXIuanMiLCJtaXNjL3V0aWwuanMiLCJtb2RhbC9tb2RhbC5qcyIsIm1vZGFsL21vZGFsRGlyZWN0aXZlLmpzIiwicC9wLmpzIiwicG9wL3BvcC5qcyIsInBvcC9wb3BEaXJlY3RpdmUuanMiLCJwb3B0aXAvcG9wdGlwLmpzIiwicG9wdGlwL3BvcHRpcERpcmVjdGl2ZS5qcyIsInJhZGlvL3JhZGlvLmpzIiwicmFkaW8vcmFkaW9Hcm91cC5qcyIsInNlbGVjdC9zZWxlY3QuanMiLCJ0b29sdGlwL3Rvb2x0aXAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeE5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDelBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6Im5nLW1yLXVleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImFuZ3VsYXJcclxuXHQubW9kdWxlKCdtci51ZXgnLCBbJ25nQW5pbWF0ZSddKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdGFuZ3VsYXJcclxuXHRcdC5tb2R1bGUoJ21yLnVleCcpXHJcblx0XHQuZGlyZWN0aXZlKCd1ZXhBdXRvY29tcGxldGUnLCB1ZXhBdXRvY29tcGxldGUpO1xyXG5cclxuXHRmdW5jdGlvbiB1ZXhBdXRvY29tcGxldGVDdHJsKCRzY29wZSwgJGF0dHJzLCAkcGFyc2UsICRxKSB7XHJcblx0XHRmdW5jdGlvbiBwYXJzZShleHApIHtcclxuXHRcdFx0dmFyIG1hdGNoID0gZXhwLm1hdGNoKC9eXFxzKihbXFxzXFxTXSs/KVxccytpblxccysoW1xcc1xcU10rPykoPzpcXHMrYXNcXHMrKFtcXHNcXFNdKz8pKT9cXHMqJC8pO1xyXG5cclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRrZXlOYW1lOiBtYXRjaFsxXSxcclxuXHRcdFx0XHRpbkZuOiAkcGFyc2UobWF0Y2hbMl0pLFxyXG5cdFx0XHRcdGFzRm46ICRwYXJzZShtYXRjaFszXSlcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoJGF0dHJzLmV4cCA9PT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcignXFwndWV4QXV0b2NvbXBsZXRlXFwnOiBBdHRyaWJ1dGUgXFwnZXhwXFwnIGlzIHJlcXVpcmVkLicpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBjdHJsID0gdGhpcyxcclxuXHRcdFx0b3B0aW9ucyA9IHBhcnNlKCRhdHRycy5leHApLFxyXG5cdFx0XHRrZXlOYW1lID0gb3B0aW9ucy5rZXlOYW1lLFxyXG5cdFx0XHRwcm9taXNlO1xyXG5cclxuXHRcdGN0cmwuaXRlbXMgPSBbXTtcclxuXHRcdGN0cmwudGV4dCA9IFtdO1xyXG5cdFx0Y3RybC5vcHRpb25zID0gb3B0aW9ucztcclxuXHRcdGN0cmwua2V5TmFtZSA9IGtleU5hbWU7XHJcblx0XHRjdHJsLmFjdGl2ZUl0ZW0gPSBudWxsO1xyXG5cdFx0Y3RybC5hY3RpdmVJbmRleCA9IC0xO1xyXG5cclxuXHRcdHZhciB0cmFuc2llbnQgPSBmYWxzZTtcclxuXHJcblx0XHRjdHJsLmRpc3BsYXkgPSBmdW5jdGlvbiAoaXRlbSkge1xyXG5cdFx0XHRpZiAob3B0aW9ucy5hc0ZuID09PSBhbmd1bGFyLm5vb3ApIHJldHVybiBpdGVtO1xyXG5cdFx0XHR2YXIgbG9jYWxzID0ge307XHJcblx0XHRcdGxvY2Fsc1trZXlOYW1lXSA9IGl0ZW07XHJcblx0XHRcdHJldHVybiBvcHRpb25zLmFzRm4oJHNjb3BlLCBsb2NhbHMpO1xyXG5cdFx0fTtcclxuXHJcblx0XHRjdHJsLnNlbGVjdCA9IGZ1bmN0aW9uIChpdGVtKSB7XHJcblx0XHRcdGN0cmwudGV4dCA9IGN0cmwuZGlzcGxheShpdGVtKTtcclxuXHRcdFx0Y3RybC5jbGVhcigpO1xyXG5cdFx0XHR0cmFuc2llbnQgPSB0cnVlO1xyXG5cdFx0fTtcclxuXHJcblx0XHRjdHJsLnNldEFjdGl2ZSA9IGZ1bmN0aW9uIChpbmRleCkge1xyXG5cdFx0XHRpZiAoaW5kZXggPT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRcdGN0cmwuYWN0aXZlSXRlbSA9IG51bGw7XHJcblx0XHRcdFx0Y3RybC5hY3RpdmVJbmRleCA9IC0xO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHR2YXIgaXRlbSA9IGN0cmwuaXRlbXNbaW5kZXhdO1xyXG5cclxuXHRcdFx0Y3RybC5hY3RpdmVJdGVtID0gaXRlbTtcclxuXHRcdFx0Y3RybC5hY3RpdmVJbmRleCA9IGluZGV4O1xyXG5cdFx0fTtcclxuXHJcblx0XHRjdHJsLm1vdXNlb3ZlciA9IGZ1bmN0aW9uIChpdGVtLCBpbmRleCkge1xyXG5cdFx0XHRjdHJsLnNldEFjdGl2ZShpbmRleCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdGN0cmwuY2xlYXIgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdGN0cmwuaXRlbXMgPSBbXTtcclxuXHRcdFx0Y3RybC5zZXRBY3RpdmUoKTtcclxuXHRcdH07XHJcblxyXG5cdFx0ZnVuY3Rpb24gZmlsdGVySWZOb3RQcm9taXNlKG8pIHtcclxuXHRcdFx0aWYgKG8udGhlbikgcmV0dXJuIG87XHJcblx0XHRcdHZhciB0ZXh0ID0gY3RybC50ZXh0O1xyXG5cdFx0XHRpZiAoIXRleHQgfHwgdGV4dC50cmltKCkgPT09ICcnKSByZXR1cm4gbztcclxuXHRcdFx0dmFyIHIgPSBbXTtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBvLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0aWYgKGN0cmwuZGlzcGxheShvW2ldKS5pbmRleE9mKHRleHQpID4gLTEpIHtcclxuXHRcdFx0XHRcdHIucHVzaChvW2ldKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIHI7XHJcblx0XHR9XHJcblxyXG5cdFx0JHNjb3BlLiR3YXRjaChmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHJldHVybiBjdHJsLnRleHQ7XHJcblx0XHR9LCBmdW5jdGlvbiB3YXRjaFRleHQodiwgb2xkKSB7XHJcblx0XHRcdGlmICh2ID09PSBvbGQgfHwgdiA9PT0gbnVsbCB8fCB0cmFuc2llbnQpIHtcclxuXHRcdFx0XHR0cmFuc2llbnQgPSBmYWxzZTtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHRcdFx0Y3RybC5uZ01vZGVsLiRzZXRWaWV3VmFsdWUodik7XHJcblx0XHRcdGN0cmwubG9hZGluZyA9IHRydWU7XHJcblx0XHRcdGN0cmwuY2xlYXIoKTtcclxuXHRcdFx0dmFyIHAgPSBwcm9taXNlID0gJHEud2hlbihmaWx0ZXJJZk5vdFByb21pc2UoY3RybC5vcHRpb25zLmluRm4oJHNjb3BlLCB7IC8vIGpzaGludCBpZ25vcmU6bGluZVxyXG5cdFx0XHRcdHE6IHZcclxuXHRcdFx0fSkpKTtcclxuXHRcdFx0cC50aGVuKGZ1bmN0aW9uIChkKSB7XHJcblx0XHRcdFx0aWYgKHAgIT09IHByb21pc2UpIHJldHVybjtcclxuXHRcdFx0XHRjdHJsLml0ZW1zID0gZDtcclxuXHRcdFx0fSkuZmluYWxseShmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0Y3RybC5sb2FkaW5nID0gZmFsc2U7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiB1ZXhBdXRvY29tcGxldGUoJGRvY3VtZW50KSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRyZXN0cmljdDogJ0UnLFxyXG5cdFx0XHRjb250cm9sbGVyOiB1ZXhBdXRvY29tcGxldGVDdHJsLFxyXG5cdFx0XHRjb250cm9sbGVyQXM6ICckdWV4QXV0b2NvbXBsZXRlQ3RybCcsXHJcblx0XHRcdHRlbXBsYXRlOiBmdW5jdGlvbiAoZWxlbWVudCwgYXR0cikge1xyXG5cdFx0XHRcdGZ1bmN0aW9uIGdldEl0ZW1UZW1wbGF0ZSgpIHtcclxuXHRcdFx0XHRcdHZhciB0ZW1wbGF0ZVRhZyA9IGVsZW1lbnQuZmluZCgndWV4LWl0ZW0tdGVtcGxhdGUnKS5kZXRhY2goKSxcclxuXHRcdFx0XHRcdFx0aHRtbCA9IHRlbXBsYXRlVGFnLmxlbmd0aCA/IHRlbXBsYXRlVGFnLmh0bWwoKSA6IGVsZW1lbnQuaHRtbCgpO1xyXG5cdFx0XHRcdFx0aWYgKCF0ZW1wbGF0ZVRhZy5sZW5ndGgpIGVsZW1lbnQuZW1wdHkoKTtcclxuXHRcdFx0XHRcdHJldHVybiBodG1sO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gJ1xcXHJcbjxkaXYgY2xhc3M9XCJ1ZXgtYXV0b2NvbXBsZXRlXCI+XFxcclxuXHQ8aW5wdXQgdHlwZT1cInRleHRcIiBuZy1tb2RlbD1cIiR1ZXhBdXRvY29tcGxldGVDdHJsLnRleHRcIiBuZy1rZXlkb3duPVwia2V5ZG93bigkZXZlbnQpXCIgPlxcXHJcblx0PGRpdiBjbGFzcz1cInVleC1hdXRvY29tcGxldGUtbGlzdFwiIG5nLWlmPVwiJHVleEF1dG9jb21wbGV0ZUN0cmwuaXRlbXMubGVuZ3RoID4gMFwiPlxcXHJcblx0XHQ8ZGl2IGNsYXNzPVwidWV4LWF1dG9jb21wbGV0ZS1pdGVtXCJcXFxyXG5cdFx0XHQgbmctcmVwZWF0PVwiaXRlbSBpbiAkdWV4QXV0b2NvbXBsZXRlQ3RybC5pdGVtc1wiXFxcclxuXHRcdFx0IG5nLWNsaWNrPVwiJHVleEF1dG9jb21wbGV0ZUN0cmwuc2VsZWN0KGl0ZW0pXCJcXFxyXG5cdFx0XHQgbmctY2xhc3M9XCJ7IGFjdGl2ZTogJGluZGV4ID09ICR1ZXhBdXRvY29tcGxldGVDdHJsLmFjdGl2ZUluZGV4IH1cIlxcXHJcblx0XHRcdCBuZy1tb3VzZW92ZXI9XCIkdWV4QXV0b2NvbXBsZXRlQ3RybC5tb3VzZW92ZXIoaXRlbSwgJGluZGV4KVwiXFxcclxuXHRcdFx0IHVleC1hbGlhcz1cIml0ZW0ge3s6OiR1ZXhBdXRvY29tcGxldGVDdHJsLmtleU5hbWV9fVwiPicgK1xyXG5cdFx0XHRcdFx0Z2V0SXRlbVRlbXBsYXRlKCkgKyAnXFxcclxuXHRcdDwvZGl2PlxcXHJcblx0PC9kaXY+XFxcclxuPC9kaXY+JztcclxuXHRcdFx0fSxcclxuXHRcdFx0cmVxdWlyZTogWyd1ZXhBdXRvY29tcGxldGUnLCAnbmdNb2RlbCddLFxyXG5cdFx0XHRzY29wZTogdHJ1ZSxcclxuXHRcdFx0bGluazogZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQsICRhdHRycywgY3RybHMsICR0cmFuc2NsdWRlKSB7XHJcblx0XHRcdFx0dmFyIGN0cmwgPSBjdHJsc1swXSxcclxuXHRcdFx0XHRcdG5nTW9kZWwgPSBjdHJsc1sxXTtcclxuXHJcblx0XHRcdFx0Y3RybC5uZ01vZGVsID0gbmdNb2RlbDtcclxuXHJcblx0XHRcdFx0bmdNb2RlbC4kcmVuZGVyID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0Y3RybC50ZXh0ID0gbmdNb2RlbC4kdmlld1ZhbHVlO1xyXG5cdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdCRzY29wZS5rZXlkb3duID0gZnVuY3Rpb24gKGUpIHtcclxuXHRcdFx0XHRcdHZhciBrZXkgPSBlLndoaWNoLFxyXG5cdFx0XHRcdFx0XHRzaG91bGRQcmV2ZW50RGVmYXVsdCA9IHRydWU7XHJcblxyXG5cdFx0XHRcdFx0c3dpdGNoIChrZXkpIHtcclxuXHRcdFx0XHRcdFx0Y2FzZSAxMzogLy8gZW50ZXJcclxuXHRcdFx0XHRcdFx0XHRjdHJsLnNlbGVjdChjdHJsLmFjdGl2ZUl0ZW0pO1xyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdFx0Y2FzZSAyNzogLy8gZXNjXHJcblx0XHRcdFx0XHRcdFx0Y3RybC5jbGVhcigpO1xyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdFx0Y2FzZSAzODogLy8gdXBcclxuXHRcdFx0XHRcdFx0XHRpZiAoY3RybC5pdGVtcy5sZW5ndGggPT09IDApIGJyZWFrO1xyXG5cdFx0XHRcdFx0XHRcdGlmIChjdHJsLmFjdGl2ZUluZGV4ID09PSAtMSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0Y3RybC5zZXRBY3RpdmUoY3RybC5pdGVtcy5sZW5ndGggLSAxKTtcclxuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRpZiAoY3RybC5hY3RpdmVJbmRleCAtIDEgPCAwKSBicmVhaztcclxuXHRcdFx0XHRcdFx0XHRjdHJsLnNldEFjdGl2ZShjdHJsLmFjdGl2ZUluZGV4IC0gMSk7XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0XHRjYXNlIDQwOiAvLyBkb3duXHJcblx0XHRcdFx0XHRcdFx0aWYgKGN0cmwuaXRlbXMubGVuZ3RoID09PSAwKSBicmVhaztcclxuXHRcdFx0XHRcdFx0XHRpZiAoY3RybC5hY3RpdmVJbmRleCA9PT0gLTEpIHtcclxuXHRcdFx0XHRcdFx0XHRcdGN0cmwuc2V0QWN0aXZlKDApO1xyXG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdGlmIChjdHJsLmFjdGl2ZUluZGV4ICsgMSA+PSBjdHJsLml0ZW1zLmxlbmd0aCkgYnJlYWs7XHJcblx0XHRcdFx0XHRcdFx0Y3RybC5zZXRBY3RpdmUoY3RybC5hY3RpdmVJbmRleCArIDEpO1xyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRcdFx0XHRzaG91bGRQcmV2ZW50RGVmYXVsdCA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdGlmIChzaG91bGRQcmV2ZW50RGVmYXVsdCkge1xyXG5cdFx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0JGVsZW1lbnQub24oJ2tleWRvd24nLCBmdW5jdGlvbiAoZSkge1xyXG5cdFx0XHRcdFx0aWYgKGUud2hpY2ggPT09IDI3KSB7XHJcblx0XHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0XHRcdFx0JHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHRcdFx0Y3RybC5jbGVhcigpO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0JGRvY3VtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XHJcblx0XHRcdFx0XHRpZiAoISQuY29udGFpbnMoJGVsZW1lbnRbMF0sIGUudGFyZ2V0KSkge1xyXG5cdFx0XHRcdFx0XHQkc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdFx0XHRjdHJsLmNsZWFyKCk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxufSkoKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdGFuZ3VsYXIubW9kdWxlKCdtci51ZXgnKS5jb21wb25lbnQoJ3VleENoZWNrYm94Jywge1xyXG5cdFx0dGVtcGxhdGU6ICdcXFxyXG5cdFx0XHQ8ZGl2IGNsYXNzPVwiX3VleC1pY29uXCIgbmctY2xhc3M9XCJ7XFwnY2hlY2tlZFxcJzogJGN0cmwubW9kZWx9XCI+PC9kaXY+XFxcclxuXHRcdFx0PG5nLXRyYW5zY2x1ZGUgY2xhc3M9XCJfdWV4LWxhYmVsXCI+PC9uZy10cmFuc2NsdWRlPicsXHJcblx0XHR0cmFuc2NsdWRlOiB0cnVlLFxyXG5cdFx0Y29udHJvbGxlcjogJGN0cmwsXHJcblx0XHRyZXF1aXJlOiB7XHJcblx0XHRcdG5nTW9kZWxDdHJsOiAnbmdNb2RlbCdcclxuXHRcdH0sXHJcblx0XHRiaW5kaW5nczoge1xyXG5cdFx0XHRtb2RlbDogJz1uZ01vZGVsJ1xyXG5cdFx0fVxyXG5cdH0pO1xyXG5cclxuXHRmdW5jdGlvbiAkY3RybCgkc2NvcGUsICRlbGVtZW50KSB7XHJcblx0XHR2YXIgcmVuZGVyID0gKCkgPT4ge1xyXG5cdFx0XHRpZiAodGhpcy5tb2RlbCkge1xyXG5cdFx0XHRcdCRlbGVtZW50LmFkZENsYXNzKCdjaGVja2VkJyk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0JGVsZW1lbnQucmVtb3ZlQ2xhc3MoJ2NoZWNrZWQnKTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHQkc2NvcGUuJHdhdGNoKCgpID0+IHRoaXMubW9kZWwsIHJlbmRlcik7XHJcblxyXG5cdFx0dmFyIGNsaWNrTGlzdGVuZXIgPSBlID0+IHtcclxuXHRcdFx0aWYgKGUuaXNEZWZhdWx0UHJldmVudGVkKCkgfHwgJGVsZW1lbnQuYXR0cignZGlzYWJsZWQnKSkge1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0JHNjb3BlLiRhcHBseSgoKSA9PiB7XHJcblx0XHRcdFx0dmFyIHZpZXdWYWx1ZSA9ICF0aGlzLm1vZGVsO1xyXG5cdFx0XHRcdHRoaXMubmdNb2RlbEN0cmwuJHNldFZpZXdWYWx1ZSh2aWV3VmFsdWUpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy4kcG9zdExpbmsgPSAoKSA9PiB7XHJcblx0XHRcdCRlbGVtZW50Lm9uKCdjbGljaycsIGNsaWNrTGlzdGVuZXIpO1xyXG5cdFx0fTtcclxuXHR9XHJcbn0pKCk7XHJcbiIsIihmdW5jdGlvbiAoKSB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cclxuXHRhbmd1bGFyXHJcblx0XHQubW9kdWxlKCdtci51ZXgnKVxyXG5cdFx0LnByb3ZpZGVyKCd1ZXhJY29ucycsIHVleEljb25zUHJvdmlkZXIpXHJcblx0XHQuZGlyZWN0aXZlKCd1ZXhJY29uJywgdWV4SWNvbik7XHJcblxyXG5cdGZ1bmN0aW9uIHVleEljb25zUHJvdmlkZXIoKSB7XHJcblx0XHR2YXIgaWNvbnMgPSBbe1xyXG5cdFx0XHRpZDogJ2FkZCxwbHVzJyxcclxuXHRcdFx0c3ZnOiAnPHBhdGggZD1cIk0xOTIgMjI0di0xMjhoLTY0djEyOGgtMTI4djY0aDEyOHYxMjhoNjR2LTEyOGgxMjh2LTY0aC0xMjh6XCIvPicsXHJcblx0XHRcdHZpZXdCb3g6ICcwIDAgMzIwIDUxMidcclxuXHRcdH0sIHtcclxuXHRcdFx0aWQ6ICdjbG9zZScsXHJcblx0XHRcdHN2ZzogJzxwYXRoIGQ9XCJNNy40OCA4bDMuNzUgMy43NS0xLjQ4IDEuNDhMNiA5LjQ4bC0zLjc1IDMuNzUtMS40OC0xLjQ4TDQuNTIgOCAuNzcgNC4yNWwxLjQ4LTEuNDhMNiA2LjUybDMuNzUtMy43NSAxLjQ4IDEuNDh6XCIvPicsXHJcblx0XHRcdHZpZXdCb3g6ICcwIDAgMTIgMTYnXHJcblx0XHR9LCB7XHJcblx0XHRcdGlkOiAnYXJyb3ctdG9wJyxcclxuXHRcdFx0c3ZnOiAnPHBhdGggZD1cIk01IDNMMCA5aDN2NGg0VjloM3pcIi8+JyxcclxuXHRcdFx0dmlld0JveDogJzAgMCAxMCAxNidcclxuXHRcdH0sIHtcclxuXHRcdFx0aWQ6ICdhcnJvdy1yaWdodCcsXHJcblx0XHRcdHN2ZzogJzxwYXRoIGQ9XCJNMTAgOEw0IDN2M0gwdjRoNHYzelwiLz4nLFxyXG5cdFx0XHR2aWV3Qm94OiAnMCAwIDEwIDE2J1xyXG5cdFx0fSwge1xyXG5cdFx0XHRpZDogJ2Fycm93LWJvdHRvbScsXHJcblx0XHRcdHN2ZzogJzxwYXRoIGQ9XCJNNyA3VjNIM3Y0SDBsNSA2IDUtNnpcIi8+JyxcclxuXHRcdFx0dmlld0JveDogJzAgMCAxMCAxNidcclxuXHRcdH0sIHtcclxuXHRcdFx0aWQ6ICdhcnJvdy1sZWZ0JyxcclxuXHRcdFx0c3ZnOiAnPHBhdGggZD1cIk02IDNMMCA4bDYgNXYtM2g0VjZINnpcIi8+JyxcclxuXHRcdFx0dmlld0JveDogJzAgMCAxMCAxNidcclxuXHRcdH0sIHtcclxuXHRcdFx0aWQ6ICdjaGV2cm9uLXRvcCcsXHJcblx0XHRcdHN2ZzogJzxwYXRoIGQ9XCJNMTYwIDEyOGwtMTYwIDE2MCA2NCA2NCA5Ni05NiA5NiA5NiA2NC02NC0xNjAtMTYwelwiLz4nLFxyXG5cdFx0XHR2aWV3Qm94OiAnMCAwIDMyMCA1MTInXHJcblx0XHR9LCB7XHJcblx0XHRcdGlkOiAnY2hldnJvbi1yaWdodCcsXHJcblx0XHRcdHN2ZzogJzxwYXRoIGQ9XCJNNjQgOTZsLTY0IDY0IDk2IDk2LTk2IDk2IDY0IDY0IDE2MC0xNjAtMTYwLTE2MHpcIi8+JyxcclxuXHRcdFx0dmlld0JveDogJzAgMCAyMjQgNTEyJ1xyXG5cdFx0fSwge1xyXG5cdFx0XHRpZDogJ2NoZXZyb24tYm90dG9tJyxcclxuXHRcdFx0c3ZnOiAnPHBhdGggZD1cIk0yNTYgMTYwbC05NiA5Ni05Ni05Ni02NCA2NCAxNjAgMTYwIDE2MC0xNjAtNjQtNjR6XCIvPicsXHJcblx0XHRcdHZpZXdCb3g6ICcwIDAgMzIwIDUxMidcclxuXHRcdH0sIHtcclxuXHRcdFx0aWQ6ICdjaGV2cm9uLWxlZnQnLFxyXG5cdFx0XHRzdmc6ICc8cGF0aCBkPVwiTTIyNCAxNjBsLTY0LTY0LTE2MCAxNjAgMTYwIDE2MCA2NC02NC05Ni05NiA5Ni05NnpcIi8+JyxcclxuXHRcdFx0dmlld0JveDogJzAgMCAyMjQgNTEyJ1xyXG5cdFx0fSwge1xyXG5cdFx0XHRpZDogJ2RvbmUsY2hlY2snLFxyXG5cdFx0XHRzdmc6ICc8cGF0aCBkPVwiTTMyMCA5NmwtMTkyIDE5Mi02NC02NC02NCA2NCAxMjggMTI4IDI1Ni0yNTYtNjQtNjR6XCIvPicsXHJcblx0XHRcdHZpZXdCb3g6ICcwIDAgMzg0IDUxMidcclxuXHRcdH0sIHtcclxuXHRcdFx0aWQ6ICdlZGl0LHBlbmNpbCcsXHJcblx0XHRcdHN2ZzogJzxwYXRoIGQ9XCJNMzUyIDMybC02NCA2NCA5NiA5NiA2NC02NC05Ni05NnpNMCAzODRsMC4zNDQgOTYuMjgxIDk1LjY1Ni0wLjI4MSAyNTYtMjU2LTk2LTk2LTI1NiAyNTZ6TTk2IDQ0OGgtNjR2LTY0aDMydjMyaDMydjMyelwiLz4nLFxyXG5cdFx0XHR2aWV3Qm94OiAnMCAwIDQ0OCA1MTInXHJcblx0XHR9LCB7XHJcblx0XHRcdGlkOiAndHJhc2gnLFxyXG5cdFx0XHRzdmc6ICc8cGF0aCBkPVwiTTExIDJIOWMwLS41NS0uNDUtMS0xLTFINWMtLjU1IDAtMSAuNDUtMSAxSDJjLS41NSAwLTEgLjQ1LTEgMXYxYzAgLjU1LjQ1IDEgMSAxdjljMCAuNTUuNDUgMSAxIDFoN2MuNTUgMCAxLS40NSAxLTFWNWMuNTUgMCAxLS40NSAxLTFWM2MwLS41NS0uNDUtMS0xLTF6bS0xIDEySDNWNWgxdjhoMVY1aDF2OGgxVjVoMXY4aDFWNWgxdjl6bTEtMTBIMlYzaDl2MXpcIi8+JyxcclxuXHRcdFx0dmlld0JveDogJzAgMCAxMiAxNidcclxuXHRcdH0sIHtcclxuXHRcdFx0aWQ6ICdtZW51JyxcclxuXHRcdFx0c3ZnOiAnPHBhdGggZD1cIk04IDR2MUgwVjRoOHpNMCA4aDhWN0gwdjF6bTAgM2g4di0xSDB2MXpcIi8+JyxcclxuXHRcdFx0dmlld0JveDogJzAgMCA4IDE2J1xyXG5cdFx0fSwge1xyXG5cdFx0XHRpZDogJ2NvbW1lbnQnLFxyXG5cdFx0XHRzdmc6ICc8cGF0aCBkPVwiTTE0IDFIMmMtLjU1IDAtMSAuNDUtMSAxdjhjMCAuNTUuNDUgMSAxIDFoMnYzLjVMNy41IDExSDE0Yy41NSAwIDEtLjQ1IDEtMVYyYzAtLjU1LS40NS0xLTEtMXptMCA5SDdsLTIgMnYtMkgyVjJoMTJ2OHpcIi8+JyxcclxuXHRcdFx0dmlld0JveDogJzAgMCAxNiAxNidcclxuXHRcdH0sIHtcclxuXHRcdFx0aWQ6ICdmaWxlJyxcclxuXHRcdFx0c3ZnOiAnPHBhdGggZD1cIk02IDVIMlY0aDR2MXpNMiA4aDdWN0gydjF6bTAgMmg3VjlIMnYxem0wIDJoN3YtMUgydjF6bTEwLTcuNVYxNGMwIC41NS0uNDUgMS0xIDFIMWMtLjU1IDAtMS0uNDUtMS0xVjJjMC0uNTUuNDUtMSAxLTFoNy41TDEyIDQuNXpNMTEgNUw4IDJIMXYxMmgxMFY1elwiLz4nLFxyXG5cdFx0XHR2aWV3Qm94OiAnMCAwIDEyIDE2J1xyXG5cdFx0fSwge1xyXG5cdFx0XHRpZDogJ2NvZyxnZWFyJyxcclxuXHRcdFx0c3ZnOiAnPHBhdGggZD1cIk0xNCA4Ljc3di0xLjZsLTEuOTQtLjY0LS40NS0xLjA5Ljg4LTEuODQtMS4xMy0xLjEzLTEuODEuOTEtMS4wOS0uNDUtLjY5LTEuOTJoLTEuNmwtLjYzIDEuOTQtMS4xMS40NS0xLjg0LS44OC0xLjEzIDEuMTMuOTEgMS44MS0uNDUgMS4wOUwwIDcuMjN2MS41OWwxLjk0LjY0LjQ1IDEuMDktLjg4IDEuODQgMS4xMyAxLjEzIDEuODEtLjkxIDEuMDkuNDUuNjkgMS45MmgxLjU5bC42My0xLjk0IDEuMTEtLjQ1IDEuODQuODggMS4xMy0xLjEzLS45Mi0xLjgxLjQ3LTEuMDlMMTQgOC43NXYuMDJ6TTcgMTFjLTEuNjYgMC0zLTEuMzQtMy0zczEuMzQtMyAzLTMgMyAxLjM0IDMgMy0xLjM0IDMtMyAzelwiLz4nLFxyXG5cdFx0XHR2aWV3Qm94OiAnMCAwIDE0IDE2J1xyXG5cdFx0fSwge1xyXG5cdFx0XHRpZDogJ2xpbmsnLFxyXG5cdFx0XHRzdmc6ICc8cGF0aCBkPVwiTTQgOWgxdjFINGMtMS41IDAtMy0xLjY5LTMtMy41UzIuNTUgMyA0IDNoNGMxLjQ1IDAgMyAxLjY5IDMgMy41IDAgMS40MS0uOTEgMi43Mi0yIDMuMjVWOC41OWMuNTgtLjQ1IDEtMS4yNyAxLTIuMDlDMTAgNS4yMiA4Ljk4IDQgOCA0SDRjLS45OCAwLTIgMS4yMi0yIDIuNVMzIDkgNCA5em05LTNoLTF2MWgxYzEgMCAyIDEuMjIgMiAyLjVTMTMuOTggMTIgMTMgMTJIOWMtLjk4IDAtMi0xLjIyLTItMi41IDAtLjgzLjQyLTEuNjQgMS0yLjA5VjYuMjVjLTEuMDkuNTMtMiAxLjg0LTIgMy4yNUM2IDExLjMxIDcuNTUgMTMgOSAxM2g0YzEuNDUgMCAzLTEuNjkgMy0zLjVTMTQuNSA2IDEzIDZ6XCIvPicsXHJcblx0XHRcdHZpZXdCb3g6ICcwIDAgMTYgMTYnXHJcblx0XHR9LCB7XHJcblx0XHRcdGlkOiAnbGluay1leHRlcm5hbCcsXHJcblx0XHRcdHN2ZzogJzxwYXRoIGQ9XCJNMTEgMTBoMXYzYzAgLjU1LS40NSAxLTEgMUgxYy0uNTUgMC0xLS40NS0xLTFWM2MwLS41NS40NS0xIDEtMWgzdjFIMXYxMGgxMHYtM3pNNiAybDIuMjUgMi4yNUw1IDcuNSA2LjUgOWwzLjI1LTMuMjVMMTIgOFYySDZ6XCIvPicsXHJcblx0XHRcdHZpZXdCb3g6ICcwIDAgMTIgMTYnXHJcblx0XHR9LCB7XHJcblx0XHRcdGlkOiAnbWFpbCcsXHJcblx0XHRcdHN2ZzogJzxwYXRoIGQ9XCJNMCA0djhjMCAuNTUuNDUgMSAxIDFoMTJjLjU1IDAgMS0uNDUgMS0xVjRjMC0uNTUtLjQ1LTEtMS0xSDFjLS41NSAwLTEgLjQ1LTEgMXptMTMgMEw3IDkgMSA0aDEyek0xIDUuNWw0IDMtNCAzdi02ek0yIDEybDMuNS0zTDcgMTAuNSA4LjUgOWwzLjUgM0gyem0xMS0uNWwtNC0zIDQtM3Y2elwiLz4nLFxyXG5cdFx0XHR2aWV3Qm94OiAnMCAwIDE0IDE2J1xyXG5cdFx0fSwge1xyXG5cdFx0XHRpZDogJ3NlYXJjaCcsXHJcblx0XHRcdHN2ZzogJzxwYXRoIGQ9XCJNMTUuNyAxMy4zbC0zLjgxLTMuODNBNS45MyA1LjkzIDAgMCAwIDEzIDZjMC0zLjMxLTIuNjktNi02LTZTMSAyLjY5IDEgNnMyLjY5IDYgNiA2YzEuMyAwIDIuNDgtLjQxIDMuNDctMS4xMWwzLjgzIDMuODFjLjE5LjIuNDUuMy43LjMuMjUgMCAuNTItLjA5LjctLjNhLjk5Ni45OTYgMCAwIDAgMC0xLjQxdi4wMXpNNyAxMC43Yy0yLjU5IDAtNC43LTIuMTEtNC43LTQuNyAwLTIuNTkgMi4xMS00LjcgNC43LTQuNyAyLjU5IDAgNC43IDIuMTEgNC43IDQuNyAwIDIuNTktMi4xMSA0LjctNC43IDQuN3pcIi8+JyxcclxuXHRcdFx0dmlld0JveDogJzAgMCAxNiAxNidcclxuXHRcdH0sIHtcclxuXHRcdFx0aWQ6ICd6YXAnLFxyXG5cdFx0XHRzdmc6ICc8cGF0aCBkPVwiTTEwIDdINmwzLTctOSA5aDRsLTMgN3pcIi8+JyxcclxuXHRcdFx0dmlld0JveDogJzAgMCAxMCAxNidcclxuXHRcdH1dO1xyXG5cclxuXHRcdHRoaXMuYWRkID0gaWNvbiA9PiB7XHJcblx0XHRcdGljb25zLnVuc2hpZnQoaWNvbik7XHJcblx0XHRcdHJldHVybiB0aGlzO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLiRnZXQgPSAoKSA9PiBpY29ucztcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHVleEljb24odWV4SWNvbnMpIHtcclxuXHRcdHZhciBpY29ucyA9IHVleEljb25zO1xyXG5cclxuXHRcdGZ1bmN0aW9uIGlkRXhpc3RzKGlkcywgaWQpIHtcclxuXHRcdFx0dmFyIGFsbCA9IGlkcy5zcGxpdCgnLCcpO1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGFsbC5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdGlmIChhbGxbaV0udHJpbSgpID09PSBpZClcclxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBmaW5kSWNvbkJ5SWQoaWQpIHtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBpY29ucy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdHZhciBpY29uID0gaWNvbnNbaV07XHJcblxyXG5cdFx0XHRcdGlmIChpZEV4aXN0cyhpY29uLmlkLCBpZCkpIHtcclxuXHRcdFx0XHRcdHJldHVybiBpY29uO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ3VleEljb246IFwiJyArIGlkICsgJ1wiIGhhcyBub3QgYmVlbiBmb3VuZC4nKTtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiB3cmFwKGNvbnRlbnQsIHZpZXdCb3gpIHtcclxuXHRcdFx0dmlld0JveCA9IHZpZXdCb3ggfHwgJzAgMCA1MTIgNTEyJztcclxuXHRcdFx0cmV0dXJuICc8c3ZnIHZlcnNpb249XCIxLjFcIiB4PVwiMHB4XCIgeT1cIjBweFwiIHZpZXdCb3g9XCInICsgdmlld0JveCArICdcIj4nICsgY29udGVudCArICc8L3N2Zz4nO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHJlc3RyaWN0OiAnRUEnLFxyXG5cdFx0XHRsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzKSB7XHJcblx0XHRcdFx0dmFyIGlkLCBpY29uO1xyXG5cdFx0XHRcdGlmICgkYXR0cnMudWV4SWNvbikge1xyXG5cdFx0XHRcdFx0aWQgPSAkYXR0cnMudWV4SWNvbjtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0aWQgPSAkYXR0cnMuaWNvbjtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGljb24gPSBmaW5kSWNvbkJ5SWQoaWQpO1xyXG5cdFx0XHRcdGlmICghaWNvbi5zdmcpIHtcclxuXHRcdFx0XHRcdGljb24gPSBmaW5kSWNvbkJ5SWQoaWNvbi5yZWYpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0dmFyIGNvbnRlbnQgPSB3cmFwKGljb24uc3ZnLCBpY29uLnZpZXdCb3ggfHwgaWNvbi52aWV3Ym94KTtcclxuXHRcdFx0XHQkZWxlbWVudC5lbXB0eSgpO1xyXG5cdFx0XHRcdCRlbGVtZW50LmFwcGVuZChjb250ZW50KTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcbn0pKCk7XHJcbiIsIihmdW5jdGlvbiAoKSB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cclxuXHRhbmd1bGFyXHJcblx0XHQubW9kdWxlKCdtci51ZXgnKVxyXG5cdFx0LmRpcmVjdGl2ZSgndWV4QWxpYXMnLCB1ZXhBbGlhcyk7XHJcblxyXG5cdGZ1bmN0aW9uIHVleEFsaWFzKCkge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0cmVzdHJpY3Q6ICdBJyxcclxuXHRcdFx0bGluazogZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQsICRhdHRycykge1xyXG5cdFx0XHRcdHZhciBleHByID0gJGF0dHJzLnVleEFsaWFzLFxyXG5cdFx0XHRcdFx0cGFydHMgPSBleHByLnNwbGl0KCcgJyksXHJcblx0XHRcdFx0XHRzb3VyY2UgPSBwYXJ0c1swXSxcclxuXHRcdFx0XHRcdGRlc3QgPSBwYXJ0c1sxXTtcclxuXHJcblx0XHRcdFx0JHNjb3BlLiR3YXRjaCgoKSA9PiAkc2NvcGUuJGV2YWwoc291cmNlKSwgKG4sIG8pID0+IHtcclxuXHRcdFx0XHRcdCRzY29wZVtkZXN0XSA9IG47XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG59KSgpO1xyXG4iLCIoZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0YW5ndWxhclxyXG5cdFx0Lm1vZHVsZSgnbXIudWV4JylcclxuXHRcdC5kaXJlY3RpdmUoJ3VleEZvY3VzJywgdWV4Rm9jdXMpO1xyXG5cclxuXHRmdW5jdGlvbiB1ZXhGb2N1cygkdGltZW91dCkge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0cmVzdHJpY3Q6ICdBJyxcclxuXHRcdFx0bGluazogZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQsICRhdHRycykge1xyXG5cdFx0XHRcdCRzY29wZS4kb24oJ3VleC5mb2N1cycsICgpID0+IHtcclxuXHRcdFx0XHRcdCR0aW1lb3V0KCRlbGVtZW50LmZvY3VzKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcbn0pKCk7XHJcbiIsIihmdW5jdGlvbiAoKSB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cclxuXHRhbmd1bGFyXHJcblx0XHQubW9kdWxlKCdtci51ZXgnKVxyXG5cdFx0LmZhY3RvcnkoJ3VleFBvc2l0aW9uZXInLCBwb3NpdGlvbmVyKTtcclxuXHJcblx0ZnVuY3Rpb24gcG9zaXRpb25lcigpIHtcclxuXHRcdHZhciAkd2luZG93LFxyXG5cdFx0XHQkYm9keTtcclxuXHJcblx0XHRmdW5jdGlvbiBlbnN1cmUoKSB7XHJcblx0XHRcdGlmICgkd2luZG93KSByZXR1cm47XHJcblxyXG5cdFx0XHQkd2luZG93ID0gJCh3aW5kb3cpO1xyXG5cdFx0XHQkYm9keSA9ICQoZG9jdW1lbnQuYm9keSk7XHJcblx0XHR9XHJcblxyXG5cdFx0ZW5zdXJlKCk7XHJcblxyXG5cdFx0ZnVuY3Rpb24gcGFyc2VQbGFjZW1lbnQocGxhY2VtZW50KSB7XHJcblx0XHRcdHZhciByZXQgPSB7fSxcclxuXHRcdFx0XHRhcnIgPSBwbGFjZW1lbnQuc3BsaXQoJyAnKTtcclxuXHRcdFx0cmV0LnBsYWNlID0gYXJyWzBdO1xyXG5cdFx0XHRyZXQuYWxpZ24gPSBhcnJbMV07XHJcblx0XHRcdHJldHVybiByZXQ7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gbWVhc3VyZShlbGVtZW50LCBmbikge1xyXG5cdFx0XHR2YXIgZWwgPSBlbGVtZW50LmNsb25lKGZhbHNlKTtcclxuXHRcdFx0ZWwuY3NzKCd2aXNpYmlsaXR5JywgJ2hpZGRlbicpO1xyXG5cdFx0XHRlbC5jc3MoJ3Bvc2l0aW9uJywgJ2Fic29sdXRlJyk7XHJcblx0XHRcdCRib2R5LmFwcGVuZChlbCk7XHJcblx0XHRcdHZhciByZXN1bHQgPSBmbihlbCk7XHJcblx0XHRcdGVsLnJlbW92ZSgpO1xyXG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGNvbXB1dGVMZWZ0Rm9yVmVydGljYWwodHAsIGVwLCBvZmZzZXQsIGFsaWduKSB7XHJcblx0XHRcdHN3aXRjaCAoYWxpZ24pIHtcclxuXHRcdFx0XHRjYXNlICdzdGFydCc6XHJcblx0XHRcdFx0XHRvZmZzZXQubGVmdCA9IHRwLmxlZnQ7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0Y2FzZSAnY2VudGVyJzpcclxuXHRcdFx0XHRcdG9mZnNldC5sZWZ0ID0gdHAubGVmdCArICh0cC53aWR0aCAvIDIpIC0gKGVwLndpZHRoIC8gMik7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0Y2FzZSAnZW5kJzpcclxuXHRcdFx0XHRcdG9mZnNldC5sZWZ0ID0gdHAubGVmdCArIHRwLndpZHRoIC0gZXAud2lkdGg7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGNvbXB1dGVUb3BGb3JIb3Jpem9udGFsKHRwLCBlcCwgb2Zmc2V0LCBhbGlnbikge1xyXG5cdFx0XHRzd2l0Y2ggKGFsaWduKSB7XHJcblx0XHRcdFx0Y2FzZSAnc3RhcnQnOlxyXG5cdFx0XHRcdFx0b2Zmc2V0LnRvcCA9IHRwLnRvcDtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRjYXNlICdjZW50ZXInOlxyXG5cdFx0XHRcdFx0b2Zmc2V0LnRvcCA9IHRwLnRvcCArICh0cC5oZWlnaHQgLyAyKSAtIChlcC5oZWlnaHQgLyAyKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRjYXNlICdlbmQnOlxyXG5cdFx0XHRcdFx0b2Zmc2V0LnRvcCA9IHRwLnRvcCArIHRwLmhlaWdodCAtIGVwLmhlaWdodDtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gY29tcHV0ZU9mZnNldChjb250ZXh0LCBvcHRpb25zKSB7XHJcblx0XHRcdHZhciBwbGFjZSA9IG9wdGlvbnMucGxhY2UsXHJcblx0XHRcdFx0YWxpZ24gPSBvcHRpb25zLmFsaWduLFxyXG5cdFx0XHRcdG8gPSBvcHRpb25zLm9mZnNldCxcclxuXHRcdFx0XHRlcCA9IGNvbnRleHQuZXAsXHJcblx0XHRcdFx0dHAgPSBjb250ZXh0LnRwO1xyXG5cclxuXHRcdFx0dmFyIG9mZnNldCA9IHtcclxuXHRcdFx0XHR0b3A6IDAsXHJcblx0XHRcdFx0bGVmdDogMFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0c3dpdGNoIChwbGFjZSkge1xyXG5cdFx0XHRcdGNhc2UgJ3RvcCc6XHJcblx0XHRcdFx0XHRvZmZzZXQudG9wID0gdHAudG9wIC0gZXAuaGVpZ2h0IC0gbztcclxuXHRcdFx0XHRcdGNvbXB1dGVMZWZ0Rm9yVmVydGljYWwodHAsIGVwLCBvZmZzZXQsIGFsaWduKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRjYXNlICdyaWdodCc6XHJcblx0XHRcdFx0XHRvZmZzZXQubGVmdCA9IHRwLmxlZnQgKyB0cC53aWR0aCArIG87XHJcblx0XHRcdFx0XHRjb21wdXRlVG9wRm9ySG9yaXpvbnRhbCh0cCwgZXAsIG9mZnNldCwgYWxpZ24pO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdGNhc2UgJ2JvdHRvbSc6XHJcblx0XHRcdFx0XHRvZmZzZXQudG9wID0gdHAudG9wICsgdHAuaGVpZ2h0ICsgbztcclxuXHRcdFx0XHRcdGNvbXB1dGVMZWZ0Rm9yVmVydGljYWwodHAsIGVwLCBvZmZzZXQsIGFsaWduKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRjYXNlICdsZWZ0JzpcclxuXHRcdFx0XHRcdG9mZnNldC5sZWZ0ID0gdHAubGVmdCAtIGVwLndpZHRoIC0gbztcclxuXHRcdFx0XHRcdGNvbXB1dGVUb3BGb3JIb3Jpem9udGFsKHRwLCBlcCwgb2Zmc2V0LCBhbGlnbik7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIG9mZnNldDtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBjb2Fyc2VPZmZzZXQoY29udGV4dCwgb3B0aW9ucykge1xyXG5cdFx0XHR2YXIgb2Zmc2V0ID0gY29udGV4dC5vZmZzZXQsXHJcblx0XHRcdFx0bWFyZ2luID0gb3B0aW9ucy5tYXJnaW4gfHwgMCxcclxuXHRcdFx0XHRzY3JvbGxUb3AgPSAkd2luZG93LnNjcm9sbFRvcCgpLFxyXG5cdFx0XHRcdGdwID0ge1xyXG5cdFx0XHRcdFx0bGVmdDogbWFyZ2luLFxyXG5cdFx0XHRcdFx0dG9wOiBtYXJnaW4sXHJcblx0XHRcdFx0XHR3aWR0aDogJHdpbmRvdy53aWR0aCgpIC0gbWFyZ2luICogMixcclxuXHRcdFx0XHRcdGhlaWdodDogJHdpbmRvdy5oZWlnaHQoKSAtIG1hcmdpbiAqIDJcclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gQ29hcnNlIGxlZnRcclxuXHRcdFx0aWYgKG9mZnNldC5sZWZ0ICsgY29udGV4dC5lcC53aWR0aCA+IGdwLndpZHRoKSB7XHJcblx0XHRcdFx0b2Zmc2V0LmxlZnQgLT0gb2Zmc2V0LmxlZnQgKyBjb250ZXh0LmVwLndpZHRoIC0gZ3Aud2lkdGg7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENvYXJzZSB0b3BcclxuXHRcdFx0aWYgKG9mZnNldC50b3AgKyBjb250ZXh0LmVwLmhlaWdodCA+IGdwLmhlaWdodCArIHNjcm9sbFRvcCkge1xyXG5cdFx0XHRcdG9mZnNldC50b3AgLT0gb2Zmc2V0LnRvcCArIGNvbnRleHQuZXAuaGVpZ2h0IC0gZ3AuaGVpZ2h0IC0gc2Nyb2xsVG9wO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBDb2Fyc2UgbmVnYXRpdmVzXHJcblx0XHRcdGlmIChvZmZzZXQubGVmdCA8IGdwLmxlZnQpIG9mZnNldC5sZWZ0ID0gZ3AubGVmdDtcclxuXHRcdFx0aWYgKG9mZnNldC50b3AgPCBncC50b3AgKyBzY3JvbGxUb3ApIG9mZnNldC50b3AgPSBncC50b3AgKyBzY3JvbGxUb3A7XHJcblxyXG5cdFx0XHQvLyBTZXQgbWF4V2lkdGhcclxuXHRcdFx0b2Zmc2V0Lm1heFdpZHRoID0gZ3Aud2lkdGg7XHJcblxyXG5cdFx0XHQvLyBTZXQgbWF4SGVpZ2h0XHJcblx0XHRcdG9mZnNldC5tYXhIZWlnaHQgPSBncC5oZWlnaHQ7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gbWVhc3VyaW5nKG9wdGlvbnMsIGZuKSB7XHJcblx0XHRcdGlmIChvcHRpb25zLnN0dWIgPT09IHRydWUpIHtcclxuXHRcdFx0XHRtZWFzdXJlKG9wdGlvbnMuZWxlbWVudCwgZm4pO1xyXG5cdFx0XHR9IGVsc2UgaWYgKG9wdGlvbnMuc3R1Yikge1xyXG5cdFx0XHRcdGZuKG9wdGlvbnMuc3R1Yik7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Zm4ob3B0aW9ucy5lbGVtZW50KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIHRhcmdldDogdGhlIHRhcmdldCBlbGVtZW50XHJcblx0XHQvLyBlbGVtZW50OiB0aGUgZWxlbWVudCB0byBiZSBwb3NpdGlvbmVkXHJcblx0XHQvLyBwbGFjZW1lbnQ6IFt0b3AsIHJpZ2h0LCBib3R0b20sIGxlZnRdIFtzdGFydCwgY2VudGVyLCBlbmRdXHJcblx0XHQvLyBtYXJnaW46IHRoZSBtYXJnaW4gZnJvbSB0aGUgb3V0ZXIgd2luZG93XHJcblx0XHQvLyBvZmZzZXQ6IHRoZSBvZmZzZXQgZnJvbSB0aGUgdGFyZ2V0XHJcblx0XHQvLyBzdHViOiB0cnVlIHRvIHN0dWIgdGhlIGVsZW1lbnQgYmVmb3JlIG1lYXN1cmluZywgb3IgdGhlIHN0dWIgZWxlbWVudCBpdHNlbGZcclxuXHRcdC8vXHJcblx0XHR2YXIgZnVuYyA9IG9wdGlvbnMgPT4ge1xyXG5cdFx0XHRvcHRpb25zLm1hcmdpbiA9IG9wdGlvbnMubWFyZ2luIHx8IDU7XHJcblx0XHRcdG9wdGlvbnMub2Zmc2V0ID0gb3B0aW9ucy5vZmZzZXQgfHwgNTtcclxuXHRcdFx0aWYgKG9wdGlvbnMucGxhY2VtZW50KSB7XHJcblx0XHRcdFx0b3B0aW9ucy5wbGFjZW1lbnRPYmplY3QgPSBwYXJzZVBsYWNlbWVudChvcHRpb25zLnBsYWNlbWVudCk7XHJcblx0XHRcdFx0b3B0aW9ucy5wbGFjZSA9IG9wdGlvbnMucGxhY2VtZW50T2JqZWN0LnBsYWNlO1xyXG5cdFx0XHRcdG9wdGlvbnMuYWxpZ24gPSBvcHRpb25zLnBsYWNlbWVudE9iamVjdC5hbGlnbjtcclxuXHRcdFx0fVxyXG5cdFx0XHRvcHRpb25zLnBsYWNlID0gb3B0aW9ucy5wbGFjZSB8fCAnYm90dG9tJztcclxuXHRcdFx0b3B0aW9ucy5hbGlnbiA9IG9wdGlvbnMuYWxpZ24gfHwgJ3N0YXJ0JztcclxuXHJcblx0XHRcdHZhciB0YXJnZXQgPSBvcHRpb25zLnRhcmdldCxcclxuXHRcdFx0XHRlbGVtZW50ID0gb3B0aW9ucy5lbGVtZW50LFxyXG5cdFx0XHRcdHRhcmdldE9mZnNldCA9IHRhcmdldC5vZmZzZXQoKTtcclxuXHJcblx0XHRcdHZhciB0cCA9IHtcclxuXHRcdFx0XHR0b3A6IHRhcmdldE9mZnNldC50b3AsXHJcblx0XHRcdFx0bGVmdDogdGFyZ2V0T2Zmc2V0LmxlZnQsXHJcblx0XHRcdFx0d2lkdGg6IHRhcmdldC5vdXRlcldpZHRoKCksXHJcblx0XHRcdFx0aGVpZ2h0OiB0YXJnZXQub3V0ZXJIZWlnaHQoKVxyXG5cdFx0XHR9O1xyXG5cdFx0XHR2YXIgZXAgPSB7fTtcclxuXHRcdFx0bWVhc3VyaW5nKG9wdGlvbnMsIGVsID0+IHtcclxuXHRcdFx0XHRlcC53aWR0aCA9IGVsLm91dGVyV2lkdGgoKTtcclxuXHRcdFx0XHRlcC5oZWlnaHQgPSBlbC5vdXRlckhlaWdodCgpO1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0dmFyIGNvbnRleHQgPSB7XHJcblx0XHRcdFx0dGFyZ2V0OiB0YXJnZXQsXHJcblx0XHRcdFx0ZWxlbWVudDogZWxlbWVudCxcclxuXHRcdFx0XHR0cDogdHAsXHJcblx0XHRcdFx0ZXA6IGVwXHJcblx0XHRcdH07XHJcblx0XHRcdHZhciBvZmZzZXQgPSBjb21wdXRlT2Zmc2V0KGNvbnRleHQsIG9wdGlvbnMpO1xyXG5cdFx0XHRjb250ZXh0Lm9mZnNldCA9IG9mZnNldDtcclxuXHRcdFx0Y29hcnNlT2Zmc2V0KGNvbnRleHQsIG9wdGlvbnMpO1xyXG5cdFx0XHRjb250ZXh0LmVwLmxlZnQgPSBvZmZzZXQubGVmdDtcclxuXHRcdFx0Y29udGV4dC5lcC50b3AgPSBvZmZzZXQudG9wO1xyXG5cclxuXHRcdFx0cmV0dXJuIGNvbnRleHQ7XHJcblx0XHR9O1xyXG5cclxuXHRcdGZ1bmMuYXBwbHkgPSAoY29udGV4dCkgPT4ge1xyXG5cdFx0XHR2YXIgZWxlbWVudCA9IGNvbnRleHQuZWxlbWVudCxcclxuXHRcdFx0XHRvZmZzZXQgPSBjb250ZXh0Lm9mZnNldDtcclxuXHJcblx0XHRcdGVsZW1lbnQuY3NzKCd0b3AnLCBvZmZzZXQudG9wKTtcclxuXHRcdFx0ZWxlbWVudC5jc3MoJ2xlZnQnLCBvZmZzZXQubGVmdCk7XHJcblx0XHRcdGlmIChvZmZzZXQubWF4V2lkdGgpIHtcclxuXHRcdFx0XHRlbGVtZW50LmNzcygnbWF4LXdpZHRoJywgb2Zmc2V0Lm1heFdpZHRoKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAob2Zmc2V0Lm1heEhlaWdodCkge1xyXG5cdFx0XHRcdGVsZW1lbnQuY3NzKCdtYXgtaGVpZ2h0Jywgb2Zmc2V0Lm1heEhlaWdodCk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0ZnVuYy5wYXJzZVBsYWNlbWVudCA9IHBhcnNlUGxhY2VtZW50O1xyXG5cclxuXHRcdHJldHVybiBmdW5jO1xyXG5cdH1cclxufSkoKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdGFuZ3VsYXJcclxuXHRcdC5tb2R1bGUoJ21yLnVleCcpXHJcblx0XHQuZmFjdG9yeSgndWV4UG9zaXRpb25pbmdUaHJvdHRsZXInLCBwb3NpdGlvbmluZ1Rocm90dGxlcik7XHJcblxyXG5cdGZ1bmN0aW9uIG5vdygpIHtcclxuXHRcdHJldHVybiArbmV3IERhdGUoKTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHJlbW92ZShhcnJheSwgaXRlbSkge1xyXG5cdFx0dmFyIGluZGV4ID0gYXJyYXkuaW5kZXhPZihpdGVtKTtcclxuXHRcdGFycmF5LnNwbGljZShpbmRleCwgMSk7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBwb3NpdGlvbmluZ1Rocm90dGxlcigpIHtcclxuXHRcdHZhciBoYW5kbGVycyA9IFtdLFxyXG5cdFx0XHQkd2luZG93ID0gJCh3aW5kb3cpLFxyXG5cdFx0XHRsYXN0Q2FsbCA9IG51bGwsXHJcblx0XHRcdGxhc3REdXJhdGlvbiA9IG51bGwsXHJcblx0XHRcdHBlbmRpbmdUaW1lb3V0ID0gbnVsbDtcclxuXHJcblx0XHR2YXIgZ2V0Q29udGV4dCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRjbGllbnQ6IHtcclxuXHRcdFx0XHRcdGhlaWdodDogJHdpbmRvdy5oZWlnaHQoKSxcclxuXHRcdFx0XHRcdHdpZHRoOiAkd2luZG93LndpZHRoKCksXHJcblx0XHRcdFx0XHR0b3A6ICR3aW5kb3cuc2Nyb2xsVG9wKClcclxuXHRcdFx0XHR9XHJcblx0XHRcdH07XHJcblx0XHR9O1xyXG5cclxuXHRcdGZ1bmN0aW9uIGhhbmRsZXJTYXRpc2ZpZXMoZXZlbnRzLCBlKSB7XHJcblx0XHRcdGlmICghZXZlbnRzKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH1cclxuXHRcdFx0dmFyIHR5cGUgPSBlLnR5cGUsXHJcblx0XHRcdFx0Zm91bmQgPSBmYWxzZTtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBldmVudHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRpZiAoZXZlbnRzW2ldID09PSB0eXBlKSBmb3VuZCA9IHRydWU7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIGZvdW5kO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBwcm9jZXNzSGFuZGxlcnMgPSBlID0+IHtcclxuXHRcdFx0dmFyIGNvbnRleHQgPSBnZXRDb250ZXh0KCk7XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgaGFuZGxlcnMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHR2YXIgY29tcG9zaXRlID0gaGFuZGxlcnNbaV0sXHJcblx0XHRcdFx0XHRoYW5kbGVyID0gY29tcG9zaXRlLmhhbmRsZXIsXHJcblx0XHRcdFx0XHRldmVudHMgPSBjb21wb3NpdGUuZXZlbnRzO1xyXG5cdFx0XHRcdGlmIChlICYmICFoYW5kbGVyU2F0aXNmaWVzKGV2ZW50cywgZSkpICB7XHJcblx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0aGFuZGxlcihjb250ZXh0KTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHR2YXIgdGljayA9IGZ1bmN0aW9uIChlKSB7XHJcblx0XHRcdGlmICh0eXBlb2YgbGFzdER1cmF0aW9uICE9PSAndW5kZWZpbmVkJyAmJiBsYXN0RHVyYXRpb24gPiAxNikge1xyXG5cdFx0XHRcdGxhc3REdXJhdGlvbiA9IE1hdGgubWluKGxhc3REdXJhdGlvbiAtIDE2LCAyNTApO1xyXG5cclxuXHRcdFx0XHRwZW5kaW5nVGltZW91dCA9IHNldFRpbWVvdXQodGljaywgMjUwKTtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmICh0eXBlb2YgbGFzdENhbGwgIT09ICd1bmRlZmluZWQnICYmIG5vdygpIC0gbGFzdENhbGwgPCAxMCkge1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKHR5cGVvZiBwZW5kaW5nVGltZW91dCAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRcdFx0XHRjbGVhclRpbWVvdXQocGVuZGluZ1RpbWVvdXQpO1xyXG5cdFx0XHRcdHBlbmRpbmdUaW1lb3V0ID0gbnVsbDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0bGFzdENhbGwgPSBub3coKTtcclxuXHRcdFx0cHJvY2Vzc0hhbmRsZXJzKGUpO1xyXG5cdFx0XHRsYXN0RHVyYXRpb24gPSBub3coKSAtIGxhc3RDYWxsO1xyXG5cdFx0fTtcclxuXHJcblx0XHQkKCgpID0+IHtcclxuXHRcdFx0cHJvY2Vzc0hhbmRsZXJzKCk7XHJcblx0XHRcdFsncmVzaXplJywgJ3Njcm9sbCcsICd0b3VjaG1vdmUnXS5mb3JFYWNoKGV2ZW50ID0+IHtcclxuXHRcdFx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgdGljayk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0c3Vic2NyaWJlOiAoaGFuZGxlciwgZXZlbnRzKSA9PiB7XHJcblx0XHRcdFx0aWYgKGFuZ3VsYXIuaXNTdHJpbmcoZXZlbnRzKSkge1xyXG5cdFx0XHRcdFx0ZXZlbnRzID0gW2V2ZW50c107XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGhhbmRsZXJzLnB1c2goe2hhbmRsZXI6IGhhbmRsZXIsIGV2ZW50czogZXZlbnRzfSk7XHJcblx0XHRcdFx0cHJvY2Vzc0hhbmRsZXJzKCk7XHJcblx0XHRcdFx0cmV0dXJuICgpID0+IHtcclxuXHRcdFx0XHRcdHJlbW92ZShoYW5kbGVycywgaGFuZGxlcik7XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcbn0pKCk7XHJcbiIsIihmdW5jdGlvbiAoKSB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cclxuXHRhbmd1bGFyXHJcblx0XHQubW9kdWxlKCdtci51ZXgnKVxyXG5cdFx0LmZhY3RvcnkoJ3VleFV0aWwnLCB1dGlsKTtcclxuXHJcblx0ZnVuY3Rpb24gdXRpbCgpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdGNhbWVsVG9EYXNoOiBzdHIgPT4ge1xyXG5cdFx0XHRcdHJldHVybiBzdHIucmVwbGFjZSgvXFxXKy9nLCAnLScpLnJlcGxhY2UoLyhbYS16XFxkXSkoW0EtWl0pL2csICckMS0kMicpO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRkYXNoVG9DYW1lbDogc3RyID0+IHtcclxuXHRcdFx0XHRyZXR1cm4gc3RyLnJlcGxhY2UoL1xcVysoLikvZywgKHgsIGNocikgPT4gY2hyLnRvVXBwZXJDYXNlKCkpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxufSkoKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdGFuZ3VsYXJcclxuXHRcdC5tb2R1bGUoJ21yLnVleCcpXHJcblx0XHQuZmFjdG9yeSgndWV4TW9kYWwnLCBtb2RhbCk7XHJcblxyXG5cdGZ1bmN0aW9uIG1vZGFsKCRyb290U2NvcGUsICRjb21waWxlLCAkY29udHJvbGxlciwgJGFuaW1hdGUsICR0ZW1wbGF0ZVJlcXVlc3QsICRxLCB1ZXhVdGlsKSB7XHJcblx0XHR2YXIgaW5zdGFuY2VzID0gW10sXHJcblx0XHRcdCRib2R5ID0gJChkb2N1bWVudC5ib2R5KSxcclxuXHRcdFx0JGJkID0gYW5ndWxhci5lbGVtZW50KCc8ZGl2IGNsYXNzPVwidWV4LW1vZGFsLWJkXCIgLz4nKTtcclxuXHJcblx0XHQkYm9keS5vbigna2V5ZG93bicsIGUgPT4ge1xyXG5cdFx0XHRpZiAoIWUuaXNEZWZhdWx0UHJldmVudGVkKCkgJiYgZS53aGljaCA9PT0gMjcpIHtcclxuXHRcdFx0XHQkcm9vdFNjb3BlLiRhcHBseSgoKSA9PiB7XHJcblx0XHRcdFx0XHRkaXNtaXNzVG9wTW9kYWwoZSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIG9wdGlvbnM6XHJcblx0XHQvLyAgIHNjb3BlXHJcblx0XHQvLyAgIHRlbXBsYXRlIC0gdGVtcGxhdGVVcmxcclxuXHRcdC8vICAgY29tcG9uZW50XHJcblx0XHQvLyAgIHRpdGxlXHJcblx0XHQvLyAgIGNsYXNzZXNcclxuXHRcdC8vICAgbG9jYWxzXHJcblx0XHQvLyAgIGNhbkJlRGlzbWlzc2VkRnJvbUJEXHJcblx0XHQvL1xyXG5cdFx0dmFyIGZ1bmMgPSBvcHRpb25zID0+IHtcclxuXHRcdFx0b3B0aW9ucyA9IGFuZ3VsYXIuaXNTdHJpbmcob3B0aW9ucykgPyB7XHJcblx0XHRcdFx0Y29tcG9uZW50OiBvcHRpb25zXHJcblx0XHRcdH0gOiBvcHRpb25zO1xyXG5cdFx0XHQvLyBvcHRpb25zLmNhbkJlRGlzbWlzc2VkRnJvbUJEID0gb3B0aW9ucy5jYW5CZURpc21pc3NlZEZyb21CRCA9PT0gdW5kZWZpbmVkID8gZmFsc2UgOiB0cnVlO1xyXG5cdFx0XHR2YXIgc2NvcGUgPSAob3B0aW9ucy5zY29wZSB8fCAkcm9vdFNjb3BlKS4kbmV3KCksXHJcblx0XHRcdFx0JGVsZW1lbnQgPSAkKGdldFRlbXBsYXRlTW9kYWxDb250YWluZXIob3B0aW9ucykpO1xyXG5cclxuXHRcdFx0dmFyIGRlc3Ryb3lBbmRDbGVhbiA9IGluc3RhbmNlID0+IHtcclxuXHRcdFx0XHRpbnN0YW5jZS5zY29wZS4kZGVzdHJveSgpO1xyXG5cdFx0XHRcdHZhciBkZWxlZ2F0ZXMgPSBpbnN0YW5jZS5fZGVsZWdhdGVzO1xyXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZGVsZWdhdGVzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0XHRkZWxlZ2F0ZXNbaV0oKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHR2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpLFxyXG5cdFx0XHRcdGluc3RhbmNlID0ge1xyXG5cdFx0XHRcdFx0X2RlbGVnYXRlczogW10sXHJcblx0XHRcdFx0XHRzY29wZTogc2NvcGUsXHJcblx0XHRcdFx0XHRlbGVtZW50OiAkZWxlbWVudCxcclxuXHRcdFx0XHRcdGNhbkJlRGlzbWlzc2VkRnJvbUJEOiBvcHRpb25zLmNhbkJlRGlzbWlzc2VkRnJvbUJELFxyXG5cdFx0XHRcdFx0dGl0bGU6IHYgPT4ge1xyXG5cdFx0XHRcdFx0XHRzY29wZS4kdGl0bGUgPSB2O1xyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHJlc29sdmU6IHYgPT4ge1xyXG5cdFx0XHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKHYpO1xyXG5cdFx0XHRcdFx0XHRpbnN0YW5jZS5kaXNtaXNzKCk7XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0cmVqZWN0OiByZWFzb24gPT4ge1xyXG5cdFx0XHRcdFx0XHRpbnN0YW5jZS5kaXNtaXNzKHJlYXNvbik7XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0ZGlzbWlzczogcmVhc29uID0+IHtcclxuXHRcdFx0XHRcdFx0dmFyIGkgPSBpbnN0YW5jZXMuaW5kZXhPZihpbnN0YW5jZSk7XHJcblx0XHRcdFx0XHRcdGluc3RhbmNlcy5zcGxpY2UoaSwgMSk7XHJcblx0XHRcdFx0XHRcdHZhciBsZWF2aW5nID0gJGFuaW1hdGUubGVhdmUoJGVsZW1lbnQpO1xyXG5cclxuXHRcdFx0XHRcdFx0aWYgKGluc3RhbmNlcy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0XHRcdFx0XHRsZWF2aW5nLnRoZW4oKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0JGFuaW1hdGUubGVhdmUoJGJkKTtcclxuXHRcdFx0XHRcdFx0XHRcdCRib2R5LnJlbW92ZUNsYXNzKCd1ZXgtbW9kYWwtYWN0aXZlJyk7XHJcblx0XHRcdFx0XHRcdFx0XHRkZXN0cm95QW5kQ2xlYW4oaW5zdGFuY2UpO1xyXG5cdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdGluc3RhbmNlc1tpbnN0YW5jZXMubGVuZ3RoIC0gMV0uX2FjdGl2ZSh0cnVlKTtcclxuXHRcdFx0XHRcdFx0XHRkZXN0cm95QW5kQ2xlYW4oaW5zdGFuY2UpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRkZWZlcnJlZC5yZWplY3QocmVhc29uKTtcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRvbkRpc21pc3M6IGFjdGlvbiA9PiB7XHJcblx0XHRcdFx0XHRcdGluc3RhbmNlLl9kZWxlZ2F0ZXMucHVzaChhY3Rpb24pO1xyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdF9hY3RpdmU6IHZhbHVlID0+IHtcclxuXHRcdFx0XHRcdFx0aWYgKHZhbHVlKSBpbnN0YW5jZS5lbGVtZW50LnJlbW92ZUNsYXNzKCdpbmFjdGl2ZScpO1xyXG5cdFx0XHRcdFx0XHRlbHNlIGluc3RhbmNlLmVsZW1lbnQuYWRkQ2xhc3MoJ2luYWN0aXZlJyk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0aW5zdGFuY2VzLnB1c2goaW5zdGFuY2UpO1xyXG5cclxuXHRcdFx0dmFyIHJlc29sdmUgPSBhbmd1bGFyLmV4dGVuZCh7fSxcclxuXHRcdFx0XHRvcHRpb25zLmxvY2FscyB8fCB7fSwge1xyXG5cdFx0XHRcdFx0bW9kYWw6IGluc3RhbmNlXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdHZhciB0ZW1wbGF0ZVByb21pc2UgPSBnZXRUZW1wbGF0ZVByb21pc2Uob3B0aW9ucywgcmVzb2x2ZSk7XHJcblxyXG5cdFx0XHR0ZW1wbGF0ZVByb21pc2UudGhlbih0ZW1wbGF0ZSA9PiB7XHJcblx0XHRcdFx0JGVsZW1lbnQuZmluZCgnLnVleC1tb2RhbC1jb250ZW50JykuaHRtbCh0ZW1wbGF0ZSk7XHJcblxyXG5cdFx0XHRcdCRjb21waWxlKCRlbGVtZW50KShhbmd1bGFyLmV4dGVuZChzY29wZSwge1xyXG5cdFx0XHRcdFx0JHRpdGxlOiBvcHRpb25zLnRpdGxlIHx8ICdNb2RhbCcsXHJcblx0XHRcdFx0XHQkbW9kYWw6IGluc3RhbmNlLFxyXG5cdFx0XHRcdFx0JHJlc29sdmU6IHJlc29sdmUsXHJcblx0XHRcdFx0XHRfdHJ5RGlzbWlzczogZXZlbnQgPT4ge1xyXG5cdFx0XHRcdFx0XHRpZiAoc2NvcGUuJG1vZGFsLmNhbkJlRGlzbWlzc2VkRnJvbUJEICYmICQoZXZlbnQudGFyZ2V0KS5pcygnLnVleC1tb2RhbCcpKSB7XHJcblx0XHRcdFx0XHRcdFx0c2NvcGUuJG1vZGFsLmRpc21pc3MoKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pKTtcclxuXHJcblx0XHRcdFx0aWYgKGluc3RhbmNlcy5sZW5ndGggIT09IDEpIHtcclxuXHRcdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgaW5zdGFuY2VzLmxlbmd0aCAtIDE7IGkrKykge1xyXG5cdFx0XHRcdFx0XHRpbnN0YW5jZXNbaV0uX2FjdGl2ZShmYWxzZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQkYm9keS5hZGRDbGFzcygndWV4LW1vZGFsLWFjdGl2ZScpO1xyXG5cdFx0XHRcdHZhciBiZEVudGVyaW5nO1xyXG5cdFx0XHRcdGlmIChpbnN0YW5jZXMubGVuZ3RoID09PSAxKSB7XHJcblx0XHRcdFx0XHRiZEVudGVyaW5nID0gJGFuaW1hdGUuZW50ZXIoJGJkLCAkYm9keSwgJGJvZHkuY2hpbGRyZW4oKS5sYXN0KCkpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHQoYmRFbnRlcmluZyB8fCAkcS53aGVuKCkpLnRoZW4oKCkgPT4ge1xyXG5cdFx0XHRcdFx0JGFuaW1hdGUuZW50ZXIoJGVsZW1lbnQsICRib2R5LCAkYm9keS5jaGlsZHJlbigpLmxhc3QoKSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0sICgpID0+IHtcclxuXHRcdFx0XHRkZXN0cm95QW5kQ2xlYW4oaW5zdGFuY2UpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0X2luc3RhbmNlOiBpbnN0YW5jZSxcclxuXHRcdFx0XHRwcm9taXNlOiBkZWZlcnJlZC5wcm9taXNlLFxyXG5cdFx0XHRcdHNjb3BlOiBpbnN0YW5jZS5zY29wZSxcclxuXHRcdFx0XHRlbGVtZW50OiBpbnN0YW5jZS4kZWxlbWVudCxcclxuXHRcdFx0XHRkaXNtaXNzOiBpbnN0YW5jZS5kaXNtaXNzXHJcblx0XHRcdH07XHJcblx0XHR9O1xyXG5cclxuXHRcdGZ1bmMuY29uZmlybSA9ICgpID0+IHtcclxuXHRcdFx0dmFyIG9wdGlvbnMgPSB7XHJcblx0XHRcdFx0dGl0bGU6ICdDb25maXJtJyxcclxuXHRcdFx0XHR0ZW1wbGF0ZTogJ0FyZSB5b3Ugc3VyZT8nLFxyXG5cdFx0XHRcdGRhbmdlcjogZmFsc2UsXHJcblx0XHRcdFx0eWVzVGV4dDogJ1llcycsXHJcblx0XHRcdFx0bm9UZXh0OiAnQ2FuY2VsJyxcclxuXHRcdFx0XHRpbmZvOiBmYWxzZVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0dmFyIHJldCA9IHtcclxuXHRcdFx0XHRvcGVuOiBwYXJlbnRTY29wZSA9PiB7XHJcblx0XHRcdFx0XHR2YXIgc2NvcGUgPSAocGFyZW50U2NvcGUgfHwgJHJvb3RTY29wZSkuJG5ldygpLFxyXG5cdFx0XHRcdFx0XHRpbnN0YW5jZSA9IGZ1bmMoe1xyXG5cdFx0XHRcdFx0XHRcdHRpdGxlOiBvcHRpb25zLnRpdGxlLFxyXG5cdFx0XHRcdFx0XHRcdHNjb3BlOiBhbmd1bGFyLmV4dGVuZChzY29wZSwge1xyXG5cdFx0XHRcdFx0XHRcdFx0ZGFuZ2VyOiBvcHRpb25zLmRhbmdlcixcclxuXHRcdFx0XHRcdFx0XHRcdHllc1RleHQ6IG9wdGlvbnMueWVzVGV4dCxcclxuXHRcdFx0XHRcdFx0XHRcdG5vVGV4dDogb3B0aW9ucy5ub1RleHQsXHJcblx0XHRcdFx0XHRcdFx0XHRpbmZvOiBvcHRpb25zLmluZm8sXHJcblx0XHRcdFx0XHRcdFx0XHRyZXNvbHZlOiB2ID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0aW5zdGFuY2UuX2luc3RhbmNlLnJlc29sdmUodik7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fSksXHJcblx0XHRcdFx0XHRcdFx0dGVtcGxhdGU6ICdcXFxyXG48ZGl2IGNsYXNzPVwidWV4LW1vZGFsLXQtY29uZmlybVwiPlxcXHJcblx0PGRpdiBjbGFzcz1cInVleC1tb2RhbC10LWNvbmZpcm0tY29udGVudFwiPicgKyBvcHRpb25zLnRlbXBsYXRlICsgJ1xcXHJcblx0PC9kaXY+XFxcclxuXHQ8ZGl2IGNsYXNzPVwidWV4LW1vZGFsLXQtY29uZmlybS1hY3Rpb25zXCI+XFxcclxuXHRcdDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiYnRuIGJ0bi1kZWZhdWx0IG5vLWJ0blwiIG5nLWNsaWNrPVwiJG1vZGFsLmRpc21pc3MoKVwiIG5nLWlmPVwiOjohaW5mb1wiPnt7Ojpub1RleHR9fTwvYnV0dG9uPlxcXHJcblx0XHQ8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImJ0biB5ZXMtYnRuXCIgbmctY2xpY2s9XCJyZXNvbHZlKClcIiBuZy1jbGFzcz1cIntkYW5nZXI6IGRhbmdlciwgXFwnYnRuLWRhbmdlclxcJzogZGFuZ2VyLCBcXCdidG4tcHJpbWFyeVxcJzogIWRhbmdlcn1cIj57ezo6eWVzVGV4dH19PC9idXR0b24+XFxcclxuXHQ8L2Rpdj5cXFxyXG48L2Rpdj4nXHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRcdGluc3RhbmNlLnByb21pc2UudGhlbihudWxsLCAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdHNjb3BlLiRkZXN0cm95KCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHRyZXR1cm4gaW5zdGFuY2UucHJvbWlzZTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHRpdGxlOiB2ID0+IHtcclxuXHRcdFx0XHRcdG9wdGlvbnMudGl0bGUgPSB2O1xyXG5cdFx0XHRcdFx0cmV0dXJuIHJldDtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGRhbmdlcjogKCkgPT4ge1xyXG5cdFx0XHRcdFx0b3B0aW9ucy5kYW5nZXIgPSB0cnVlO1xyXG5cdFx0XHRcdFx0cmV0dXJuIHJldDtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHllczogdiA9PiB7XHJcblx0XHRcdFx0XHRvcHRpb25zLnllc1RleHQgPSB2O1xyXG5cdFx0XHRcdFx0cmV0dXJuIHJldDtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG5vOiB2ID0+IHtcclxuXHRcdFx0XHRcdG9wdGlvbnMubm9UZXh0ID0gdjtcclxuXHRcdFx0XHRcdHJldHVybiByZXQ7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR0ZXh0OiB2ID0+IHtcclxuXHRcdFx0XHRcdG9wdGlvbnMudGVtcGxhdGUgPSB2O1xyXG5cdFx0XHRcdFx0cmV0dXJuIHJldDtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHRlbXBsYXRlOiB2ID0+IHtcclxuXHRcdFx0XHRcdG9wdGlvbnMudGVtcGxhdGUgPSB2O1xyXG5cdFx0XHRcdFx0cmV0dXJuIHJldDtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGNsYXNzZXM6IHYgPT4ge1xyXG5cdFx0XHRcdFx0b3B0aW9ucy5jbGFzc2VzID0gdjtcclxuXHRcdFx0XHRcdHJldHVybiByZXQ7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRpbmZvOiAoKSA9PiB7XHJcblx0XHRcdFx0XHRvcHRpb25zLmluZm8gPSB0cnVlO1xyXG5cdFx0XHRcdFx0cmV0dXJuIHJldDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRyZXR1cm4gcmV0O1xyXG5cdFx0fTtcclxuXHJcblx0XHRmdW5jLmluZm8gPSAoKSA9PiB7XHJcblx0XHRcdHJldHVybiBmdW5jLmNvbmZpcm0oKS5pbmZvKCkudGl0bGUoJ0luZm8nKS55ZXMoJ09LJyk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHJldHVybiBmdW5jO1xyXG5cclxuXHRcdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG5cdFx0ZnVuY3Rpb24gZGlzbWlzc1RvcE1vZGFsKGUpIHtcclxuXHRcdFx0aWYgKGluc3RhbmNlcy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0dmFyIHRvcCA9IGluc3RhbmNlc1tpbnN0YW5jZXMubGVuZ3RoIC0gMV07XHJcblx0XHRcdHRvcC5kaXNtaXNzKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2V0Q2xhc3Nlc09wdGlvbihvcHRpb25zKSB7XHJcblx0XHRcdHJldHVybiBvcHRpb25zLmNsYXNzZXMgfHwgb3B0aW9uc1snY2xhc3MnXTtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBnZXRXcmFwcGVyQ2xhc3NlcyhvcHRpb25zKSB7XHJcblx0XHRcdHZhciBjbGFzc2VzID0gZ2V0Q2xhc3Nlc09wdGlvbihvcHRpb25zKTtcclxuXHRcdFx0cmV0dXJuIGNsYXNzZXMgPyAnICcgKyBjbGFzc2VzIDogJyc7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2V0VGVtcGxhdGVNb2RhbENvbnRhaW5lcihvcHRpb25zKSB7XHJcblx0XHRcdHJldHVybiAnXFxcclxuPGRpdiBjbGFzcz1cInVleC1tb2RhbCcgKyBnZXRXcmFwcGVyQ2xhc3NlcyhvcHRpb25zKSArICdcIiBuZy1jbGljaz1cIl90cnlEaXNtaXNzKCRldmVudClcIj5cXFxyXG5cdDxkaXYgY2xhc3M9XCJ1ZXgtbW9kYWwtY29udGFpbmVyXCI+XFxcclxuXHRcdDxkaXYgY2xhc3M9XCJ1ZXgtbW9kYWwtaGVhZGVyXCI+XFxcclxuXHRcdFx0PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJ1ZXgtbW9kYWwtY2xvc2VcIiBuZy1jbGljaz1cIiRtb2RhbC5kaXNtaXNzKClcIj5cXFxyXG5cdFx0XHRcdDx1ZXgtaWNvbiBpY29uPVwiY2xvc2VcIj48L3VleC1pY29uPlxcXHJcblx0XHRcdDwvYnV0dG9uPlxcXHJcblx0XHRcdDxoMj57eyR0aXRsZX19PC9oMj5cXFxyXG5cdFx0PC9kaXY+XFxcclxuXHRcdDxkaXYgY2xhc3M9XCJ1ZXgtbW9kYWwtY29udGVudFwiPjwvZGl2PlxcXHJcblx0PC9kaXY+XFxcclxuPC9kaXY+JztcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiB0ZW1wbGF0ZUZvckNvbXBvbmVudChuYW1lLCByZXNvbHZlKSB7XHJcblx0XHRcdHZhciB0ID0gJzwnICsgbmFtZTtcclxuXHRcdFx0aWYgKHJlc29sdmUpIHtcclxuXHRcdFx0XHRmb3IgKHZhciBwIGluIHJlc29sdmUpIHtcclxuXHRcdFx0XHRcdHZhciBwTmFtZSA9IHVleFV0aWwuY2FtZWxUb0Rhc2gocCk7XHJcblx0XHRcdFx0XHR0ICs9ICcgJyArIHBOYW1lICsgJz1cIjo6JHJlc29sdmUuJyArIHAgKyAnXCInO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHR0ICs9ICc+PC8nICsgbmFtZSArICc+JztcclxuXHRcdFx0cmV0dXJuIHQ7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2V0VGVtcGxhdGVQcm9taXNlKG9wdGlvbnMsIHJlc29sdmUpIHtcclxuXHRcdFx0aWYgKG9wdGlvbnMuY29tcG9uZW50KSB7XHJcblx0XHRcdFx0dmFyIGNvbXBvbmVudE5hbWUgPSB1ZXhVdGlsLmNhbWVsVG9EYXNoKG9wdGlvbnMuY29tcG9uZW50KTtcclxuXHRcdFx0XHRyZXR1cm4gJHEud2hlbih0ZW1wbGF0ZUZvckNvbXBvbmVudChcclxuXHRcdFx0XHRcdGNvbXBvbmVudE5hbWUsXHJcblx0XHRcdFx0XHRyZXNvbHZlKSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBvcHRpb25zLnRlbXBsYXRlID8gJHEud2hlbihvcHRpb25zLnRlbXBsYXRlLnRyaW0oKSkgOlxyXG5cdFx0XHRcdCR0ZW1wbGF0ZVJlcXVlc3QoYW5ndWxhci5pc0Z1bmN0aW9uKG9wdGlvbnMudGVtcGxhdGVVcmwpID9cclxuXHRcdFx0XHRcdG9wdGlvbnMudGVtcGxhdGVVcmwoKSA6IG9wdGlvbnMudGVtcGxhdGVVcmwpO1xyXG5cdFx0fVxyXG5cdH1cclxufSkoKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHRcInVzZSBzdHJpY3RcIjtcclxuXHJcblx0YW5ndWxhclxyXG5cdFx0Lm1vZHVsZSgnbXIudWV4JylcclxuXHRcdC5kaXJlY3RpdmUoJ3VleE1vZGFsJywgbW9kYWwpXHJcblx0XHQuZGlyZWN0aXZlKCd1ZXhNb2RhbENvbmZpcm0nLCBtb2RhbENvbmZpcm0pO1xyXG5cclxuXHRmdW5jdGlvbiBtb2RhbCh1ZXhNb2RhbCkge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0cmVzdHJpY3Q6ICdFJyxcclxuXHRcdFx0c2NvcGU6IHRydWUsXHJcblx0XHRcdHRlbXBsYXRlOiAoJGVsZW1lbnQsICRhdHRycykgPT4ge1xyXG5cdFx0XHRcdCRhdHRycy4kaHRtbCA9ICRlbGVtZW50Lmh0bWwoKTtcclxuXHRcdFx0XHQkZWxlbWVudC5lbXB0eSgpO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRiaW5kVG9Db250cm9sbGVyOiB7XHJcblx0XHRcdFx0ZGVsZWdhdGU6ICc9J1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRjb250cm9sbGVyQXM6ICckdWV4TW9kYWxDdHJsJyxcclxuXHRcdFx0Y29udHJvbGxlcjogZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQsICRhdHRycykge1xyXG5cdFx0XHRcdHZhciB0aXRsZSA9ICRhdHRycy50aXRsZSxcclxuXHRcdFx0XHRcdGNsYXNzZXMgPSAkYXR0cnNbJ2NsYXNzJ10sXHJcblx0XHRcdFx0XHR0ZW1wbGF0ZSA9ICRhdHRycy4kaHRtbDtcclxuXHJcblx0XHRcdFx0dGhpcy5kZWxlZ2F0ZSA9IHtcclxuXHRcdFx0XHRcdG9wZW46IG9wdGlvbnMgPT4ge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gdWV4TW9kYWwoYW5ndWxhci5leHRlbmQoe1xyXG5cdFx0XHRcdFx0XHRcdHNjb3BlOiAkc2NvcGUsXHJcblx0XHRcdFx0XHRcdFx0dGl0bGU6IHRpdGxlLFxyXG5cdFx0XHRcdFx0XHRcdGNsYXNzZXM6IGNsYXNzZXMsXHJcblx0XHRcdFx0XHRcdFx0dGVtcGxhdGU6IHRlbXBsYXRlXHJcblx0XHRcdFx0XHRcdH0sIG9wdGlvbnMpKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gbW9kYWxDb25maXJtKHVleE1vZGFsKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRyZXN0cmljdDogJ0UnLFxyXG5cdFx0XHRzY29wZTogdHJ1ZSxcclxuXHRcdFx0dGVtcGxhdGU6ICgkZWxlbWVudCwgJGF0dHJzKSA9PiB7XHJcblx0XHRcdFx0JGF0dHJzLiRodG1sID0gJGVsZW1lbnQuaHRtbCgpO1xyXG5cdFx0XHRcdCRlbGVtZW50LmVtcHR5KCk7XHJcblx0XHRcdH0sXHJcblx0XHRcdGJpbmRUb0NvbnRyb2xsZXI6IHtcclxuXHRcdFx0XHRkZWxlZ2F0ZTogJz0nXHJcblx0XHRcdH0sXHJcblx0XHRcdGNvbnRyb2xsZXJBczogJyR1ZXhNb2RhbENvbmZpcm1DdHJsJyxcclxuXHRcdFx0Y29udHJvbGxlcjogZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQsICRhdHRycykge1xyXG5cdFx0XHRcdHZhciB0aXRsZSA9ICRhdHRycy50aXRsZSxcclxuXHRcdFx0XHRcdGNsYXNzZXMgPSAkYXR0cnNbJ2NsYXNzJ10sXHJcblx0XHRcdFx0XHR0ZW1wbGF0ZSA9ICRhdHRycy4kaHRtbDtcclxuXHJcblx0XHRcdFx0dGhpcy5kZWxlZ2F0ZSA9IHtcclxuXHRcdFx0XHRcdG9wZW46ICgpID0+IHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIHVleE1vZGFsLmNvbmZpcm0oKVxyXG5cdFx0XHRcdFx0XHRcdC5jbGFzc2VzKGNsYXNzZXMpXHJcblx0XHRcdFx0XHRcdFx0LnRpdGxlKHRpdGxlKVxyXG5cdFx0XHRcdFx0XHRcdC50ZW1wbGF0ZSh0ZW1wbGF0ZSlcclxuXHRcdFx0XHRcdFx0XHQub3Blbigkc2NvcGUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG59KSgpO1xyXG4iLCIoZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0YW5ndWxhclxyXG5cdFx0Lm1vZHVsZSgnbXIudWV4JylcclxuXHRcdC5wcm92aWRlcigndWV4UCcsIHVleFBQcm92aWRlcilcclxuXHRcdC5kaXJlY3RpdmUoJ3VleFAnLCB1ZXhQKVxyXG5cdFx0LmRpcmVjdGl2ZSgndWV4UFNyYycsIHVleFBTcmMpXHJcblx0XHQuZGlyZWN0aXZlKCd1ZXhQUnVubmluZycsIHVleFBSdW5uaW5nKVxyXG5cdFx0LmRpcmVjdGl2ZSgndWV4UFN1Y2Nlc3MnLCB1ZXhQU3VjY2VzcylcclxuXHRcdC5kaXJlY3RpdmUoJ3VleFBFcnJvcicsIHVleFBFcnJvcilcclxuXHRcdC5kaXJlY3RpdmUoJ3VleFBTdGF0dXMnLCB1ZXhQU3RhdHVzKVxyXG5cdFx0LmRpcmVjdGl2ZSgndWV4UEJ0bicsIHVleFBCdG4pO1xyXG5cclxuXHRmdW5jdGlvbiB1ZXhQUHJvdmlkZXIoKSB7XHJcblx0XHR0aGlzLm9wdHMgPSB7XHJcblx0XHRcdHN1Y2Nlc3NJbnRlcnZhbDogMTAwMCxcclxuXHRcdFx0ZXJyb3JJbnRlcnZhbDogMTAwMFxyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLiRnZXQgPSAoKSA9PiB0aGlzLm9wdHM7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiB1ZXhQKCRwYXJzZSwgdWV4UCkge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0cmVzdHJpY3Q6ICdBJyxcclxuXHRcdFx0c2NvcGU6IHRydWUsXHJcblx0XHRcdGNvbnRyb2xsZXI6IGNvbnRyb2xsZXIsXHJcblx0XHRcdGNvbnRyb2xsZXJBczogJyR1ZXhQJ1xyXG5cdFx0fTtcclxuXHJcblx0XHRmdW5jdGlvbiBjb250cm9sbGVyKCRzY29wZSwgJGVsZW1lbnQsICRhdHRycywgJHRpbWVvdXQsICRxKSB7XHJcblx0XHRcdHZhciBwcm9taXNlLFxyXG5cdFx0XHRcdGZuID0gJHBhcnNlKCRhdHRycy51ZXhQKSxcclxuXHRcdFx0XHRvcHRpb25zID0gJHNjb3BlLiRldmFsKCRhdHRycy51ZXhQT3B0cykgfHwge30sXHJcblx0XHRcdFx0JCRwcm9taXNlcyA9IHt9O1xyXG5cclxuXHRcdFx0dGhpcy5ydW5uaW5nID0gZmFsc2U7XHJcblx0XHRcdHRoaXMuc3VjY2VzcyA9IGZhbHNlO1xyXG5cdFx0XHR0aGlzLmVycm9yID0gZmFsc2U7XHJcblxyXG5cdFx0XHRpZiAoJGVsZW1lbnQuaXMoJ2Zvcm0nKSAmJiAkYXR0cnMudWV4UFNyYyA9PT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0JGVsZW1lbnQub24oJ3N1Ym1pdCcsIGUgPT4ge1xyXG5cdFx0XHRcdFx0JHNjb3BlLiRhcHBseSh0aGlzLnJ1bihlKSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGZ1bmN0aW9uIGdldExvY2FscyhhcmdzKSB7XHJcblx0XHRcdFx0aWYgKCFhcmdzIHx8IGFyZ3MubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdCRldmVudDogYXJnc1swXVxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHZhciBpbnRlcnBvbGF0ZSA9IChuYW1lLCBpbnRlcnZhbCkgPT4ge1xyXG5cdFx0XHRcdHRoaXNbbmFtZV0gPSB0cnVlO1xyXG5cdFx0XHRcdHZhciBwID0gJCRwcm9taXNlc1tuYW1lXSA9ICR0aW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHRcdGlmICgkJHByb21pc2VzW25hbWVdID09PSBwKSB7XHJcblx0XHRcdFx0XHRcdHRoaXNbbmFtZV0gPSBmYWxzZTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9LCBpbnRlcnZhbCk7XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHR0aGlzLnJ1biA9IGUgPT4ge1xyXG5cdFx0XHRcdGlmIChlLmlzRGVmYXVsdFByZXZlbnRlZCgpKSB7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdFx0dmFyIHAgPSBmbigkc2NvcGUsIGdldExvY2Fscyhhcmd1bWVudHMpKTtcclxuXHRcdFx0XHRpZiAocCAmJiBwLmZpbmFsbHkpIHtcclxuXHRcdFx0XHRcdHByb21pc2UgPSBwO1xyXG5cdFx0XHRcdFx0dGhpcy5ydW5uaW5nID0gdHJ1ZTtcclxuXHRcdFx0XHRcdHByb21pc2UudGhlbigoKSA9PiB7XHJcblx0XHRcdFx0XHRcdGludGVycG9sYXRlKCdzdWNjZXNzJywgb3B0aW9ucy5zdWNjZXNzSW50ZXJ2YWwgfHwgdWV4UC5zdWNjZXNzSW50ZXJ2YWwpO1xyXG5cdFx0XHRcdFx0fSwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRpbnRlcnBvbGF0ZSgnZXJyb3InLCBvcHRpb25zLmVycm9ySW50ZXJ2YWwgfHwgdWV4UC5lcnJvckludGVydmFsKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0cHJvbWlzZS5maW5hbGx5KCgpID0+IHtcclxuXHRcdFx0XHRcdFx0aWYgKHAgIT09IHByb21pc2UpIHJldHVybjtcclxuXHRcdFx0XHRcdFx0dGhpcy5ydW5uaW5nID0gZmFsc2U7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH07XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiB1ZXhQU3JjKCkge1xyXG5cdFx0ZnVuY3Rpb24gZGV0ZXJtaW5lRXZlbnQoJGVsZW1lbnQsIHZhbHVlKSB7XHJcblx0XHRcdGlmICh2YWx1ZSAmJiBhbmd1bGFyLmlzU3RyaW5nKHZhbHVlKSkgcmV0dXJuIHZhbHVlO1xyXG5cdFx0XHRpZiAoJGVsZW1lbnQuaXMoJ2Zvcm0nKSkgcmV0dXJuICdzdWJtaXQnO1xyXG5cdFx0XHRyZXR1cm4gJ2NsaWNrJztcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRyZXN0cmljdDogJ0EnLFxyXG5cdFx0XHRyZXF1aXJlOiAnXnVleFAnLFxyXG5cdFx0XHRzY29wZTogZmFsc2UsXHJcblx0XHRcdGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMsIGN0cmwpIHtcclxuXHRcdFx0XHR2YXIgZXZlbnQgPSBkZXRlcm1pbmVFdmVudCgkZWxlbWVudCwgJGF0dHJzLnVleFBTcmMpO1xyXG5cdFx0XHRcdCRlbGVtZW50Lm9uKGV2ZW50LCBlID0+IHtcclxuXHRcdFx0XHRcdGlmICgkZWxlbWVudC5hdHRyKCdkaXNhYmxlZCcpKSB7XHJcblx0XHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQkc2NvcGUuJGFwcGx5KGN0cmwucnVuKGUpKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHVleFBDb21tb24oa2luZCkge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0cmVzdHJpY3Q6ICdBJyxcclxuXHRcdFx0cmVxdWlyZTogJ151ZXhQJyxcclxuXHRcdFx0c2NvcGU6IHt9LFxyXG5cdFx0XHR0cmFuc2NsdWRlOiB0cnVlLFxyXG5cdFx0XHR0ZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJ1ZXgtcC0nICsga2luZCArICdcIiBuZy1zaG93PVwic2hvd25cIiBuZy10cmFuc2NsdWRlPjwvZGl2PicsXHJcblx0XHRcdGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMsIGN0cmwpIHtcclxuXHRcdFx0XHQkZWxlbWVudC5hZGRDbGFzcygndWV4LXAtJyArIGtpbmQpO1xyXG5cdFx0XHRcdCRzY29wZS4kd2F0Y2goKCkgPT4gY3RybFtraW5kXSwgKG4sIG8pID0+IHtcclxuXHRcdFx0XHRcdCRzY29wZS5zaG93biA9ICEhbjtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHVleFBSdW5uaW5nKCkge1xyXG5cdFx0cmV0dXJuIHVleFBDb21tb24oJ3J1bm5pbmcnKTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHVleFBTdWNjZXNzKCkge1xyXG5cdFx0cmV0dXJuIHVleFBDb21tb24oJ3N1Y2Nlc3MnKTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHVleFBFcnJvcigpIHtcclxuXHRcdHJldHVybiB1ZXhQQ29tbW9uKCdlcnJvcicpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gdWV4UFN0YXR1cygpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHJlc3RyaWN0OiAnRUEnLFxyXG5cdFx0XHRzY29wZToge30sXHJcblx0XHRcdHRlbXBsYXRlOiAnPHNwYW4gbmctc2hvdz1cInN1Y2Nlc3MgfHwgZXJyb3JcIiBjbGFzcz1cInVleC1wLXN0YXR1c1wiIG5nLWNsYXNzPVwiY2xhc3Nlc1wiPnt7dGV4dH19PC9zcGFuPicsXHJcblx0XHRcdHJlcXVpcmU6ICdedWV4UCcsXHJcblx0XHRcdGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMsIGN0cmwpIHtcclxuXHRcdFx0XHR2YXIgc3VjY2Vzc1RleHQgPSAkYXR0cnMuc3VjY2VzcyB8fCAnU3VjY2VzcycsXHJcblx0XHRcdFx0XHRlcnJvclRleHQgPSAkYXR0cnMuZXJyb3IgfHwgJ0Vycm9yJztcclxuXHRcdFx0XHQkc2NvcGUuY2xhc3NlcyA9ICcnO1xyXG5cclxuXHRcdFx0XHQkc2NvcGUuJHdhdGNoKCgpID0+IGN0cmwuc3VjY2VzcywgKG4sIG8pID0+IHtcclxuXHRcdFx0XHRcdCRzY29wZS5zdWNjZXNzID0gbjtcclxuXHRcdFx0XHRcdGlmIChuKSB7XHJcblx0XHRcdFx0XHRcdCRzY29wZS5jbGFzc2VzID0gJ3VleC1wLXN1Y2Nlc3MnO1xyXG5cdFx0XHRcdFx0XHQkc2NvcGUudGV4dCA9IHN1Y2Nlc3NUZXh0O1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQkc2NvcGUuJHdhdGNoKCgpID0+IGN0cmwuZXJyb3IsIChuLCBvKSA9PiB7XHJcblx0XHRcdFx0XHQkc2NvcGUuZXJyb3IgPSBuO1xyXG5cdFx0XHRcdFx0aWYgKG4pIHtcclxuXHRcdFx0XHRcdFx0JHNjb3BlLmNsYXNzZXMgPSAndWV4LXAtZXJyb3InO1xyXG5cdFx0XHRcdFx0XHQkc2NvcGUudGV4dCA9IGVycm9yVGV4dDtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHVleFBCdG4oKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRyZXN0cmljdDogJ0EnLFxyXG5cdFx0XHRyZXF1aXJlOiAnXnVleFAnLFxyXG5cdFx0XHRsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzLCBjdHJsKSB7XHJcblx0XHRcdFx0dmFyIGlzT25lVGltZSA9ICRhdHRycy51ZXhQQnRuID09PSAnb25ldGltZSc7XHJcblx0XHRcdFx0JHNjb3BlLiR3YXRjaCgoKSA9PiBjdHJsLnJ1bm5pbmcsIChuLCBvKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAobikge1xyXG5cdFx0XHRcdFx0XHQkZWxlbWVudC5hdHRyKCdkaXNhYmxlZCcsICdkaXNhYmxlZCcpO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0aWYgKGN0cmwuZXJyb3IgfHwgIWlzT25lVGltZSkge1xyXG5cdFx0XHRcdFx0XHRcdCRlbGVtZW50LnJlbW92ZUF0dHIoJ2Rpc2FibGVkJyk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcbn0pKCk7XHJcbiIsIihmdW5jdGlvbiAoKSB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cclxuXHRhbmd1bGFyXHJcblx0XHQubW9kdWxlKCdtci51ZXgnKVxyXG5cdFx0LmZhY3RvcnkoJ3VleFBvcCcsIHBvcCk7XHJcblxyXG5cdGZ1bmN0aW9uIHBvcCgkcm9vdFNjb3BlLCAkY29tcGlsZSwgJGFuaW1hdGUsICR0ZW1wbGF0ZVJlcXVlc3QsICRxLCB1ZXhQb3NpdGlvbmluZ1Rocm90dGxlciwgdWV4UG9zaXRpb25lciwgJHRpbWVvdXQpIHtcclxuXHRcdHZhciBfaW5zdGFuY2UsXHJcblx0XHRcdCRib2R5ID0gJChkb2N1bWVudC5ib2R5KTtcclxuXHJcblx0XHQkYm9keS5vbigna2V5ZG93bicsIGUgPT4ge1xyXG5cdFx0XHRpZiAoIWUuaXNEZWZhdWx0UHJldmVudGVkKCkgJiYgZS53aGljaCA9PT0gMjcpIHtcclxuXHRcdFx0XHRkaXNtaXNzKGUpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHR1ZXhQb3NpdGlvbmluZ1Rocm90dGxlci5zdWJzY3JpYmUoY29udGV4dCA9PiB7XHJcblx0XHRcdGlmIChfaW5zdGFuY2UpIF9pbnN0YW5jZS5wb3NpdGlvbigpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gb3B0aW9uczpcclxuXHRcdC8vICAgc2NvcGVcclxuXHRcdC8vICAgcGxhY2VtZW50OiBbdG9wLCByaWdodCwgYm90dG9tLCBsZWZ0XSBbc3RhcnQsIGNlbnRlciwgZW5kXVxyXG5cdFx0Ly8gICBvZmZzZXRcclxuXHRcdC8vICAgdGFyZ2V0XHJcblx0XHQvLyAgIHRlbXBsYXRlIC0gdGVtcGxhdGVVcmxcclxuXHRcdC8vICAgbGF6eVxyXG5cdFx0Ly8gICBjbGFzc2VzXHJcblx0XHQvLyAgIGxvY2Fsc1xyXG5cdFx0Ly8gICBvblBvc2l0aW9uXHJcblx0XHQvL1xyXG5cdFx0dmFyIGZ1bmMgPSBvcHRpb25zID0+IHtcclxuXHRcdFx0dmFsaWRhdGUob3B0aW9ucyk7XHJcblxyXG5cdFx0XHR2YXIgJGVsZW1lbnQgPSAkKGdldFRlbXBsYXRlUG9wKG9wdGlvbnMpKSxcclxuXHRcdFx0XHRsaW5rZm47XHJcblxyXG5cdFx0XHR2YXIgY3JlYXRlU2NvcGUgPSAoKSA9PiB7XHJcblx0XHRcdFx0cmV0dXJuIChvcHRpb25zLnNjb3BlIHx8ICRyb290U2NvcGUpLiRuZXcoKTtcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHZhciBpbnN0YW5jZSA9IHtcclxuXHRcdFx0XHRfZGVsZWdhdGVzOiBbXSxcclxuXHRcdFx0XHR0YXJnZXQ6IGFuZ3VsYXIuZWxlbWVudChvcHRpb25zLnRhcmdldCksXHJcblx0XHRcdFx0b3BlbjogKCkgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKF9pbnN0YW5jZSAmJiBfaW5zdGFuY2UgIT09IGluc3RhbmNlKSB7XHJcblx0XHRcdFx0XHRcdF9pbnN0YW5jZS5kaXNtaXNzKCk7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0X2luc3RhbmNlID0gaW5zdGFuY2U7XHJcblxyXG5cdFx0XHRcdFx0dmFyIHRlbXBsYXRlUHJvbWlzZTtcclxuXHRcdFx0XHRcdGlmICghbGlua2ZuKSB7XHJcblx0XHRcdFx0XHRcdHRlbXBsYXRlUHJvbWlzZSA9IGdldFRlbXBsYXRlUHJvbWlzZShvcHRpb25zKS50aGVuKHRlbXBsYXRlID0+IHtcclxuXHRcdFx0XHRcdFx0XHQkZWxlbWVudC5maW5kKCcudWV4LXBvcC1jb250ZW50JykuaHRtbCh0ZW1wbGF0ZSk7XHJcblx0XHRcdFx0XHRcdFx0bGlua2ZuID0gJGNvbXBpbGUoJGVsZW1lbnQpO1xyXG5cdFx0XHRcdFx0XHR9LCAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0ZGVzdHJveUFuZENsZWFuKGluc3RhbmNlKTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHR0ZW1wbGF0ZVByb21pc2UgPSAkcS53aGVuKCk7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0cmV0dXJuIHRlbXBsYXRlUHJvbWlzZS50aGVuKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0dmFyIHNjb3BlID0gYW5ndWxhci5leHRlbmQoY3JlYXRlU2NvcGUoKSwge1xyXG5cdFx0XHRcdFx0XHRcdCRwb3A6IGluc3RhbmNlLFxyXG5cdFx0XHRcdFx0XHR9LCBvcHRpb25zLmxvY2FscyB8fCB7fSk7XHJcblxyXG5cdFx0XHRcdFx0XHRsaW5rZm4oc2NvcGUsICgkY2xvbmUsIHNjb3BlKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0aW5zdGFuY2Uuc2NvcGUgPSBzY29wZTtcclxuXHJcblx0XHRcdFx0XHRcdFx0c2NvcGUuJG9uKCckZGVzdHJveScsICgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdGluc3RhbmNlLmRpc21pc3MoKTtcclxuXHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0XHRpbnN0YW5jZS5lbGVtZW50ID0gaW5zdGFuY2UucG9wID0gJGNsb25lO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRpbnN0YW5jZS50YXJnZXQuYWRkQ2xhc3MoJ3VleC1wb3Atb3BlbicpO1xyXG5cdFx0XHRcdFx0XHRcdCRib2R5LmFkZENsYXNzKCd1ZXgtcG9wLWFjdGl2ZScpO1xyXG5cdFx0XHRcdFx0XHRcdCRhbmltYXRlLmVudGVyKCRjbG9uZSwgJGJvZHksICRib2R5LmNoaWxkcmVuKCkubGFzdCgpKTtcclxuXHRcdFx0XHRcdFx0XHRzY29wZS4kZXZhbEFzeW5jKCgpID0+IGluc3RhbmNlLnBvc2l0aW9uKCkpO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0ZGlzbWlzczogKCkgPT4ge1xyXG5cdFx0XHRcdFx0JGFuaW1hdGUubGVhdmUoaW5zdGFuY2UuZWxlbWVudCkudGhlbigoKSA9PiB7XHJcblx0XHRcdFx0XHRcdGluc3RhbmNlLnRhcmdldC5yZW1vdmVDbGFzcygndWV4LXBvcC1vcGVuJyk7XHJcblx0XHRcdFx0XHRcdCRib2R5LnJlbW92ZUNsYXNzKCd1ZXgtcG9wLWFjdGl2ZScpO1xyXG5cdFx0XHRcdFx0XHRkZXN0cm95QW5kQ2xlYW4oaW5zdGFuY2UpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRwb3NpdGlvbjogc3R1YiA9PiB7XHJcblx0XHRcdFx0XHR2YXIgdGFyZ2V0ID0gaW5zdGFuY2UudGFyZ2V0LFxyXG5cdFx0XHRcdFx0XHRwb3AgPSBpbnN0YW5jZS5wb3A7XHJcblxyXG5cdFx0XHRcdFx0dmFyIG8gPSBhbmd1bGFyLmV4dGVuZChvcHRpb25zLCB7XHJcblx0XHRcdFx0XHRcdHRhcmdldDogdGFyZ2V0LFxyXG5cdFx0XHRcdFx0XHRlbGVtZW50OiBwb3AsXHJcblx0XHRcdFx0XHRcdG1hcmdpbjogNVxyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0aWYgKHN0dWIpIHtcclxuXHRcdFx0XHRcdFx0by5zdHViID0gdHJ1ZTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdHZhciBjb250ZXh0ID0gdWV4UG9zaXRpb25lcihvKTtcclxuXHRcdFx0XHRcdGlmIChvcHRpb25zLm9uUG9zaXRpb24pIHtcclxuXHRcdFx0XHRcdFx0b3B0aW9ucy5vblBvc2l0aW9uKGNvbnRleHQpO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdHVleFBvc2l0aW9uZXIuYXBwbHkoY29udGV4dCk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRvbkRpc21pc3M6IGFjdGlvbiA9PiB7XHJcblx0XHRcdFx0XHRpbnN0YW5jZS5fZGVsZWdhdGVzLnB1c2goYWN0aW9uKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRpZiAoIW9wdGlvbnMubGF6eSkge1xyXG5cdFx0XHRcdGluc3RhbmNlLm9wZW4oKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIGluc3RhbmNlO1xyXG5cdFx0fTtcclxuXHJcblx0XHRyZXR1cm4gZnVuYztcclxuXHJcblx0XHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuXHRcdGZ1bmN0aW9uIHZhbGlkYXRlKG9wdGlvbnMpIHtcclxuXHRcdFx0aWYgKCFvcHRpb25zLnRlbXBsYXRlICYmICFvcHRpb25zLnRlbXBsYXRlVXJsKSB7XHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCd0ZW1wbGF0ZSBvciB0ZW1wbGF0ZVVybCBtdXN0IGJlIHByb3ZpZGVkLicpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gZGlzbWlzcyhlKSB7XHJcblx0XHRcdGlmIChfaW5zdGFuY2UpIHtcclxuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdFx0X2luc3RhbmNlLmRpc21pc3MoKTtcclxuXHRcdFx0XHQkcm9vdFNjb3BlLiRhcHBseUFzeW5jKCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBkZXN0cm95QW5kQ2xlYW4oaW5zdGFuY2UpIHtcclxuXHRcdFx0aW5zdGFuY2Uuc2NvcGUuJGRlc3Ryb3koKTtcclxuXHRcdFx0dmFyIGRlbGVnYXRlcyA9IGluc3RhbmNlLl9kZWxlZ2F0ZXM7XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZGVsZWdhdGVzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0ZGVsZWdhdGVzW2ldKCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChpbnN0YW5jZSA9PT0gX2luc3RhbmNlKSBfaW5zdGFuY2UgPSBudWxsO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGdldENsYXNzZXNPcHRpb24ob3B0aW9ucykge1xyXG5cdFx0XHRyZXR1cm4gb3B0aW9ucy5jbGFzc2VzIHx8IG9wdGlvbnNbJ2NsYXNzJ107XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2V0V3JhcHBlckNsYXNzZXMob3B0aW9ucykge1xyXG5cdFx0XHR2YXIgY2xhc3NlcyA9IGdldENsYXNzZXNPcHRpb24ob3B0aW9ucyk7XHJcblx0XHRcdHJldHVybiBjbGFzc2VzID8gJyAnICsgY2xhc3NlcyA6ICcnO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGdldFRlbXBsYXRlUG9wKG9wdGlvbnMpIHtcclxuXHRcdFx0cmV0dXJuICdcXFxyXG48ZGl2IGNsYXNzPVwidWV4LXBvcCcgKyBnZXRXcmFwcGVyQ2xhc3NlcyhvcHRpb25zKSArICdcIj5cXFxyXG5cdDxkaXYgY2xhc3M9XCJ1ZXgtcG9wLWJkXCIgbmctY2xpY2s9XCIkcG9wLmRpc21pc3MoKVwiPjwvZGl2PlxcXHJcblx0PGRpdiBjbGFzcz1cInVleC1wb3AtY29udGVudFwiPlxcXHJcblx0PC9kaXY+XFxcclxuPC9kaXY+JztcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBnZXRUZW1wbGF0ZVByb21pc2Uob3B0aW9ucykge1xyXG5cdFx0XHRyZXR1cm4gb3B0aW9ucy50ZW1wbGF0ZSA/ICRxLndoZW4ob3B0aW9ucy50ZW1wbGF0ZSkgOlxyXG5cdFx0XHRcdCR0ZW1wbGF0ZVJlcXVlc3QoYW5ndWxhci5pc0Z1bmN0aW9uKG9wdGlvbnMudGVtcGxhdGVVcmwpID9cclxuXHRcdFx0XHRcdG9wdGlvbnMudGVtcGxhdGVVcmwoKSA6IG9wdGlvbnMudGVtcGxhdGVVcmwpO1xyXG5cdFx0fVxyXG5cdH1cclxufSkoKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdGFuZ3VsYXJcclxuXHRcdC5tb2R1bGUoJ21yLnVleCcpXHJcblx0XHQuZGlyZWN0aXZlKCd1ZXhQb3BDb250YWluZXInLCBwb3BDb250YWluZXIpXHJcblx0XHQuZGlyZWN0aXZlKCd1ZXhQb3BUYXJnZXQnLCBwb3BUYXJnZXQpXHJcblx0XHQuZGlyZWN0aXZlKCd1ZXhQb3AnLCBwb3ApO1xyXG5cclxuXHRmdW5jdGlvbiBwb3BDb250YWluZXIoKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRyZXN0cmljdDogJ0EnLFxyXG5cdFx0XHRzY29wZTogZmFsc2UsXHJcblx0XHRcdGNvbnRyb2xsZXI6IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHR2YXIgX3RhcmdldEVsZW1lbnQ7XHJcblxyXG5cdFx0XHRcdHRoaXMucmVnaXN0ZXJUYXJnZXQgPSB0YXJnZXRFbGVtZW50ID0+IHtcclxuXHRcdFx0XHRcdF90YXJnZXRFbGVtZW50ID0gdGFyZ2V0RWxlbWVudDtcclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHR0aGlzLmdldFRhcmdldCA9ICgpID0+IF90YXJnZXRFbGVtZW50O1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gcG9wVGFyZ2V0KCkge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0cmVzdHJpY3Q6ICdBJyxcclxuXHRcdFx0c2NvcGU6IGZhbHNlLFxyXG5cdFx0XHRyZXF1aXJlOiB7XHJcblx0XHRcdFx0cG9wQ29udGFpbmVyOiAnXnVleFBvcENvbnRhaW5lcidcclxuXHRcdFx0fSxcclxuXHRcdFx0YmluZFRvQ29udHJvbGxlcjogdHJ1ZSxcclxuXHRcdFx0Y29udHJvbGxlckFzOiAnJHVleFBvcFRhcmdldEN0cmwnLFxyXG5cdFx0XHRjb250cm9sbGVyOiBmdW5jdGlvbiAoJGVsZW1lbnQpIHtcclxuXHRcdFx0XHR0aGlzLiRvbkluaXQgPSAoKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLnBvcENvbnRhaW5lci5yZWdpc3RlclRhcmdldCgkZWxlbWVudCk7XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHBvcCh1ZXhQb3ApIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHJlc3RyaWN0OiAnRScsXHJcblx0XHRcdHRlcm1pbmFsOiB0cnVlLFxyXG5cdFx0XHRzY29wZTogdHJ1ZSxcclxuXHRcdFx0cmVxdWlyZToge1xyXG5cdFx0XHRcdHBvcENvbnRhaW5lcjogJ151ZXhQb3BDb250YWluZXInXHJcblx0XHRcdH0sXHJcblx0XHRcdGJpbmRUb0NvbnRyb2xsZXI6IHtcclxuXHRcdFx0XHRkZWxlZ2F0ZTogJz0/J1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRjb250cm9sbGVyQXM6ICckdWV4UG9wQ3RybCcsXHJcblx0XHRcdGNvbnRyb2xsZXI6IGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMpIHtcclxuXHRcdFx0XHR2YXIgdGFyZ2V0LFxyXG5cdFx0XHRcdFx0Y2xhc3NlcyA9ICRhdHRyc1snY2xhc3MnXSxcclxuXHRcdFx0XHRcdHRlbXBsYXRlID0gJGVsZW1lbnQuaHRtbCgpLFxyXG5cdFx0XHRcdFx0b24gPSAkYXR0cnMub24gfHwgJ2NsaWNrJztcclxuXHJcblx0XHRcdFx0dmFyIHNob3dQb3AgPSAoKSA9PiB7XHJcblx0XHRcdFx0XHR1ZXhQb3Aoe1xyXG5cdFx0XHRcdFx0XHRzY29wZTogJHNjb3BlLFxyXG5cdFx0XHRcdFx0XHR0YXJnZXQ6IHRhcmdldCxcclxuXHRcdFx0XHRcdFx0cGxhY2VtZW50OiAkYXR0cnMucGxhY2VtZW50LFxyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBjbGFzc2VzLFxyXG5cdFx0XHRcdFx0XHR0ZW1wbGF0ZTogdGVtcGxhdGVcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdHRoaXMuJG9uSW5pdCA9ICgpID0+IHtcclxuXHRcdFx0XHRcdHRhcmdldCA9IHRoaXMucG9wQ29udGFpbmVyLmdldFRhcmdldCgpO1xyXG5cclxuXHRcdFx0XHRcdGlmIChvbiA9PT0gJ2NsaWNrJykge1xyXG5cdFx0XHRcdFx0XHR0YXJnZXQub24oJ2NsaWNrJywgKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdHNob3dQb3AoKTtcclxuXHRcdFx0XHRcdFx0XHQkc2NvcGUuJGFwcGx5QXN5bmMoKTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9IGVsc2UgaWYgKG9uID09PSAnaG92ZXInKSB7XHJcblx0XHRcdFx0XHRcdHRhcmdldC5vbignbW91c2VlbnRlcicsICgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRzaG93UG9wKCk7XHJcblx0XHRcdFx0XHRcdFx0JHNjb3BlLiRhcHBseUFzeW5jKCk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdHRoaXMuZGVsZWdhdGUgPSB7XHJcblx0XHRcdFx0XHRvcGVuOiAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdHNob3dQb3AoKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHR0aGlzLiRwb3N0TGluayA9ICgpID0+IHtcclxuXHRcdFx0XHRcdCRlbGVtZW50LnJlbW92ZUNsYXNzKCk7XHJcblx0XHRcdFx0XHQkZWxlbWVudC5lbXB0eSgpO1xyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG59KSgpO1xyXG4iLCIoZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0YW5ndWxhclxyXG5cdFx0Lm1vZHVsZSgnbXIudWV4JylcclxuXHRcdC5mYWN0b3J5KCd1ZXhQb3B0aXAnLCBwb3B0aXApO1xyXG5cclxuXHRmdW5jdGlvbiBwb3B0aXAoJHJvb3RTY29wZSwgJGFuaW1hdGUsICRjb21waWxlLCB1ZXhQb3NpdGlvbmVyKSB7XHJcblx0XHR2YXIgJGJvZHkgPSAkKGRvY3VtZW50LmJvZHkpO1xyXG5cclxuXHRcdC8vIG9wdGlvbnM6XHJcblx0XHQvLyAgIHNjb3BlXHJcblx0XHQvLyAgIHBsYWNlbWVudDogW3RvcCwgcmlnaHQsIGJvdHRvbSwgbGVmdF0gW3N0YXJ0LCBjZW50ZXIsIGVuZF1cclxuXHRcdC8vICAgb2Zmc2V0XHJcblx0XHQvLyAgIHRhcmdldFxyXG5cdFx0Ly8gICB0ZW1wbGF0ZVxyXG5cdFx0Ly8gICBjbGFzc2VzXHJcblx0XHQvLyAgIGxvY2Fsc1xyXG5cdFx0Ly8gICBkZWxheVxyXG5cdFx0Ly9cclxuXHRcdHZhciBmdW5jID0gb3B0aW9ucyA9PiB7XHJcblx0XHRcdG9wdGlvbnMucGxhY2VtZW50ID0gb3B0aW9ucy5wbGFjZW1lbnQgfHwgJ2JvdHRvbSBjZW50ZXInO1xyXG5cdFx0XHRvcHRpb25zLmRlbGF5ID0gb3B0aW9ucy5kZWxheSB8fCAwO1xyXG5cdFx0XHRvcHRpb25zLnRyaWdnZXIgPSBvcHRpb25zLnRyaWdnZXIgfHwgJ2hvdmVyJztcclxuXHJcblx0XHRcdHZhciBzY29wZSA9IG9wdGlvbnMuc2NvcGUgfHwgJHJvb3RTY29wZSxcclxuXHRcdFx0XHR0YXJnZXQgPSBvcHRpb25zLnRhcmdldCxcclxuXHRcdFx0XHRlbGVtZW50ID0gJChnZXRUZW1wbGF0ZVBvcHRpcChvcHRpb25zKSksXHJcblx0XHRcdFx0YW5pbWF0ZUVudGVyLFxyXG5cdFx0XHRcdGFuaW1hdGVMZWF2ZSxcclxuXHRcdFx0XHQkYXJyb3cgPSBlbGVtZW50LmZpbmQoJy51ZXgtcG9wdGlwLWFycm93JyksXHJcblx0XHRcdFx0ZXZlbnRJbiAgPSBvcHRpb25zLnRyaWdnZXIgPT09ICdob3ZlcicgPyAnbW91c2VlbnRlcicgOiAnZm9jdXNpbicsXHJcblx0XHRcdFx0ZXZlbnRPdXQgPSBvcHRpb25zLnRyaWdnZXIgPT09ICdob3ZlcicgPyAnbW91c2VsZWF2ZScgOiAnZm9jdXNvdXQnO1xyXG5cclxuXHRcdFx0dmFyIHBvc2l0aW9uID0gKCkgPT4ge1xyXG5cdFx0XHRcdHZhciBvID0gYW5ndWxhci5leHRlbmQob3B0aW9ucywge1xyXG5cdFx0XHRcdFx0dGFyZ2V0OiB0YXJnZXQsXHJcblx0XHRcdFx0XHRlbGVtZW50OiBlbGVtZW50LFxyXG5cdFx0XHRcdFx0bWFyZ2luOiA1LFxyXG5cdFx0XHRcdFx0c3R1YjogdHJ1ZVxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHR2YXIgY29udGV4dCA9IHVleFBvc2l0aW9uZXIobyk7XHJcblx0XHRcdFx0dWV4UG9zaXRpb25lci5hcHBseShjb250ZXh0KTtcclxuXHJcblx0XHRcdFx0dmFyIHYsXHJcblx0XHRcdFx0XHRlcCA9IGNvbnRleHQuZXAsXHJcblx0XHRcdFx0XHR0cCA9IGNvbnRleHQudHAsXHJcblx0XHRcdFx0XHRwID0gdWV4UG9zaXRpb25lci5wYXJzZVBsYWNlbWVudChvcHRpb25zLnBsYWNlbWVudCk7XHJcblx0XHRcdFx0c3dpdGNoIChwLnBsYWNlKSB7XHJcblx0XHRcdFx0XHRjYXNlICd0b3AnOlxyXG5cdFx0XHRcdFx0Y2FzZSAnYm90dG9tJzpcclxuXHRcdFx0XHRcdFx0diA9IHRwLmxlZnQgLSBlcC5sZWZ0ICsgKHRwLndpZHRoIC8gMikgLSA1O1xyXG5cdFx0XHRcdFx0XHRpZiAodiA8IDUpIHYgPSA1O1xyXG5cdFx0XHRcdFx0XHRpZiAodiA+IGVwLndpZHRoIC0gMTUpIHYgPSBlcC53aWR0aCAtIDE1O1xyXG5cdFx0XHRcdFx0XHQkYXJyb3cuY3NzKCdsZWZ0JywgdiArICdweCcpO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0XHRjYXNlICdyaWdodCc6XHJcblx0XHRcdFx0XHRjYXNlICdsZWZ0JzpcclxuXHRcdFx0XHRcdFx0diA9IHRwLnRvcCAtIGVwLnRvcCArICh0cC5oZWlnaHQgLyAyKSAtIDU7XHJcblx0XHRcdFx0XHRcdGlmICh2IDwgNSkgdiA9IDU7XHJcblx0XHRcdFx0XHRcdGlmICh2ID4gZXAuaGVpZ2h0IC0gMTUpIHYgPSBlcC5oZWlnaHQgLSAxNTtcclxuXHRcdFx0XHRcdFx0JGFycm93LmNzcygndG9wJywgdiArICdweCcpO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGFuaW1hdGVFbnRlciA9ICRhbmltYXRlLmVudGVyKGVsZW1lbnQsICRib2R5LCAkYm9keS5jaGlsZHJlbigpLmxhc3QoKSk7XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQkY29tcGlsZShlbGVtZW50KShhbmd1bGFyLmV4dGVuZChzY29wZSwgb3B0aW9ucy5sb2NhbHMgfHwge30pKTtcclxuXHJcblx0XHRcdHZhciBhZGRUb0RPTSA9ICgpID0+IHtcclxuXHRcdFx0XHRpZiAoYW5pbWF0ZUxlYXZlKSAkYW5pbWF0ZS5jYW5jZWwoYW5pbWF0ZUxlYXZlKTtcclxuXHRcdFx0XHRwb3NpdGlvbigpO1xyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0dmFyIHJlbW92ZUZyb21ET00gPSAoKSA9PiB7XHJcblx0XHRcdFx0aWYgKGFuaW1hdGVFbnRlcikgJGFuaW1hdGUuY2FuY2VsKGFuaW1hdGVFbnRlcik7XHJcblx0XHRcdFx0YW5pbWF0ZUxlYXZlID0gJGFuaW1hdGUubGVhdmUoZWxlbWVudCk7XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRzY29wZS4kb24oJyRkZXN0cm95JywgKCkgPT4ge1xyXG5cdFx0XHRcdHJlbW92ZUZyb21ET00oKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHR0YXJnZXQub24oZXZlbnRJbiwgKCkgPT4ge1xyXG5cdFx0XHRcdHNjb3BlLiRhcHBseSgoKSA9PiB7XHJcblx0XHRcdFx0XHRhZGRUb0RPTSgpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHRhcmdldC5vbihldmVudE91dCwgKCkgPT4ge1xyXG5cdFx0XHRcdHNjb3BlLiRhcHBseSgoKSA9PiB7XHJcblx0XHRcdFx0XHRyZW1vdmVGcm9tRE9NKCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fTtcclxuXHJcblx0XHRyZXR1cm4gZnVuYztcclxuXHJcblx0XHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuXHRcdGZ1bmN0aW9uIGdldENsYXNzZXNPcHRpb24ob3B0aW9ucykge1xyXG5cdFx0XHRyZXR1cm4gb3B0aW9ucy5jbGFzc2VzIHx8IG9wdGlvbnNbJ2NsYXNzJ107XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2V0V3JhcHBlckNsYXNzZXMob3B0aW9ucykge1xyXG5cdFx0XHR2YXIgY2xhc3NlcyA9IGdldENsYXNzZXNPcHRpb24ob3B0aW9ucyk7XHJcblx0XHRcdHJldHVybiBjbGFzc2VzID8gJyAnICsgY2xhc3NlcyA6ICcnO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGdldFRlbXBsYXRlUG9wdGlwKG9wdGlvbnMpIHtcclxuXHRcdFx0cmV0dXJuICAnXFxcclxuPGRpdiBjbGFzcz1cInVleC1wb3B0aXAgdWV4LXBvcHRpcC1wLScgKyBvcHRpb25zLnBsYWNlbWVudCArIGdldFdyYXBwZXJDbGFzc2VzKG9wdGlvbnMpICsgJ1wiPlxcXHJcblx0PGRpdiBjbGFzcz1cInVleC1wb3B0aXAtYXJyb3dcIj48L2Rpdj5cXFxyXG5cdDxkaXYgY2xhc3M9XCJ1ZXgtcG9wdGlwLWNvbnRlbnRcIj4nICsgb3B0aW9ucy50ZW1wbGF0ZSArICc8L2Rpdj5cXFxyXG48L2Rpdj4nO1xyXG5cdFx0fVxyXG5cdH1cclxufSkoKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdGFuZ3VsYXJcclxuXHRcdC5tb2R1bGUoJ21yLnVleCcpXHJcblx0XHQuZGlyZWN0aXZlKCd1ZXhQb3B0aXBDb250YWluZXInLCBwb3B0aXBDb250YWluZXIpXHJcblx0XHQuZGlyZWN0aXZlKCd1ZXhQb3B0aXBUYXJnZXQnLCBwb3B0aXBUYXJnZXQpXHJcblx0XHQuZGlyZWN0aXZlKCd1ZXhQb3B0aXAnLCBwb3B0aXApO1xyXG5cclxuXHRmdW5jdGlvbiBwb3B0aXBDb250YWluZXIoKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRyZXN0cmljdDogJ0EnLFxyXG5cdFx0XHRzY29wZTogZmFsc2UsXHJcblx0XHRcdGNvbnRyb2xsZXI6IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHR2YXIgX3RhcmdldEVsZW1lbnQ7XHJcblxyXG5cdFx0XHRcdHRoaXMucmVnaXN0ZXJUYXJnZXQgPSB0YXJnZXRFbGVtZW50ID0+IHtcclxuXHRcdFx0XHRcdF90YXJnZXRFbGVtZW50ID0gdGFyZ2V0RWxlbWVudDtcclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHR0aGlzLmdldFRhcmdldCA9ICgpID0+IF90YXJnZXRFbGVtZW50O1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gcG9wdGlwVGFyZ2V0KCkge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0cmVzdHJpY3Q6ICdBJyxcclxuXHRcdFx0c2NvcGU6IGZhbHNlLFxyXG5cdFx0XHRyZXF1aXJlOiB7XHJcblx0XHRcdFx0cG9wdGlwQ29udGFpbmVyOiAnXnVleFBvcHRpcENvbnRhaW5lcidcclxuXHRcdFx0fSxcclxuXHRcdFx0YmluZFRvQ29udHJvbGxlcjogdHJ1ZSxcclxuXHRcdFx0Y29udHJvbGxlckFzOiAnJHVleFBvcHRpcFRhcmdldEN0cmwnLFxyXG5cdFx0XHRjb250cm9sbGVyOiBmdW5jdGlvbiAoJGVsZW1lbnQpIHtcclxuXHRcdFx0XHR0aGlzLiRvbkluaXQgPSAoKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLnBvcHRpcENvbnRhaW5lci5yZWdpc3RlclRhcmdldCgkZWxlbWVudCk7XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHBvcHRpcCh1ZXhQb3B0aXApIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHJlc3RyaWN0OiAnRScsXHJcblx0XHRcdHRlcm1pbmFsOiB0cnVlLFxyXG5cdFx0XHRzY29wZTogZmFsc2UsXHJcblx0XHRcdHRlbXBsYXRlOiAoJGVsZW1lbnQsICRhdHRycykgPT4ge1xyXG5cdFx0XHRcdCRhdHRycy4kaHRtbCA9ICRlbGVtZW50Lmh0bWwoKTtcclxuXHRcdFx0XHQkZWxlbWVudC5lbXB0eSgpO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRiaW5kVG9Db250cm9sbGVyOiB0cnVlLFxyXG5cdFx0XHRyZXF1aXJlOiB7XHJcblx0XHRcdFx0cG9wdGlwQ29udGFpbmVyOiAnXnVleFBvcHRpcENvbnRhaW5lcidcclxuXHRcdFx0fSxcclxuXHRcdFx0Y29udHJvbGxlckFzOiAnJHVleFBvcHRpcEN0cmwnLFxyXG5cdFx0XHRjb250cm9sbGVyOiBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzKSB7XHJcblx0XHRcdFx0dmFyIHRlbXBsYXRlID0gJGF0dHJzLiRodG1sO1xyXG5cclxuXHRcdFx0XHR0aGlzLiRvbkluaXQgPSAoKSA9PiB7XHJcblx0XHRcdFx0XHR2YXIgdGFyZ2V0ID0gdGhpcy5wb3B0aXBDb250YWluZXIuZ2V0VGFyZ2V0KCk7XHJcblxyXG5cdFx0XHRcdFx0dWV4UG9wdGlwKHtcclxuXHRcdFx0XHRcdFx0c2NvcGU6ICRzY29wZSxcclxuXHRcdFx0XHRcdFx0dGFyZ2V0OiB0YXJnZXQsXHJcblx0XHRcdFx0XHRcdHBsYWNlbWVudDogJGF0dHJzLnBsYWNlbWVudCxcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogJGF0dHJzWydjbGFzcyddLFxyXG5cdFx0XHRcdFx0XHR0cmlnZ2VyOiAkYXR0cnMudHJpZ2dlcixcclxuXHRcdFx0XHRcdFx0dGVtcGxhdGU6IHRlbXBsYXRlXHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxufSkoKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdGFuZ3VsYXIubW9kdWxlKCdtci51ZXgnKS5jb21wb25lbnQoJ3VleFJhZGlvJywge1xyXG5cdFx0dGVtcGxhdGU6ICdcXFxyXG5cdFx0XHQ8ZGl2IGNsYXNzPVwiX3VleC1pY29uXCI+XFxcclxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwiX3VleC1vblwiPjwvZGl2PlxcXHJcblx0XHRcdDwvZGl2PlxcXHJcblx0XHRcdDxuZy10cmFuc2NsdWRlIGNsYXNzPVwiX3VleC1sYWJlbFwiPjwvbmctdHJhbnNjbHVkZT4nLFxyXG5cdFx0dHJhbnNjbHVkZTogdHJ1ZSxcclxuXHRcdGNvbnRyb2xsZXI6ICRjdHJsLFxyXG5cdFx0cmVxdWlyZToge1xyXG5cdFx0XHR1ZXhSYWRpb0dyb3VwQ3RybDogJ151ZXhSYWRpb0dyb3VwJ1xyXG5cdFx0fSxcclxuXHRcdGJpbmRpbmdzOiB7XHJcblx0XHRcdHZhbHVlOiAnPCdcclxuXHRcdH1cclxuXHR9KTtcclxuXHJcblx0ZnVuY3Rpb24gJGN0cmwoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzKSB7XHJcblx0XHR2YXIgbGFzdENoZWNrZWQ7XHJcblxyXG5cdFx0dmFyIHJlbmRlciA9ICgpID0+IHtcclxuXHRcdFx0dmFyIGF0dHJWYWx1ZSA9ICRhdHRycy52YWx1ZTtcclxuXHRcdFx0dmFyIGNoZWNrZWQgPSBhdHRyVmFsdWUgPT09IHRoaXMudWV4UmFkaW9Hcm91cEN0cmwubW9kZWw7XHJcblx0XHRcdGlmIChjaGVja2VkID09PSBsYXN0Q2hlY2tlZCkge1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0bGFzdENoZWNrZWQgPSBjaGVja2VkO1xyXG5cdFx0XHRpZiAoY2hlY2tlZCkge1xyXG5cdFx0XHRcdCRlbGVtZW50LmFkZENsYXNzKCdjaGVja2VkJyk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0JGVsZW1lbnQucmVtb3ZlQ2xhc3MoJ2NoZWNrZWQnKTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHQkYXR0cnMuJG9ic2VydmUoJ3ZhbHVlJywgcmVuZGVyKTtcclxuXHRcdCRzY29wZS4kd2F0Y2goKCkgPT4gdGhpcy51ZXhSYWRpb0dyb3VwQ3RybC5tb2RlbCwgcmVuZGVyKTtcclxuXHJcblx0XHR2YXIgY2xpY2tMaXN0ZW5lciA9IGUgPT4ge1xyXG5cdFx0XHRpZiAoZS5pc0RlZmF1bHRQcmV2ZW50ZWQoKSB8fCAkZWxlbWVudC5hdHRyKCdkaXNhYmxlZCcpKSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQkc2NvcGUuJGFwcGx5KCgpID0+IHtcclxuXHRcdFx0XHR0aGlzLnVleFJhZGlvR3JvdXBDdHJsLnNlbGVjdCgkYXR0cnMudmFsdWUpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLiRwb3N0TGluayA9ICgpID0+IHtcclxuXHRcdFx0JGVsZW1lbnQub24oJ2NsaWNrJywgY2xpY2tMaXN0ZW5lcik7XHJcblx0XHR9O1xyXG5cdH1cclxufSkoKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdGFuZ3VsYXIubW9kdWxlKCdtci51ZXgnKS5jb21wb25lbnQoJ3VleFJhZGlvR3JvdXAnLCB7XHJcblx0XHRjb250cm9sbGVyOiAkY3RybCxcclxuXHRcdHJlcXVpcmU6IHtcclxuXHRcdFx0bmdNb2RlbEN0cmw6ICdebmdNb2RlbCdcclxuXHRcdH0sXHJcblx0XHRiaW5kaW5nczoge1xyXG5cdFx0XHRtb2RlbDogJz1uZ01vZGVsJ1xyXG5cdFx0fVxyXG5cdH0pO1xyXG5cclxuXHRmdW5jdGlvbiAkY3RybCgkc2NvcGUpIHtcclxuXHRcdHRoaXMuc2VsZWN0ID0gdmFsdWUgPT4ge1xyXG5cdFx0XHR0aGlzLm5nTW9kZWxDdHJsLiRzZXRWaWV3VmFsdWUodmFsdWUpO1xyXG5cdFx0fTtcclxuXHR9XHJcbn0pKCk7XHJcbiIsIihmdW5jdGlvbiAoKSB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cclxuXHRhbmd1bGFyXHJcblx0XHQubW9kdWxlKCdtci51ZXgnKVxyXG5cdFx0LmNvbXBvbmVudCgndWV4U2VsZWN0Jywge1xyXG5cdFx0XHR0ZW1wbGF0ZTogKCRlbGVtZW50LCAkYXR0cnMpID0+IHtcclxuXHRcdFx0XHQnbmdJbmplY3QnO1xyXG5cclxuXHRcdFx0XHQkYXR0cnMuJGh0bWwgPSAkZWxlbWVudC5odG1sKCk7XHJcblx0XHRcdFx0JGVsZW1lbnQuZW1wdHkoKTtcclxuXHJcblx0XHRcdFx0cmV0dXJuICdcXFxyXG48ZGl2IGNsYXNzPVwidWV4LXNlbGVjdFwiIG5nLWNsYXNzPVwie29wZW46ICRjdHJsLm9wZW5lZH1cIj5cXFxyXG5cdDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiYnV0dG9uIGhhcy1jYXJldFwiIG5nLWNsaWNrPVwiJGN0cmwub3BlbigpXCI+XFxcclxuXHRcdHt7JGN0cmwudGV4dH19XFxcclxuXHQ8L2J1dHRvbj5cXFxyXG5cdDx1ZXgtaWNvbiBpY29uPVwiY2xvc2VcIiBjbGFzcz1cImJ0bi1wbGFpbiBidG4tZGltXCIgbmctaWY9XCIkY3RybC5jbGVhcmFibGUgJiYgJGN0cmwuc2VsZWN0ZWRcIiBuZy1jbGljaz1cIiRjdHJsLmNsZWFyKClcIj48L3VleC1pY29uPlxcXHJcbjwvZGl2Pic7XHJcblx0XHRcdH0sXHJcblx0XHRcdGNvbnRyb2xsZXI6IHVleFNlbGVjdEN0cmwsXHJcblx0XHRcdHJlcXVpcmU6IHtcclxuXHRcdFx0XHRuZ01vZGVsQ3RybDogJ25nTW9kZWwnXHJcblx0XHRcdH0sXHJcblx0XHRcdGJpbmRpbmdzOiB7XHJcblx0XHRcdFx0ZXhwOiAnQCcsXHJcblx0XHRcdFx0b3JpZ2luYWxUZXh0OiAnQHRleHQnLFxyXG5cdFx0XHRcdGhlYWRlcjogJ0A/JyxcclxuXHRcdFx0XHRjbGFzc2VzOiAnQD8nLFxyXG5cdFx0XHRcdGNsZWFyYWJsZTogJzw/JyxcclxuXHRcdFx0XHRwbGFjZW1lbnQ6ICdAPydcclxuXHRcdFx0fVxyXG5cdFx0fSlcclxuXHRcdC5kaXJlY3RpdmUoJ3VleFNlbGVjdFRyYW5zY2x1ZGUnLCB1ZXhTZWxlY3RUcmFuc2NsdWRlKVxyXG5cdFx0LmRpcmVjdGl2ZSgndWV4U2VsZWN0U2ltcGxlJywgdWV4U2VsZWN0U2ltcGxlKTtcclxuXHJcblx0ZnVuY3Rpb24gdWV4U2VsZWN0VHJhbnNjbHVkZSgpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHJlc3RyaWN0OiAnQScsXHJcblx0XHRcdGNvbXBpbGU6IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0cHJlOiBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzKSB7XHJcblx0XHRcdFx0XHRcdHZhciBjdHJsID0gJHNjb3BlLiRjdHJsO1xyXG5cdFx0XHRcdFx0XHRjdHJsLl9wb3B1bGF0ZVNjb3BlKCRzY29wZSk7XHJcblxyXG5cdFx0XHRcdFx0XHQkc2NvcGUuJGV2YWxBc3luYygoKSA9PiBjdHJsLnBvcCgpLnBvc2l0aW9uKCkpO1xyXG5cclxuXHRcdFx0XHRcdFx0JHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHRcdFx0Y3RybC5fcmVtb3ZlU2NvcGUoJHNjb3BlKTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHVleFNlbGVjdEN0cmwoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzLCAkcGFyc2UsIHVleFBvcCkge1xyXG5cdFx0dmFsaWRhdGUoJGF0dHJzKTtcclxuXHJcblx0XHR2YXIgc2NvcGVzID0gW10sXHJcblx0XHRcdG9yaWdpbmFsVGV4dCA9IHRoaXMub3JpZ2luYWxUZXh0LFxyXG5cdFx0XHRvcHRpb25zID0gcGFyc2UodGhpcy5leHApLFxyXG5cdFx0XHRrZXlOYW1lID0gb3B0aW9ucy5rZXlOYW1lLFxyXG5cdFx0XHRjbGFzc2VzID0gdGhpcy5jbGFzc2VzIHx8ICcnLFxyXG5cdFx0XHRwb3BJbnN0YW5jZTtcclxuXHJcblx0XHR2YXIgY29udGVudCA9ICRhdHRycy4kaHRtbCxcclxuXHRcdFx0JGJ1dHRvbjtcclxuXHJcblx0XHR2YXIgZGlzcGxheSA9IGl0ZW0gPT4ge1xyXG5cdFx0XHRpZiAob3B0aW9ucy5hc0ZuID09PSBhbmd1bGFyLm5vb3ApIHJldHVybiBpdGVtO1xyXG5cdFx0XHR2YXIgbG9jYWxzID0ge307XHJcblx0XHRcdGxvY2Fsc1trZXlOYW1lXSA9IGl0ZW07XHJcblx0XHRcdHJldHVybiBvcHRpb25zLmFzRm4oJHNjb3BlLCBsb2NhbHMpO1xyXG5cdFx0fTtcclxuXHJcblx0XHR2YXIgdHJhY2sgPSBpdGVtID0+IHtcclxuXHRcdFx0aWYgKG9wdGlvbnMudHJhY2tGbiA9PT0gYW5ndWxhci5ub29wKSByZXR1cm4gaXRlbTtcclxuXHRcdFx0dmFyIGxvY2FscyA9IHt9O1xyXG5cdFx0XHRsb2NhbHNba2V5TmFtZV0gPSBpdGVtO1xyXG5cdFx0XHRyZXR1cm4gb3B0aW9ucy50cmFja0ZuKCRzY29wZSwgbG9jYWxzKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dmFyIGdldEl0ZW1zID0gKCkgPT4ge1xyXG5cdFx0XHRyZXR1cm4gb3B0aW9ucy5pbkZuKCRzY29wZS4kcGFyZW50KTtcclxuXHRcdH07XHJcblxyXG5cdFx0dmFyIHNldFRleHQgPSB0ID0+IHtcclxuXHRcdFx0dGhpcy50ZXh0ID0gdDtcclxuXHRcdH07XHJcblxyXG5cdFx0dmFyIHJlc2V0VGV4dCA9ICgpID0+IHtcclxuXHRcdFx0dGhpcy50ZXh0ID0gb3JpZ2luYWxUZXh0O1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLiRwb3N0TGluayA9ICgpID0+IHtcclxuXHRcdFx0JGJ1dHRvbiA9ICRlbGVtZW50LmZpbmQoJy5idXR0b24nKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy4kb25Jbml0ID0gKCkgPT4ge1xyXG5cdFx0XHR0aGlzLm5nTW9kZWxDdHJsLiRyZW5kZXIgPSAoKSA9PiB7XHJcblx0XHRcdFx0dmFyIHZhbHVlID0gdGhpcy5uZ01vZGVsQ3RybC4kdmlld1ZhbHVlO1xyXG5cdFx0XHRcdHRoaXMuc2VsZWN0KHZhbHVlID8gdmFsdWUgOiBudWxsKTtcclxuXHRcdFx0fTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5fcG9wdWxhdGVTY29wZSA9IHNjb3BlID0+IHtcclxuXHRcdFx0dmFyIGl0ZW0gPSBzY29wZS5pdGVtO1xyXG5cdFx0XHRzY29wZXMucHVzaChzY29wZSk7XHJcblx0XHRcdGlmIChpdGVtICYmIHRyYWNrKGl0ZW0pID09PSB0cmFjayh0aGlzLnNlbGVjdGVkKSkge1xyXG5cdFx0XHRcdHNjb3BlLiRzZWxlY3RlZCA9IHRydWU7XHJcblx0XHRcdH0gZWxzZSBpZiAoaXRlbSkge1xyXG5cdFx0XHRcdHNjb3BlLiRzZWxlY3RlZCA9IGZhbHNlO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChpdGVtKSB7XHJcblx0XHRcdFx0c2NvcGVba2V5TmFtZV0gPSBpdGVtO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuX3JlbW92ZVNjb3BlID0gc2NvcGUgPT4ge1xyXG5cdFx0XHR2YXIgaW5kZXggPSBzY29wZXMuaW5kZXhPZihzY29wZSk7XHJcblx0XHRcdGlmIChpbmRleCA+PSAwKSB7XHJcblx0XHRcdFx0c2NvcGVzLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5fZmluZFNjb3BlID0gKGl0ZW0sIHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHNjb3Blcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdHZhciBzY29wZSA9IHNjb3Blc1tpXTtcclxuXHRcdFx0XHRpZiAoaXRlbSA9PT0gc2NvcGUuaXRlbSkge1xyXG5cdFx0XHRcdFx0aWYgKHJlc29sdmUpXHJcblx0XHRcdFx0XHRcdHJlc29sdmUoc2NvcGUpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRpZiAocmVqZWN0KVxyXG5cdFx0XHRcdFx0XHRyZWplY3Qoc2NvcGUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLm9wZW4gPSAoKSA9PiB7XHJcblx0XHRcdHRoaXMub3BlbmVkID0gdHJ1ZTtcclxuXHRcdFx0aWYgKCFwb3BJbnN0YW5jZSkge1xyXG5cdFx0XHRcdHBvcEluc3RhbmNlID0gdWV4UG9wKHtcclxuXHRcdFx0XHRcdHNjb3BlOiAkc2NvcGUsXHJcblx0XHRcdFx0XHR0YXJnZXQ6ICRidXR0b24sXHJcblx0XHRcdFx0XHRwbGFjZW1lbnQ6IHRoaXMucGxhY2VtZW50IHx8ICdib3R0b20gc3RhcnQnLFxyXG5cdFx0XHRcdFx0Y2xhc3NlczogJ3VleC1zZWxlY3QtcG9wICcgKyBjbGFzc2VzLFxyXG5cdFx0XHRcdFx0dGVtcGxhdGU6IGdldFRlbXBsYXRlUG9wKGNvbnRlbnQpXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0cG9wSW5zdGFuY2Uub25EaXNtaXNzKCgpID0+IHRoaXMub3BlbmVkID0gZmFsc2UpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHBvcEluc3RhbmNlLm9wZW4oKTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmNsb3NlID0gKCkgPT4ge1xyXG5cdFx0XHRpZiAocG9wSW5zdGFuY2UpIHBvcEluc3RhbmNlLmRpc21pc3MoKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5jbGVhciA9ICgpID0+IHRoaXMuc2VsZWN0KG51bGwpO1xyXG5cclxuXHRcdHRoaXMuc2VsZWN0ID0gaXRlbSA9PiB7XHJcblx0XHRcdGlmICghaXRlbSAmJiAhdGhpcy5zZWxlY3RlZCkgcmV0dXJuO1xyXG5cclxuXHRcdFx0dGhpcy5zZWxlY3RlZCA9IGl0ZW07XHJcblxyXG5cdFx0XHRpZiAoaXRlbSkge1xyXG5cdFx0XHRcdHRoaXMuX2ZpbmRTY29wZShpdGVtLCBzY29wZSA9PiB7XHJcblx0XHRcdFx0XHRzY29wZS4kc2VsZWN0ZWQgPSB0cnVlO1xyXG5cdFx0XHRcdH0sIHNjb3BlID0+IHtcclxuXHRcdFx0XHRcdHNjb3BlLiRzZWxlY3RlZCA9IGZhbHNlO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdHRoaXMubmdNb2RlbEN0cmwuJHNldFZpZXdWYWx1ZShpdGVtKTtcclxuXHRcdFx0XHRzZXRUZXh0KGRpc3BsYXkoaXRlbSkpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRoaXMuX2ZpbmRTY29wZShudWxsLCBudWxsLCBzY29wZSA9PiB7XHJcblx0XHRcdFx0XHRzY29wZS4kc2VsZWN0ZWQgPSBmYWxzZTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHR0aGlzLm5nTW9kZWxDdHJsLiRzZXRWaWV3VmFsdWUobnVsbCk7XHJcblx0XHRcdFx0cmVzZXRUZXh0KCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHRoaXMuY2xvc2UoKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5pdGVtcyA9ICgpID0+IGdldEl0ZW1zKCk7XHJcblxyXG5cdFx0dGhpcy5wb3AgPSAoKSA9PiBwb3BJbnN0YW5jZTtcclxuXHJcblx0XHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuXHRcdGlmICh0aGlzLmNsZWFyYWJsZSA9PT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdHRoaXMuY2xlYXJhYmxlID0gdHJ1ZTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoIXRoaXMuaGVhZGVyKSB7XHJcblx0XHRcdHRoaXMuaGVhZGVyID0gb3JpZ2luYWxUZXh0O1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMub3BlbmVkID0gZmFsc2U7XHJcblx0XHR0aGlzLnNlbGVjdGVkID0gbnVsbDtcclxuXHRcdHRoaXMudGV4dCA9IG9yaWdpbmFsVGV4dDtcclxuXHJcblx0XHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuXHRcdGZ1bmN0aW9uIHBhcnNlKGV4cCkge1xyXG5cdFx0XHR2YXIgbWF0Y2ggPSBleHAubWF0Y2goXHJcblx0XHRcdFx0L15cXHMqKFtcXHNcXFNdKz8pXFxzK2luXFxzKyhbXFxzXFxTXSs/KSg/Olxccythc1xccysoW1xcc1xcU10rPykpPyg/Olxccyt0cmFja1xccytieVxccysoW1xcc1xcU10rPykpP1xccyokLyk7XHJcblxyXG5cdFx0XHR2YXIgcGFyc2VkID0ge1xyXG5cdFx0XHRcdGtleU5hbWU6IG1hdGNoWzFdLFxyXG5cdFx0XHRcdGluRm46ICRwYXJzZShtYXRjaFsyXSksXHJcblx0XHRcdFx0YXNGbjogJHBhcnNlKG1hdGNoWzNdKSxcclxuXHRcdFx0XHR0cmFja0ZuOiAkcGFyc2UobWF0Y2hbNF0pXHJcblx0XHRcdH07XHJcblx0XHRcdHBhcnNlZC5hc3luY01vZGUgPSAhcGFyc2VkLmluRm4uYXNzaWduICYmICFwYXJzZWQuaW5Gbi5saXRlcmFsO1xyXG5cdFx0XHRyZXR1cm4gcGFyc2VkO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIHZhbGlkYXRlKCRhdHRycykge1xyXG5cdFx0XHRpZiAoISRhdHRycy5leHApIHtcclxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1xcJ3VleFNlbGVjdFxcJzogQXR0cmlidXRlIFxcJ2V4cFxcJyBpcyByZXF1aXJlZC4nKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGdldFRlbXBsYXRlUG9wKGNvbnRlbnQpIHtcclxuXHRcdFx0cmV0dXJuICdcXFxyXG48aGVhZGVyPlxcXHJcblx0PHVleC1pY29uIGljb249XCJjbG9zZVwiIGNsYXNzPVwiY2xvc2UtYnRuIGJ0bi1wbGFpbiBidG4tZGltXCIgbmctY2xpY2s9XCIkcG9wLmRpc21pc3MoKVwiPjwvdWV4LWljb24+XFxcclxuXHQ8ZGl2IGNsYXNzPVwiaGVhZGVyLXRleHRcIj57ezo6JGN0cmwuaGVhZGVyfX08L2Rpdj5cXFxyXG48L2hlYWRlcj5cXFxyXG48ZGl2IGNsYXNzPVwiX3VleC1jb250ZW50XCI+XFxcclxuXHQ8dWwgY2xhc3M9XCJvcHRpb25zIG5vLW1hcmdpblwiPlxcXHJcblx0XHQ8bGkgbmctcmVwZWF0PVwiaXRlbSBpbiAkY3RybC5pdGVtcygpXCIgbmctY2xpY2s9XCIkY3RybC5zZWxlY3QoaXRlbSlcIiB1ZXgtc2VsZWN0LXRyYW5zY2x1ZGU+JyArIGNvbnRlbnQgKyAnPC9saT5cXFxyXG5cdDwvdWw+XFxcclxuPC9kaXY+JztcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHVleFNlbGVjdFNpbXBsZSgpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHJlc3RyaWN0OiAnRScsXHJcblx0XHRcdHRyYW5zY2x1ZGU6IHRydWUsXHJcblx0XHRcdHRlbXBsYXRlOiAnXFxcclxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwidWV4LXNlbGVjdC1zaW1wbGUtY29udGVudFwiIG5nLXRyYW5zY2x1ZGU+PC9kaXY+XFxcclxuXHRcdFx0XHQ8dWV4LWljb24gaWNvbj1cImNoZWNrXCIgbmctY2xhc3M9XCJ7c2hvd246ICRzZWxlY3RlZH1cIj48L3VleC1pY29uPidcclxuXHRcdH07XHJcblx0fVxyXG59KSgpO1xyXG4iLCIoZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0YW5ndWxhclxyXG5cdFx0Lm1vZHVsZSgnbXIudWV4JylcclxuXHRcdC5kaXJlY3RpdmUoJ3VleFRvb2x0aXAnLCB1ZXhUb29sdGlwKTtcclxuXHJcblx0ZnVuY3Rpb24gdWV4VG9vbHRpcCgpIHtcclxuXHRcdGZ1bmN0aW9uIGV4dHJhY3RQbGFjZW1lbnQodikge1xyXG5cdFx0XHR2YXIgaW5kZXggPSB2LmluZGV4T2YoJywnKTtcclxuXHRcdFx0cmV0dXJuIHYuc2xpY2UoMCwgaW5kZXgpLnRyaW0oKTtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBleHRyYWN0VGV4dCh2KSB7XHJcblx0XHRcdHZhciBpbmRleCA9IHYuaW5kZXhPZignLCcpO1xyXG5cdFx0XHRyZXR1cm4gdi5zbGljZShpbmRleCArIDEpLnRyaW0oKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRyZXN0cmljdDogJ0EnLFxyXG5cdFx0XHRzY29wZTogZmFsc2UsXHJcblx0XHRcdGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMpIHtcclxuXHRcdFx0XHR2YXIgcGxhY2VtZW50ID0gZXh0cmFjdFBsYWNlbWVudCgkYXR0cnMudWV4VG9vbHRpcCk7XHJcblx0XHRcdFx0JGVsZW1lbnQuYWRkQ2xhc3MoJ3Rvb2x0aXBwZWQgdG9vbHRpcHBlZC0nICsgcGxhY2VtZW50KTtcclxuXHJcblx0XHRcdFx0JGF0dHJzLiRvYnNlcnZlKCd1ZXhUb29sdGlwJywgZnVuY3Rpb24gKHYpIHtcclxuXHRcdFx0XHRcdHZhciB0ZXh0ID0gZXh0cmFjdFRleHQodik7XHJcblx0XHRcdFx0XHQkZWxlbWVudC5hdHRyKCdhcmlhLWxhYmVsJywgdGV4dCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG59KSgpO1xyXG4iXSwic291cmNlUm9vdCI6Ii9jb21wb25lbnRzIn0=
