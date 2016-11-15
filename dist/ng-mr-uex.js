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
		//
		var func = options => {
			options = angular.isString(options) ? { component: options } : options;
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

			var resolve = angular.extend(
				{},
				options.locals || {},
				{ modal: instance });
			var templatePromise = getTemplatePromise(options, resolve);

			templatePromise.then(template => {
				$element.find('.uex-modal-content').html(template);

				$compile($element)(angular.extend(scope, {
					$title: options.title || 'Modal',
					$modal: instance,
					$resolve: resolve,
					_tryDismiss: event => {
						if ($(event.target).is('.uex-modal')) {
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
<div class="uex-modal' + getWrapperClasses(options) +'" ng-click="_tryDismiss($event)">\
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
			classes = this.classes,
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
				<uex-icon icon="check" ng-if="$selected"></uex-icon>'
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUuanMiLCJhdXRvY29tcGxldGUvYXV0b2NvbXBsZXRlLmpzIiwiY2hlY2tib3gvY2hlY2tib3guanMiLCJpY29uL2ljb24uanMiLCJtaXNjL2FsaWFzLmpzIiwibWlzYy9mb2N1cy5qcyIsIm1pc2MvcG9zaXRpb25lci5qcyIsIm1pc2MvcG9zaXRpb25pbmdUaHJvdHRsZXIuanMiLCJtaXNjL3V0aWwuanMiLCJtb2RhbC9tb2RhbC5qcyIsIm1vZGFsL21vZGFsRGlyZWN0aXZlLmpzIiwicC9wLmpzIiwicG9wL3BvcC5qcyIsInBvcC9wb3BEaXJlY3RpdmUuanMiLCJwb3B0aXAvcG9wdGlwLmpzIiwicG9wdGlwL3BvcHRpcERpcmVjdGl2ZS5qcyIsInJhZGlvL3JhZGlvLmpzIiwicmFkaW8vcmFkaW9Hcm91cC5qcyIsInNlbGVjdC9zZWxlY3QuanMiLCJ0b29sdGlwL3Rvb2x0aXAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeE5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0UkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4UEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoibmctbXItdWV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiYW5ndWxhclxyXG5cdC5tb2R1bGUoJ21yLnVleCcsIFsnbmdBbmltYXRlJ10pO1xyXG4iLCIoZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0YW5ndWxhclxyXG5cdFx0Lm1vZHVsZSgnbXIudWV4JylcclxuXHRcdC5kaXJlY3RpdmUoJ3VleEF1dG9jb21wbGV0ZScsIHVleEF1dG9jb21wbGV0ZSk7XHJcblxyXG5cdGZ1bmN0aW9uIHVleEF1dG9jb21wbGV0ZUN0cmwoJHNjb3BlLCAkYXR0cnMsICRwYXJzZSwgJHEpIHtcclxuXHRcdGZ1bmN0aW9uIHBhcnNlKGV4cCkge1xyXG5cdFx0XHR2YXIgbWF0Y2ggPSBleHAubWF0Y2goL15cXHMqKFtcXHNcXFNdKz8pXFxzK2luXFxzKyhbXFxzXFxTXSs/KSg/Olxccythc1xccysoW1xcc1xcU10rPykpP1xccyokLyk7XHJcblxyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdGtleU5hbWU6IG1hdGNoWzFdLFxyXG5cdFx0XHRcdGluRm46ICRwYXJzZShtYXRjaFsyXSksXHJcblx0XHRcdFx0YXNGbjogJHBhcnNlKG1hdGNoWzNdKVxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICgkYXR0cnMuZXhwID09PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdcXCd1ZXhBdXRvY29tcGxldGVcXCc6IEF0dHJpYnV0ZSBcXCdleHBcXCcgaXMgcmVxdWlyZWQuJyk7XHJcblx0XHR9XHJcblxyXG5cdFx0dmFyIGN0cmwgPSB0aGlzLFxyXG5cdFx0XHRvcHRpb25zID0gcGFyc2UoJGF0dHJzLmV4cCksXHJcblx0XHRcdGtleU5hbWUgPSBvcHRpb25zLmtleU5hbWUsXHJcblx0XHRcdHByb21pc2U7XHJcblxyXG5cdFx0Y3RybC5pdGVtcyA9IFtdO1xyXG5cdFx0Y3RybC50ZXh0ID0gW107XHJcblx0XHRjdHJsLm9wdGlvbnMgPSBvcHRpb25zO1xyXG5cdFx0Y3RybC5rZXlOYW1lID0ga2V5TmFtZTtcclxuXHRcdGN0cmwuYWN0aXZlSXRlbSA9IG51bGw7XHJcblx0XHRjdHJsLmFjdGl2ZUluZGV4ID0gLTE7XHJcblxyXG5cdFx0dmFyIHRyYW5zaWVudCA9IGZhbHNlO1xyXG5cclxuXHRcdGN0cmwuZGlzcGxheSA9IGZ1bmN0aW9uIChpdGVtKSB7XHJcblx0XHRcdGlmIChvcHRpb25zLmFzRm4gPT09IGFuZ3VsYXIubm9vcCkgcmV0dXJuIGl0ZW07XHJcblx0XHRcdHZhciBsb2NhbHMgPSB7fTtcclxuXHRcdFx0bG9jYWxzW2tleU5hbWVdID0gaXRlbTtcclxuXHRcdFx0cmV0dXJuIG9wdGlvbnMuYXNGbigkc2NvcGUsIGxvY2Fscyk7XHJcblx0XHR9O1xyXG5cclxuXHRcdGN0cmwuc2VsZWN0ID0gZnVuY3Rpb24gKGl0ZW0pIHtcclxuXHRcdFx0Y3RybC50ZXh0ID0gY3RybC5kaXNwbGF5KGl0ZW0pO1xyXG5cdFx0XHRjdHJsLmNsZWFyKCk7XHJcblx0XHRcdHRyYW5zaWVudCA9IHRydWU7XHJcblx0XHR9O1xyXG5cclxuXHRcdGN0cmwuc2V0QWN0aXZlID0gZnVuY3Rpb24gKGluZGV4KSB7XHJcblx0XHRcdGlmIChpbmRleCA9PT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0Y3RybC5hY3RpdmVJdGVtID0gbnVsbDtcclxuXHRcdFx0XHRjdHJsLmFjdGl2ZUluZGV4ID0gLTE7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblx0XHRcdHZhciBpdGVtID0gY3RybC5pdGVtc1tpbmRleF07XHJcblxyXG5cdFx0XHRjdHJsLmFjdGl2ZUl0ZW0gPSBpdGVtO1xyXG5cdFx0XHRjdHJsLmFjdGl2ZUluZGV4ID0gaW5kZXg7XHJcblx0XHR9O1xyXG5cclxuXHRcdGN0cmwubW91c2VvdmVyID0gZnVuY3Rpb24gKGl0ZW0sIGluZGV4KSB7XHJcblx0XHRcdGN0cmwuc2V0QWN0aXZlKGluZGV4KTtcclxuXHRcdH07XHJcblxyXG5cdFx0Y3RybC5jbGVhciA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0Y3RybC5pdGVtcyA9IFtdO1xyXG5cdFx0XHRjdHJsLnNldEFjdGl2ZSgpO1xyXG5cdFx0fTtcclxuXHJcblx0XHRmdW5jdGlvbiBmaWx0ZXJJZk5vdFByb21pc2Uobykge1xyXG5cdFx0XHRpZiAoby50aGVuKSByZXR1cm4gbztcclxuXHRcdFx0dmFyIHRleHQgPSBjdHJsLnRleHQ7XHJcblx0XHRcdGlmICghdGV4dCB8fCB0ZXh0LnRyaW0oKSA9PT0gJycpIHJldHVybiBvO1xyXG5cdFx0XHR2YXIgciA9IFtdO1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG8ubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRpZiAoY3RybC5kaXNwbGF5KG9baV0pLmluZGV4T2YodGV4dCkgPiAtMSkge1xyXG5cdFx0XHRcdFx0ci5wdXNoKG9baV0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gcjtcclxuXHRcdH1cclxuXHJcblx0XHQkc2NvcGUuJHdhdGNoKGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0cmV0dXJuIGN0cmwudGV4dDtcclxuXHRcdH0sIGZ1bmN0aW9uIHdhdGNoVGV4dCh2LCBvbGQpIHtcclxuXHRcdFx0aWYgKHYgPT09IG9sZCB8fCB2ID09PSBudWxsIHx8IHRyYW5zaWVudCkge1xyXG5cdFx0XHRcdHRyYW5zaWVudCA9IGZhbHNlO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHRjdHJsLm5nTW9kZWwuJHNldFZpZXdWYWx1ZSh2KTtcclxuXHRcdFx0Y3RybC5sb2FkaW5nID0gdHJ1ZTtcclxuXHRcdFx0Y3RybC5jbGVhcigpO1xyXG5cdFx0XHR2YXIgcCA9IHByb21pc2UgPSAkcS53aGVuKGZpbHRlcklmTm90UHJvbWlzZShjdHJsLm9wdGlvbnMuaW5Gbigkc2NvcGUsIHsgLy8ganNoaW50IGlnbm9yZTpsaW5lXHJcblx0XHRcdFx0cTogdlxyXG5cdFx0XHR9KSkpO1xyXG5cdFx0XHRwLnRoZW4oZnVuY3Rpb24gKGQpIHtcclxuXHRcdFx0XHRpZiAocCAhPT0gcHJvbWlzZSkgcmV0dXJuO1xyXG5cdFx0XHRcdGN0cmwuaXRlbXMgPSBkO1xyXG5cdFx0XHR9KS5maW5hbGx5KGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRjdHJsLmxvYWRpbmcgPSBmYWxzZTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHVleEF1dG9jb21wbGV0ZSgkZG9jdW1lbnQpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHJlc3RyaWN0OiAnRScsXHJcblx0XHRcdGNvbnRyb2xsZXI6IHVleEF1dG9jb21wbGV0ZUN0cmwsXHJcblx0XHRcdGNvbnRyb2xsZXJBczogJyR1ZXhBdXRvY29tcGxldGVDdHJsJyxcclxuXHRcdFx0dGVtcGxhdGU6IGZ1bmN0aW9uIChlbGVtZW50LCBhdHRyKSB7XHJcblx0XHRcdFx0ZnVuY3Rpb24gZ2V0SXRlbVRlbXBsYXRlKCkge1xyXG5cdFx0XHRcdFx0dmFyIHRlbXBsYXRlVGFnID0gZWxlbWVudC5maW5kKCd1ZXgtaXRlbS10ZW1wbGF0ZScpLmRldGFjaCgpLFxyXG5cdFx0XHRcdFx0XHRodG1sID0gdGVtcGxhdGVUYWcubGVuZ3RoID8gdGVtcGxhdGVUYWcuaHRtbCgpIDogZWxlbWVudC5odG1sKCk7XHJcblx0XHRcdFx0XHRpZiAoIXRlbXBsYXRlVGFnLmxlbmd0aCkgZWxlbWVudC5lbXB0eSgpO1xyXG5cdFx0XHRcdFx0cmV0dXJuIGh0bWw7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHJldHVybiAnXFxcclxuPGRpdiBjbGFzcz1cInVleC1hdXRvY29tcGxldGVcIj5cXFxyXG5cdDxpbnB1dCB0eXBlPVwidGV4dFwiIG5nLW1vZGVsPVwiJHVleEF1dG9jb21wbGV0ZUN0cmwudGV4dFwiIG5nLWtleWRvd249XCJrZXlkb3duKCRldmVudClcIiA+XFxcclxuXHQ8ZGl2IGNsYXNzPVwidWV4LWF1dG9jb21wbGV0ZS1saXN0XCIgbmctaWY9XCIkdWV4QXV0b2NvbXBsZXRlQ3RybC5pdGVtcy5sZW5ndGggPiAwXCI+XFxcclxuXHRcdDxkaXYgY2xhc3M9XCJ1ZXgtYXV0b2NvbXBsZXRlLWl0ZW1cIlxcXHJcblx0XHRcdCBuZy1yZXBlYXQ9XCJpdGVtIGluICR1ZXhBdXRvY29tcGxldGVDdHJsLml0ZW1zXCJcXFxyXG5cdFx0XHQgbmctY2xpY2s9XCIkdWV4QXV0b2NvbXBsZXRlQ3RybC5zZWxlY3QoaXRlbSlcIlxcXHJcblx0XHRcdCBuZy1jbGFzcz1cInsgYWN0aXZlOiAkaW5kZXggPT0gJHVleEF1dG9jb21wbGV0ZUN0cmwuYWN0aXZlSW5kZXggfVwiXFxcclxuXHRcdFx0IG5nLW1vdXNlb3Zlcj1cIiR1ZXhBdXRvY29tcGxldGVDdHJsLm1vdXNlb3ZlcihpdGVtLCAkaW5kZXgpXCJcXFxyXG5cdFx0XHQgdWV4LWFsaWFzPVwiaXRlbSB7ezo6JHVleEF1dG9jb21wbGV0ZUN0cmwua2V5TmFtZX19XCI+JyArXHJcblx0XHRcdCBnZXRJdGVtVGVtcGxhdGUoKSArICdcXFxyXG5cdFx0PC9kaXY+XFxcclxuXHQ8L2Rpdj5cXFxyXG48L2Rpdj4nO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRyZXF1aXJlOiBbJ3VleEF1dG9jb21wbGV0ZScsICduZ01vZGVsJ10sXHJcblx0XHRcdHNjb3BlOiB0cnVlLFxyXG5cdFx0XHRsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzLCBjdHJscywgJHRyYW5zY2x1ZGUpIHtcclxuXHRcdFx0XHR2YXIgY3RybCA9IGN0cmxzWzBdLFxyXG5cdFx0XHRcdFx0bmdNb2RlbCA9IGN0cmxzWzFdO1xyXG5cclxuXHRcdFx0XHRjdHJsLm5nTW9kZWwgPSBuZ01vZGVsO1xyXG5cclxuXHRcdFx0XHRuZ01vZGVsLiRyZW5kZXIgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHRjdHJsLnRleHQgPSBuZ01vZGVsLiR2aWV3VmFsdWU7XHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0JHNjb3BlLmtleWRvd24gPSBmdW5jdGlvbiAoZSkge1xyXG5cdFx0XHRcdFx0dmFyIGtleSA9IGUud2hpY2gsXHJcblx0XHRcdFx0XHRcdHNob3VsZFByZXZlbnREZWZhdWx0ID0gdHJ1ZTtcclxuXHJcblx0XHRcdFx0XHRzd2l0Y2ggKGtleSkge1xyXG5cdFx0XHRcdFx0XHRjYXNlIDEzOiAvLyBlbnRlclxyXG5cdFx0XHRcdFx0XHRcdGN0cmwuc2VsZWN0KGN0cmwuYWN0aXZlSXRlbSk7XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0XHRjYXNlIDI3OiAvLyBlc2NcclxuXHRcdFx0XHRcdFx0XHRjdHJsLmNsZWFyKCk7XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0XHRjYXNlIDM4OiAvLyB1cFxyXG5cdFx0XHRcdFx0XHRcdGlmIChjdHJsLml0ZW1zLmxlbmd0aCA9PT0gMCkgYnJlYWs7XHJcblx0XHRcdFx0XHRcdFx0aWYgKGN0cmwuYWN0aXZlSW5kZXggPT09IC0xKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRjdHJsLnNldEFjdGl2ZShjdHJsLml0ZW1zLmxlbmd0aCAtIDEpO1xyXG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdGlmIChjdHJsLmFjdGl2ZUluZGV4IC0gMSA8IDApIGJyZWFrO1xyXG5cdFx0XHRcdFx0XHRcdGN0cmwuc2V0QWN0aXZlKGN0cmwuYWN0aXZlSW5kZXggLSAxKTtcclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0XHRcdGNhc2UgNDA6IC8vIGRvd25cclxuXHRcdFx0XHRcdFx0XHRpZiAoY3RybC5pdGVtcy5sZW5ndGggPT09IDApIGJyZWFrO1xyXG5cdFx0XHRcdFx0XHRcdGlmIChjdHJsLmFjdGl2ZUluZGV4ID09PSAtMSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0Y3RybC5zZXRBY3RpdmUoMCk7XHJcblx0XHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0aWYgKGN0cmwuYWN0aXZlSW5kZXggKyAxID49IGN0cmwuaXRlbXMubGVuZ3RoKSBicmVhaztcclxuXHRcdFx0XHRcdFx0XHRjdHJsLnNldEFjdGl2ZShjdHJsLmFjdGl2ZUluZGV4ICsgMSk7XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdFx0XHRcdHNob3VsZFByZXZlbnREZWZhdWx0ID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0aWYgKHNob3VsZFByZXZlbnREZWZhdWx0KSB7XHJcblx0XHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHQkZWxlbWVudC5vbigna2V5ZG93bicsIGZ1bmN0aW9uIChlKSB7XHJcblx0XHRcdFx0XHRpZiAoZS53aGljaCA9PT0gMjcpIHtcclxuXHRcdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRcdFx0XHQkc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdFx0XHRjdHJsLmNsZWFyKCk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQkZG9jdW1lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcclxuXHRcdFx0XHRcdGlmICghJC5jb250YWlucygkZWxlbWVudFswXSwgZS50YXJnZXQpKSB7XHJcblx0XHRcdFx0XHRcdCRzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0XHRcdGN0cmwuY2xlYXIoKTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG59KSgpO1xyXG4iLCIoZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0YW5ndWxhci5tb2R1bGUoJ21yLnVleCcpLmNvbXBvbmVudCgndWV4Q2hlY2tib3gnLCB7XHJcblx0XHR0ZW1wbGF0ZTogJ1xcXHJcblx0XHRcdDxkaXYgY2xhc3M9XCJfdWV4LWljb25cIiBuZy1jbGFzcz1cIntcXCdjaGVja2VkXFwnOiAkY3RybC5tb2RlbH1cIj48L2Rpdj5cXFxyXG5cdFx0XHQ8bmctdHJhbnNjbHVkZSBjbGFzcz1cIl91ZXgtbGFiZWxcIj48L25nLXRyYW5zY2x1ZGU+JyxcclxuXHRcdHRyYW5zY2x1ZGU6IHRydWUsXHJcblx0XHRjb250cm9sbGVyOiAkY3RybCxcclxuXHRcdHJlcXVpcmU6IHtcclxuXHRcdFx0bmdNb2RlbEN0cmw6ICduZ01vZGVsJ1xyXG5cdFx0fSxcclxuXHRcdGJpbmRpbmdzOiB7XHJcblx0XHRcdG1vZGVsOiAnPW5nTW9kZWwnXHJcblx0XHR9XHJcblx0fSk7XHJcblxyXG5cdGZ1bmN0aW9uICRjdHJsKCRzY29wZSwgJGVsZW1lbnQpIHtcclxuXHRcdHZhciByZW5kZXIgPSAoKSA9PiB7XHJcblx0XHRcdGlmICh0aGlzLm1vZGVsKSB7XHJcblx0XHRcdFx0JGVsZW1lbnQuYWRkQ2xhc3MoJ2NoZWNrZWQnKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQkZWxlbWVudC5yZW1vdmVDbGFzcygnY2hlY2tlZCcpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdCRzY29wZS4kd2F0Y2goKCkgPT4gdGhpcy5tb2RlbCwgcmVuZGVyKTtcclxuXHJcblx0XHR2YXIgY2xpY2tMaXN0ZW5lciA9IGUgPT4ge1xyXG5cdFx0XHRpZiAoZS5pc0RlZmF1bHRQcmV2ZW50ZWQoKSB8fCAkZWxlbWVudC5hdHRyKCdkaXNhYmxlZCcpKSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQkc2NvcGUuJGFwcGx5KCgpID0+IHtcclxuXHRcdFx0XHR2YXIgdmlld1ZhbHVlID0gIXRoaXMubW9kZWw7XHJcblx0XHRcdFx0dGhpcy5uZ01vZGVsQ3RybC4kc2V0Vmlld1ZhbHVlKHZpZXdWYWx1ZSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLiRwb3N0TGluayA9ICgpID0+IHtcclxuXHRcdFx0JGVsZW1lbnQub24oJ2NsaWNrJywgY2xpY2tMaXN0ZW5lcik7XHJcblx0XHR9O1xyXG5cdH1cclxufSkoKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdGFuZ3VsYXJcclxuXHRcdC5tb2R1bGUoJ21yLnVleCcpXHJcblx0XHQucHJvdmlkZXIoJ3VleEljb25zJywgdWV4SWNvbnNQcm92aWRlcilcclxuXHRcdC5kaXJlY3RpdmUoJ3VleEljb24nLCB1ZXhJY29uKTtcclxuXHJcblx0ZnVuY3Rpb24gdWV4SWNvbnNQcm92aWRlcigpIHtcclxuXHRcdHZhciBpY29ucyA9IFt7XHJcblx0XHRcdGlkOiAnYWRkLHBsdXMnLFxyXG5cdFx0XHRzdmc6ICc8cGF0aCBkPVwiTTE5MiAyMjR2LTEyOGgtNjR2MTI4aC0xMjh2NjRoMTI4djEyOGg2NHYtMTI4aDEyOHYtNjRoLTEyOHpcIi8+JyxcclxuXHRcdFx0dmlld0JveDogJzAgMCAzMjAgNTEyJ1xyXG5cdFx0fSwge1xyXG5cdFx0XHRpZDogJ2Nsb3NlJyxcclxuXHRcdFx0c3ZnOiAnPHBhdGggZD1cIk03LjQ4IDhsMy43NSAzLjc1LTEuNDggMS40OEw2IDkuNDhsLTMuNzUgMy43NS0xLjQ4LTEuNDhMNC41MiA4IC43NyA0LjI1bDEuNDgtMS40OEw2IDYuNTJsMy43NS0zLjc1IDEuNDggMS40OHpcIi8+JyxcclxuXHRcdFx0dmlld0JveDogJzAgMCAxMiAxNidcclxuXHRcdH0sIHtcclxuXHRcdFx0aWQ6ICdhcnJvdy10b3AnLFxyXG5cdFx0XHRzdmc6ICc8cGF0aCBkPVwiTTUgM0wwIDloM3Y0aDRWOWgzelwiLz4nLFxyXG5cdFx0XHR2aWV3Qm94OiAnMCAwIDEwIDE2J1xyXG5cdFx0fSwge1xyXG5cdFx0XHRpZDogJ2Fycm93LXJpZ2h0JyxcclxuXHRcdFx0c3ZnOiAnPHBhdGggZD1cIk0xMCA4TDQgM3YzSDB2NGg0djN6XCIvPicsXHJcblx0XHRcdHZpZXdCb3g6ICcwIDAgMTAgMTYnXHJcblx0XHR9LCB7XHJcblx0XHRcdGlkOiAnYXJyb3ctYm90dG9tJyxcclxuXHRcdFx0c3ZnOiAnPHBhdGggZD1cIk03IDdWM0gzdjRIMGw1IDYgNS02elwiLz4nLFxyXG5cdFx0XHR2aWV3Qm94OiAnMCAwIDEwIDE2J1xyXG5cdFx0fSwge1xyXG5cdFx0XHRpZDogJ2Fycm93LWxlZnQnLFxyXG5cdFx0XHRzdmc6ICc8cGF0aCBkPVwiTTYgM0wwIDhsNiA1di0zaDRWNkg2elwiLz4nLFxyXG5cdFx0XHR2aWV3Qm94OiAnMCAwIDEwIDE2J1xyXG5cdFx0fSwge1xyXG5cdFx0XHRpZDogJ2NoZXZyb24tdG9wJyxcclxuXHRcdFx0c3ZnOiAnPHBhdGggZD1cIk0xNjAgMTI4bC0xNjAgMTYwIDY0IDY0IDk2LTk2IDk2IDk2IDY0LTY0LTE2MC0xNjB6XCIvPicsXHJcblx0XHRcdHZpZXdCb3g6ICcwIDAgMzIwIDUxMidcclxuXHRcdH0sIHtcclxuXHRcdFx0aWQ6ICdjaGV2cm9uLXJpZ2h0JyxcclxuXHRcdFx0c3ZnOiAnPHBhdGggZD1cIk02NCA5NmwtNjQgNjQgOTYgOTYtOTYgOTYgNjQgNjQgMTYwLTE2MC0xNjAtMTYwelwiLz4nLFxyXG5cdFx0XHR2aWV3Qm94OiAnMCAwIDIyNCA1MTInXHJcblx0XHR9LCB7XHJcblx0XHRcdGlkOiAnY2hldnJvbi1ib3R0b20nLFxyXG5cdFx0XHRzdmc6ICc8cGF0aCBkPVwiTTI1NiAxNjBsLTk2IDk2LTk2LTk2LTY0IDY0IDE2MCAxNjAgMTYwLTE2MC02NC02NHpcIi8+JyxcclxuXHRcdFx0dmlld0JveDogJzAgMCAzMjAgNTEyJ1xyXG5cdFx0fSwge1xyXG5cdFx0XHRpZDogJ2NoZXZyb24tbGVmdCcsXHJcblx0XHRcdHN2ZzogJzxwYXRoIGQ9XCJNMjI0IDE2MGwtNjQtNjQtMTYwIDE2MCAxNjAgMTYwIDY0LTY0LTk2LTk2IDk2LTk2elwiLz4nLFxyXG5cdFx0XHR2aWV3Qm94OiAnMCAwIDIyNCA1MTInXHJcblx0XHR9LCB7XHJcblx0XHRcdGlkOiAnZG9uZSxjaGVjaycsXHJcblx0XHRcdHN2ZzogJzxwYXRoIGQ9XCJNMzIwIDk2bC0xOTIgMTkyLTY0LTY0LTY0IDY0IDEyOCAxMjggMjU2LTI1Ni02NC02NHpcIi8+JyxcclxuXHRcdFx0dmlld0JveDogJzAgMCAzODQgNTEyJ1xyXG5cdFx0fSwge1xyXG5cdFx0XHRpZDogJ2VkaXQscGVuY2lsJyxcclxuXHRcdFx0c3ZnOiAnPHBhdGggZD1cIk0zNTIgMzJsLTY0IDY0IDk2IDk2IDY0LTY0LTk2LTk2ek0wIDM4NGwwLjM0NCA5Ni4yODEgOTUuNjU2LTAuMjgxIDI1Ni0yNTYtOTYtOTYtMjU2IDI1NnpNOTYgNDQ4aC02NHYtNjRoMzJ2MzJoMzJ2MzJ6XCIvPicsXHJcblx0XHRcdHZpZXdCb3g6ICcwIDAgNDQ4IDUxMidcclxuXHRcdH0sIHtcclxuXHRcdFx0aWQ6ICd0cmFzaCcsXHJcblx0XHRcdHN2ZzogJzxwYXRoIGQ9XCJNMTEgMkg5YzAtLjU1LS40NS0xLTEtMUg1Yy0uNTUgMC0xIC40NS0xIDFIMmMtLjU1IDAtMSAuNDUtMSAxdjFjMCAuNTUuNDUgMSAxIDF2OWMwIC41NS40NSAxIDEgMWg3Yy41NSAwIDEtLjQ1IDEtMVY1Yy41NSAwIDEtLjQ1IDEtMVYzYzAtLjU1LS40NS0xLTEtMXptLTEgMTJIM1Y1aDF2OGgxVjVoMXY4aDFWNWgxdjhoMVY1aDF2OXptMS0xMEgyVjNoOXYxelwiLz4nLFxyXG5cdFx0XHR2aWV3Qm94OiAnMCAwIDEyIDE2J1xyXG5cdFx0fSwge1xyXG5cdFx0XHRpZDogJ21lbnUnLFxyXG5cdFx0XHRzdmc6ICc8cGF0aCBkPVwiTTggNHYxSDBWNGg4ek0wIDhoOFY3SDB2MXptMCAzaDh2LTFIMHYxelwiLz4nLFxyXG5cdFx0XHR2aWV3Qm94OiAnMCAwIDggMTYnXHJcblx0XHR9LCB7XHJcblx0XHRcdGlkOiAnY29tbWVudCcsXHJcblx0XHRcdHN2ZzogJzxwYXRoIGQ9XCJNMTQgMUgyYy0uNTUgMC0xIC40NS0xIDF2OGMwIC41NS40NSAxIDEgMWgydjMuNUw3LjUgMTFIMTRjLjU1IDAgMS0uNDUgMS0xVjJjMC0uNTUtLjQ1LTEtMS0xem0wIDlIN2wtMiAydi0ySDJWMmgxMnY4elwiLz4nLFxyXG5cdFx0XHR2aWV3Qm94OiAnMCAwIDE2IDE2J1xyXG5cdFx0fSwge1xyXG5cdFx0XHRpZDogJ2ZpbGUnLFxyXG5cdFx0XHRzdmc6ICc8cGF0aCBkPVwiTTYgNUgyVjRoNHYxek0yIDhoN1Y3SDJ2MXptMCAyaDdWOUgydjF6bTAgMmg3di0xSDJ2MXptMTAtNy41VjE0YzAgLjU1LS40NSAxLTEgMUgxYy0uNTUgMC0xLS40NS0xLTFWMmMwLS41NS40NS0xIDEtMWg3LjVMMTIgNC41ek0xMSA1TDggMkgxdjEyaDEwVjV6XCIvPicsXHJcblx0XHRcdHZpZXdCb3g6ICcwIDAgMTIgMTYnXHJcblx0XHR9LCB7XHJcblx0XHRcdGlkOiAnY29nLGdlYXInLFxyXG5cdFx0XHRzdmc6ICc8cGF0aCBkPVwiTTE0IDguNzd2LTEuNmwtMS45NC0uNjQtLjQ1LTEuMDkuODgtMS44NC0xLjEzLTEuMTMtMS44MS45MS0xLjA5LS40NS0uNjktMS45MmgtMS42bC0uNjMgMS45NC0xLjExLjQ1LTEuODQtLjg4LTEuMTMgMS4xMy45MSAxLjgxLS40NSAxLjA5TDAgNy4yM3YxLjU5bDEuOTQuNjQuNDUgMS4wOS0uODggMS44NCAxLjEzIDEuMTMgMS44MS0uOTEgMS4wOS40NS42OSAxLjkyaDEuNTlsLjYzLTEuOTQgMS4xMS0uNDUgMS44NC44OCAxLjEzLTEuMTMtLjkyLTEuODEuNDctMS4wOUwxNCA4Ljc1di4wMnpNNyAxMWMtMS42NiAwLTMtMS4zNC0zLTNzMS4zNC0zIDMtMyAzIDEuMzQgMyAzLTEuMzQgMy0zIDN6XCIvPicsXHJcblx0XHRcdHZpZXdCb3g6ICcwIDAgMTQgMTYnXHJcblx0XHR9LCB7XHJcblx0XHRcdGlkOiAnbGluaycsXHJcblx0XHRcdHN2ZzogJzxwYXRoIGQ9XCJNNCA5aDF2MUg0Yy0xLjUgMC0zLTEuNjktMy0zLjVTMi41NSAzIDQgM2g0YzEuNDUgMCAzIDEuNjkgMyAzLjUgMCAxLjQxLS45MSAyLjcyLTIgMy4yNVY4LjU5Yy41OC0uNDUgMS0xLjI3IDEtMi4wOUMxMCA1LjIyIDguOTggNCA4IDRINGMtLjk4IDAtMiAxLjIyLTIgMi41UzMgOSA0IDl6bTktM2gtMXYxaDFjMSAwIDIgMS4yMiAyIDIuNVMxMy45OCAxMiAxMyAxMkg5Yy0uOTggMC0yLTEuMjItMi0yLjUgMC0uODMuNDItMS42NCAxLTIuMDlWNi4yNWMtMS4wOS41My0yIDEuODQtMiAzLjI1QzYgMTEuMzEgNy41NSAxMyA5IDEzaDRjMS40NSAwIDMtMS42OSAzLTMuNVMxNC41IDYgMTMgNnpcIi8+JyxcclxuXHRcdFx0dmlld0JveDogJzAgMCAxNiAxNidcclxuXHRcdH0sIHtcclxuXHRcdFx0aWQ6ICdsaW5rLWV4dGVybmFsJyxcclxuXHRcdFx0c3ZnOiAnPHBhdGggZD1cIk0xMSAxMGgxdjNjMCAuNTUtLjQ1IDEtMSAxSDFjLS41NSAwLTEtLjQ1LTEtMVYzYzAtLjU1LjQ1LTEgMS0xaDN2MUgxdjEwaDEwdi0zek02IDJsMi4yNSAyLjI1TDUgNy41IDYuNSA5bDMuMjUtMy4yNUwxMiA4VjJINnpcIi8+JyxcclxuXHRcdFx0dmlld0JveDogJzAgMCAxMiAxNidcclxuXHRcdH0sIHtcclxuXHRcdFx0aWQ6ICdtYWlsJyxcclxuXHRcdFx0c3ZnOiAnPHBhdGggZD1cIk0wIDR2OGMwIC41NS40NSAxIDEgMWgxMmMuNTUgMCAxLS40NSAxLTFWNGMwLS41NS0uNDUtMS0xLTFIMWMtLjU1IDAtMSAuNDUtMSAxem0xMyAwTDcgOSAxIDRoMTJ6TTEgNS41bDQgMy00IDN2LTZ6TTIgMTJsMy41LTNMNyAxMC41IDguNSA5bDMuNSAzSDJ6bTExLS41bC00LTMgNC0zdjZ6XCIvPicsXHJcblx0XHRcdHZpZXdCb3g6ICcwIDAgMTQgMTYnXHJcblx0XHR9LCB7XHJcblx0XHRcdGlkOiAnc2VhcmNoJyxcclxuXHRcdFx0c3ZnOiAnPHBhdGggZD1cIk0xNS43IDEzLjNsLTMuODEtMy44M0E1LjkzIDUuOTMgMCAwIDAgMTMgNmMwLTMuMzEtMi42OS02LTYtNlMxIDIuNjkgMSA2czIuNjkgNiA2IDZjMS4zIDAgMi40OC0uNDEgMy40Ny0xLjExbDMuODMgMy44MWMuMTkuMi40NS4zLjcuMy4yNSAwIC41Mi0uMDkuNy0uM2EuOTk2Ljk5NiAwIDAgMCAwLTEuNDF2LjAxek03IDEwLjdjLTIuNTkgMC00LjctMi4xMS00LjctNC43IDAtMi41OSAyLjExLTQuNyA0LjctNC43IDIuNTkgMCA0LjcgMi4xMSA0LjcgNC43IDAgMi41OS0yLjExIDQuNy00LjcgNC43elwiLz4nLFxyXG5cdFx0XHR2aWV3Qm94OiAnMCAwIDE2IDE2J1xyXG5cdFx0fSwge1xyXG5cdFx0XHRpZDogJ3phcCcsXHJcblx0XHRcdHN2ZzogJzxwYXRoIGQ9XCJNMTAgN0g2bDMtNy05IDloNGwtMyA3elwiLz4nLFxyXG5cdFx0XHR2aWV3Qm94OiAnMCAwIDEwIDE2J1xyXG5cdFx0fV07XHJcblxyXG5cdFx0dGhpcy5hZGQgPSBpY29uID0+IHtcclxuXHRcdFx0aWNvbnMudW5zaGlmdChpY29uKTtcclxuXHRcdFx0cmV0dXJuIHRoaXM7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuJGdldCA9ICgpID0+IGljb25zO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gdWV4SWNvbih1ZXhJY29ucykge1xyXG5cdFx0dmFyIGljb25zID0gdWV4SWNvbnM7XHJcblxyXG5cdFx0ZnVuY3Rpb24gaWRFeGlzdHMoaWRzLCBpZCkge1xyXG5cdFx0XHR2YXIgYWxsID0gaWRzLnNwbGl0KCcsJyk7XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgYWxsLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0aWYgKGFsbFtpXS50cmltKCkgPT09IGlkKVxyXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGZpbmRJY29uQnlJZChpZCkge1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGljb25zLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0dmFyIGljb24gPSBpY29uc1tpXTtcclxuXHJcblx0XHRcdFx0aWYgKGlkRXhpc3RzKGljb24uaWQsIGlkKSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIGljb247XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcigndWV4SWNvbjogXCInICsgaWQgKyAnXCIgaGFzIG5vdCBiZWVuIGZvdW5kLicpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIHdyYXAoY29udGVudCwgdmlld0JveCkge1xyXG5cdFx0XHR2aWV3Qm94ID0gdmlld0JveCB8fCAnMCAwIDUxMiA1MTInO1xyXG5cdFx0XHRyZXR1cm4gJzxzdmcgdmVyc2lvbj1cIjEuMVwiIHg9XCIwcHhcIiB5PVwiMHB4XCIgdmlld0JveD1cIicgKyB2aWV3Qm94ICsgJ1wiPicgKyBjb250ZW50ICsgJzwvc3ZnPic7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0cmVzdHJpY3Q6ICdFQScsXHJcblx0XHRcdGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMpIHtcclxuXHRcdFx0XHR2YXIgaWQsIGljb247XHJcblx0XHRcdFx0aWYgKCRhdHRycy51ZXhJY29uKSB7XHJcblx0XHRcdFx0XHRpZCA9ICRhdHRycy51ZXhJY29uO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRpZCA9ICRhdHRycy5pY29uO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0aWNvbiA9IGZpbmRJY29uQnlJZChpZCk7XHJcblx0XHRcdFx0aWYgKCFpY29uLnN2Zykge1xyXG5cdFx0XHRcdFx0aWNvbiA9IGZpbmRJY29uQnlJZChpY29uLnJlZik7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHR2YXIgY29udGVudCA9IHdyYXAoaWNvbi5zdmcsIGljb24udmlld0JveCB8fCBpY29uLnZpZXdib3gpO1xyXG5cdFx0XHRcdCRlbGVtZW50LmVtcHR5KCk7XHJcblx0XHRcdFx0JGVsZW1lbnQuYXBwZW5kKGNvbnRlbnQpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxufSkoKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdGFuZ3VsYXJcclxuXHRcdC5tb2R1bGUoJ21yLnVleCcpXHJcblx0XHQuZGlyZWN0aXZlKCd1ZXhBbGlhcycsIHVleEFsaWFzKTtcclxuXHJcblx0ZnVuY3Rpb24gdWV4QWxpYXMoKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRyZXN0cmljdDogJ0EnLFxyXG5cdFx0XHRsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzKSB7XHJcblx0XHRcdFx0dmFyIGV4cHIgPSAkYXR0cnMudWV4QWxpYXMsXHJcblx0XHRcdFx0XHRwYXJ0cyA9IGV4cHIuc3BsaXQoJyAnKSxcclxuXHRcdFx0XHRcdHNvdXJjZSA9IHBhcnRzWzBdLFxyXG5cdFx0XHRcdFx0ZGVzdCA9IHBhcnRzWzFdO1xyXG5cclxuXHRcdFx0XHQkc2NvcGUuJHdhdGNoKCgpID0+ICRzY29wZS4kZXZhbChzb3VyY2UpLCAobiwgbykgPT4ge1xyXG5cdFx0XHRcdFx0JHNjb3BlW2Rlc3RdID0gbjtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcbn0pKCk7XHJcbiIsIihmdW5jdGlvbiAoKSB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cclxuXHRhbmd1bGFyXHJcblx0XHQubW9kdWxlKCdtci51ZXgnKVxyXG5cdFx0LmRpcmVjdGl2ZSgndWV4Rm9jdXMnLCB1ZXhGb2N1cyk7XHJcblxyXG5cdGZ1bmN0aW9uIHVleEZvY3VzKCR0aW1lb3V0KSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRyZXN0cmljdDogJ0EnLFxyXG5cdFx0XHRsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzKSB7XHJcblx0XHRcdFx0JHNjb3BlLiRvbigndWV4LmZvY3VzJywgKCkgPT4ge1xyXG5cdFx0XHRcdFx0JHRpbWVvdXQoJGVsZW1lbnQuZm9jdXMpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxufSkoKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdGFuZ3VsYXJcclxuXHRcdC5tb2R1bGUoJ21yLnVleCcpXHJcblx0XHQuZmFjdG9yeSgndWV4UG9zaXRpb25lcicsIHBvc2l0aW9uZXIpO1xyXG5cclxuXHRmdW5jdGlvbiBwb3NpdGlvbmVyKCkge1xyXG5cdFx0dmFyICR3aW5kb3csXHJcblx0XHRcdCRib2R5O1xyXG5cclxuXHRcdGZ1bmN0aW9uIGVuc3VyZSgpIHtcclxuXHRcdFx0aWYgKCR3aW5kb3cpIHJldHVybjtcclxuXHJcblx0XHRcdCR3aW5kb3cgPSAkKHdpbmRvdyk7XHJcblx0XHRcdCRib2R5ID0gJChkb2N1bWVudC5ib2R5KTtcclxuXHRcdH1cclxuXHJcblx0XHRlbnN1cmUoKTtcclxuXHJcblx0XHRmdW5jdGlvbiBwYXJzZVBsYWNlbWVudChwbGFjZW1lbnQpIHtcclxuXHRcdFx0dmFyIHJldCA9IHt9LFxyXG5cdFx0XHRcdGFyciA9IHBsYWNlbWVudC5zcGxpdCgnICcpO1xyXG5cdFx0XHRyZXQucGxhY2UgPSBhcnJbMF07XHJcblx0XHRcdHJldC5hbGlnbiA9IGFyclsxXTtcclxuXHRcdFx0cmV0dXJuIHJldDtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBtZWFzdXJlKGVsZW1lbnQsIGZuKSB7XHJcblx0XHRcdHZhciBlbCA9IGVsZW1lbnQuY2xvbmUoZmFsc2UpO1xyXG5cdFx0XHRlbC5jc3MoJ3Zpc2liaWxpdHknLCAnaGlkZGVuJyk7XHJcblx0XHRcdGVsLmNzcygncG9zaXRpb24nLCAnYWJzb2x1dGUnKTtcclxuXHRcdFx0JGJvZHkuYXBwZW5kKGVsKTtcclxuXHRcdFx0dmFyIHJlc3VsdCA9IGZuKGVsKTtcclxuXHRcdFx0ZWwucmVtb3ZlKCk7XHJcblx0XHRcdHJldHVybiByZXN1bHQ7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gY29tcHV0ZUxlZnRGb3JWZXJ0aWNhbCh0cCwgZXAsIG9mZnNldCwgYWxpZ24pIHtcclxuXHRcdFx0c3dpdGNoIChhbGlnbikge1xyXG5cdFx0XHRcdGNhc2UgJ3N0YXJ0JzpcclxuXHRcdFx0XHRcdG9mZnNldC5sZWZ0ID0gdHAubGVmdDtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRjYXNlICdjZW50ZXInOlxyXG5cdFx0XHRcdFx0b2Zmc2V0LmxlZnQgPSB0cC5sZWZ0ICsgKHRwLndpZHRoIC8gMikgLSAoZXAud2lkdGggLyAyKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRjYXNlICdlbmQnOlxyXG5cdFx0XHRcdFx0b2Zmc2V0LmxlZnQgPSB0cC5sZWZ0ICsgdHAud2lkdGggLSBlcC53aWR0aDtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gY29tcHV0ZVRvcEZvckhvcml6b250YWwodHAsIGVwLCBvZmZzZXQsIGFsaWduKSB7XHJcblx0XHRcdHN3aXRjaCAoYWxpZ24pIHtcclxuXHRcdFx0XHRjYXNlICdzdGFydCc6XHJcblx0XHRcdFx0XHRvZmZzZXQudG9wID0gdHAudG9wO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdGNhc2UgJ2NlbnRlcic6XHJcblx0XHRcdFx0XHRvZmZzZXQudG9wID0gdHAudG9wICsgKHRwLmhlaWdodCAvIDIpIC0gKGVwLmhlaWdodCAvIDIpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdGNhc2UgJ2VuZCc6XHJcblx0XHRcdFx0XHRvZmZzZXQudG9wID0gdHAudG9wICsgdHAuaGVpZ2h0IC0gZXAuaGVpZ2h0O1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBjb21wdXRlT2Zmc2V0KGNvbnRleHQsIG9wdGlvbnMpIHtcclxuXHRcdFx0dmFyIHBsYWNlID0gb3B0aW9ucy5wbGFjZSxcclxuXHRcdFx0XHRhbGlnbiA9IG9wdGlvbnMuYWxpZ24sXHJcblx0XHRcdFx0byA9IG9wdGlvbnMub2Zmc2V0LFxyXG5cdFx0XHRcdGVwID0gY29udGV4dC5lcCxcclxuXHRcdFx0XHR0cCA9IGNvbnRleHQudHA7XHJcblxyXG5cdFx0XHR2YXIgb2Zmc2V0ID0ge1xyXG5cdFx0XHRcdHRvcDogMCxcclxuXHRcdFx0XHRsZWZ0OiAwXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRzd2l0Y2ggKHBsYWNlKSB7XHJcblx0XHRcdFx0Y2FzZSAndG9wJzpcclxuXHRcdFx0XHRcdG9mZnNldC50b3AgPSB0cC50b3AgLSBlcC5oZWlnaHQgLSBvO1xyXG5cdFx0XHRcdFx0Y29tcHV0ZUxlZnRGb3JWZXJ0aWNhbCh0cCwgZXAsIG9mZnNldCwgYWxpZ24pO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdGNhc2UgJ3JpZ2h0JzpcclxuXHRcdFx0XHRcdG9mZnNldC5sZWZ0ID0gdHAubGVmdCArIHRwLndpZHRoICsgbztcclxuXHRcdFx0XHRcdGNvbXB1dGVUb3BGb3JIb3Jpem9udGFsKHRwLCBlcCwgb2Zmc2V0LCBhbGlnbik7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0Y2FzZSAnYm90dG9tJzpcclxuXHRcdFx0XHRcdG9mZnNldC50b3AgPSB0cC50b3AgKyB0cC5oZWlnaHQgKyBvO1xyXG5cdFx0XHRcdFx0Y29tcHV0ZUxlZnRGb3JWZXJ0aWNhbCh0cCwgZXAsIG9mZnNldCwgYWxpZ24pO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdGNhc2UgJ2xlZnQnOlxyXG5cdFx0XHRcdFx0b2Zmc2V0LmxlZnQgPSB0cC5sZWZ0IC0gZXAud2lkdGggLSBvO1xyXG5cdFx0XHRcdFx0Y29tcHV0ZVRvcEZvckhvcml6b250YWwodHAsIGVwLCBvZmZzZXQsIGFsaWduKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gb2Zmc2V0O1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGNvYXJzZU9mZnNldChjb250ZXh0LCBvcHRpb25zKSB7XHJcblx0XHRcdHZhciBvZmZzZXQgPSBjb250ZXh0Lm9mZnNldCxcclxuXHRcdFx0XHRtYXJnaW4gPSBvcHRpb25zLm1hcmdpbiB8fCAwLFxyXG5cdFx0XHRcdHNjcm9sbFRvcCA9ICR3aW5kb3cuc2Nyb2xsVG9wKCksXHJcblx0XHRcdFx0Z3AgPSB7XHJcblx0XHRcdFx0XHRsZWZ0OiBtYXJnaW4sXHJcblx0XHRcdFx0XHR0b3A6IG1hcmdpbixcclxuXHRcdFx0XHRcdHdpZHRoOiAkd2luZG93LndpZHRoKCkgLSBtYXJnaW4gKiAyLFxyXG5cdFx0XHRcdFx0aGVpZ2h0OiAkd2luZG93LmhlaWdodCgpIC0gbWFyZ2luICogMlxyXG5cdFx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBDb2Fyc2UgbGVmdFxyXG5cdFx0XHRpZiAob2Zmc2V0LmxlZnQgKyBjb250ZXh0LmVwLndpZHRoID4gZ3Aud2lkdGgpIHtcclxuXHRcdFx0XHRvZmZzZXQubGVmdCAtPSBvZmZzZXQubGVmdCArIGNvbnRleHQuZXAud2lkdGggLSBncC53aWR0aDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ29hcnNlIHRvcFxyXG5cdFx0XHRpZiAob2Zmc2V0LnRvcCArIGNvbnRleHQuZXAuaGVpZ2h0ID4gZ3AuaGVpZ2h0ICsgc2Nyb2xsVG9wKSB7XHJcblx0XHRcdFx0b2Zmc2V0LnRvcCAtPSBvZmZzZXQudG9wICsgY29udGV4dC5lcC5oZWlnaHQgLSBncC5oZWlnaHQgLSBzY3JvbGxUb3A7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENvYXJzZSBuZWdhdGl2ZXNcclxuXHRcdFx0aWYgKG9mZnNldC5sZWZ0IDwgZ3AubGVmdCkgb2Zmc2V0LmxlZnQgPSBncC5sZWZ0O1xyXG5cdFx0XHRpZiAob2Zmc2V0LnRvcCA8IGdwLnRvcCArIHNjcm9sbFRvcCkgb2Zmc2V0LnRvcCA9IGdwLnRvcCArIHNjcm9sbFRvcDtcclxuXHJcblx0XHRcdC8vIFNldCBtYXhXaWR0aFxyXG5cdFx0XHRvZmZzZXQubWF4V2lkdGggPSBncC53aWR0aDtcclxuXHJcblx0XHRcdC8vIFNldCBtYXhIZWlnaHRcclxuXHRcdFx0b2Zmc2V0Lm1heEhlaWdodCA9IGdwLmhlaWdodDtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBtZWFzdXJpbmcob3B0aW9ucywgZm4pIHtcclxuXHRcdFx0aWYgKG9wdGlvbnMuc3R1YiA9PT0gdHJ1ZSkge1xyXG5cdFx0XHRcdG1lYXN1cmUob3B0aW9ucy5lbGVtZW50LCBmbik7XHJcblx0XHRcdH0gZWxzZSBpZiAob3B0aW9ucy5zdHViKSB7XHJcblx0XHRcdFx0Zm4ob3B0aW9ucy5zdHViKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRmbihvcHRpb25zLmVsZW1lbnQpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gdGFyZ2V0OiB0aGUgdGFyZ2V0IGVsZW1lbnRcclxuXHRcdC8vIGVsZW1lbnQ6IHRoZSBlbGVtZW50IHRvIGJlIHBvc2l0aW9uZWRcclxuXHRcdC8vIHBsYWNlbWVudDogW3RvcCwgcmlnaHQsIGJvdHRvbSwgbGVmdF0gW3N0YXJ0LCBjZW50ZXIsIGVuZF1cclxuXHRcdC8vIG1hcmdpbjogdGhlIG1hcmdpbiBmcm9tIHRoZSBvdXRlciB3aW5kb3dcclxuXHRcdC8vIG9mZnNldDogdGhlIG9mZnNldCBmcm9tIHRoZSB0YXJnZXRcclxuXHRcdC8vIHN0dWI6IHRydWUgdG8gc3R1YiB0aGUgZWxlbWVudCBiZWZvcmUgbWVhc3VyaW5nLCBvciB0aGUgc3R1YiBlbGVtZW50IGl0c2VsZlxyXG5cdFx0Ly9cclxuXHRcdHZhciBmdW5jID0gb3B0aW9ucyA9PiB7XHJcblx0XHRcdG9wdGlvbnMubWFyZ2luID0gb3B0aW9ucy5tYXJnaW4gfHwgNTtcclxuXHRcdFx0b3B0aW9ucy5vZmZzZXQgPSBvcHRpb25zLm9mZnNldCB8fCA1O1xyXG5cdFx0XHRpZiAob3B0aW9ucy5wbGFjZW1lbnQpIHtcclxuXHRcdFx0XHRvcHRpb25zLnBsYWNlbWVudE9iamVjdCA9IHBhcnNlUGxhY2VtZW50KG9wdGlvbnMucGxhY2VtZW50KTtcclxuXHRcdFx0XHRvcHRpb25zLnBsYWNlID0gb3B0aW9ucy5wbGFjZW1lbnRPYmplY3QucGxhY2U7XHJcblx0XHRcdFx0b3B0aW9ucy5hbGlnbiA9IG9wdGlvbnMucGxhY2VtZW50T2JqZWN0LmFsaWduO1xyXG5cdFx0XHR9XHJcblx0XHRcdG9wdGlvbnMucGxhY2UgPSBvcHRpb25zLnBsYWNlIHx8ICdib3R0b20nO1xyXG5cdFx0XHRvcHRpb25zLmFsaWduID0gb3B0aW9ucy5hbGlnbiB8fCAnc3RhcnQnO1xyXG5cclxuXHRcdFx0dmFyIHRhcmdldCA9IG9wdGlvbnMudGFyZ2V0LFxyXG5cdFx0XHRcdGVsZW1lbnQgPSBvcHRpb25zLmVsZW1lbnQsXHJcblx0XHRcdFx0dGFyZ2V0T2Zmc2V0ID0gdGFyZ2V0Lm9mZnNldCgpO1xyXG5cclxuXHRcdFx0dmFyIHRwID0ge1xyXG5cdFx0XHRcdHRvcDogdGFyZ2V0T2Zmc2V0LnRvcCxcclxuXHRcdFx0XHRsZWZ0OiB0YXJnZXRPZmZzZXQubGVmdCxcclxuXHRcdFx0XHR3aWR0aDogdGFyZ2V0Lm91dGVyV2lkdGgoKSxcclxuXHRcdFx0XHRoZWlnaHQ6IHRhcmdldC5vdXRlckhlaWdodCgpXHJcblx0XHRcdH07XHJcblx0XHRcdHZhciBlcCA9IHt9O1xyXG5cdFx0XHRtZWFzdXJpbmcob3B0aW9ucywgZWwgPT4ge1xyXG5cdFx0XHRcdGVwLndpZHRoID0gZWwub3V0ZXJXaWR0aCgpO1xyXG5cdFx0XHRcdGVwLmhlaWdodCA9IGVsLm91dGVySGVpZ2h0KCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0XHR2YXIgY29udGV4dCA9IHtcclxuXHRcdFx0XHR0YXJnZXQ6IHRhcmdldCxcclxuXHRcdFx0XHRlbGVtZW50OiBlbGVtZW50LFxyXG5cdFx0XHRcdHRwOiB0cCxcclxuXHRcdFx0XHRlcDogZXBcclxuXHRcdFx0fTtcclxuXHRcdFx0dmFyIG9mZnNldCA9IGNvbXB1dGVPZmZzZXQoY29udGV4dCwgb3B0aW9ucyk7XHJcblx0XHRcdGNvbnRleHQub2Zmc2V0ID0gb2Zmc2V0O1xyXG5cdFx0XHRjb2Fyc2VPZmZzZXQoY29udGV4dCwgb3B0aW9ucyk7XHJcblx0XHRcdGNvbnRleHQuZXAubGVmdCA9IG9mZnNldC5sZWZ0O1xyXG5cdFx0XHRjb250ZXh0LmVwLnRvcCA9IG9mZnNldC50b3A7XHJcblxyXG5cdFx0XHRyZXR1cm4gY29udGV4dDtcclxuXHRcdH07XHJcblxyXG5cdFx0ZnVuYy5hcHBseSA9IChjb250ZXh0KSA9PiB7XHJcblx0XHRcdHZhciBlbGVtZW50ID0gY29udGV4dC5lbGVtZW50LFxyXG5cdFx0XHRcdG9mZnNldCA9IGNvbnRleHQub2Zmc2V0O1xyXG5cclxuXHRcdFx0ZWxlbWVudC5jc3MoJ3RvcCcsIG9mZnNldC50b3ApO1xyXG5cdFx0XHRlbGVtZW50LmNzcygnbGVmdCcsIG9mZnNldC5sZWZ0KTtcclxuXHRcdFx0aWYgKG9mZnNldC5tYXhXaWR0aCkge1xyXG5cdFx0XHRcdGVsZW1lbnQuY3NzKCdtYXgtd2lkdGgnLCBvZmZzZXQubWF4V2lkdGgpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChvZmZzZXQubWF4SGVpZ2h0KSB7XHJcblx0XHRcdFx0ZWxlbWVudC5jc3MoJ21heC1oZWlnaHQnLCBvZmZzZXQubWF4SGVpZ2h0KTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHRmdW5jLnBhcnNlUGxhY2VtZW50ID0gcGFyc2VQbGFjZW1lbnQ7XHJcblxyXG5cdFx0cmV0dXJuIGZ1bmM7XHJcblx0fVxyXG59KSgpO1xyXG4iLCIoZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0YW5ndWxhclxyXG5cdFx0Lm1vZHVsZSgnbXIudWV4JylcclxuXHRcdC5mYWN0b3J5KCd1ZXhQb3NpdGlvbmluZ1Rocm90dGxlcicsIHBvc2l0aW9uaW5nVGhyb3R0bGVyKTtcclxuXHJcblx0ZnVuY3Rpb24gbm93KCkge1xyXG5cdFx0cmV0dXJuICtuZXcgRGF0ZSgpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gcmVtb3ZlKGFycmF5LCBpdGVtKSB7XHJcblx0XHR2YXIgaW5kZXggPSBhcnJheS5pbmRleE9mKGl0ZW0pO1xyXG5cdFx0YXJyYXkuc3BsaWNlKGluZGV4LCAxKTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHBvc2l0aW9uaW5nVGhyb3R0bGVyKCkge1xyXG5cdFx0dmFyIGhhbmRsZXJzID0gW10sXHJcblx0XHRcdCR3aW5kb3cgPSAkKHdpbmRvdyksXHJcblx0XHRcdGxhc3RDYWxsID0gbnVsbCxcclxuXHRcdFx0bGFzdER1cmF0aW9uID0gbnVsbCxcclxuXHRcdFx0cGVuZGluZ1RpbWVvdXQgPSBudWxsO1xyXG5cclxuXHRcdHZhciBnZXRDb250ZXh0ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdGNsaWVudDoge1xyXG5cdFx0XHRcdFx0aGVpZ2h0OiAkd2luZG93LmhlaWdodCgpLFxyXG5cdFx0XHRcdFx0d2lkdGg6ICR3aW5kb3cud2lkdGgoKSxcclxuXHRcdFx0XHRcdHRvcDogJHdpbmRvdy5zY3JvbGxUb3AoKVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHRcdH07XHJcblxyXG5cdFx0ZnVuY3Rpb24gaGFuZGxlclNhdGlzZmllcyhldmVudHMsIGUpIHtcclxuXHRcdFx0aWYgKCFldmVudHMpIHtcclxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0XHR2YXIgdHlwZSA9IGUudHlwZSxcclxuXHRcdFx0XHRmb3VuZCA9IGZhbHNlO1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGV2ZW50cy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdGlmIChldmVudHNbaV0gPT09IHR5cGUpIGZvdW5kID0gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gZm91bmQ7XHJcblx0XHR9XHJcblxyXG5cdFx0dmFyIHByb2Nlc3NIYW5kbGVycyA9IGUgPT4ge1xyXG5cdFx0XHR2YXIgY29udGV4dCA9IGdldENvbnRleHQoKTtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBoYW5kbGVycy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdHZhciBjb21wb3NpdGUgPSBoYW5kbGVyc1tpXSxcclxuXHRcdFx0XHRcdGhhbmRsZXIgPSBjb21wb3NpdGUuaGFuZGxlcixcclxuXHRcdFx0XHRcdGV2ZW50cyA9IGNvbXBvc2l0ZS5ldmVudHM7XHJcblx0XHRcdFx0aWYgKGUgJiYgIWhhbmRsZXJTYXRpc2ZpZXMoZXZlbnRzLCBlKSkgIHtcclxuXHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRoYW5kbGVyKGNvbnRleHQpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdHZhciB0aWNrID0gZnVuY3Rpb24gKGUpIHtcclxuXHRcdFx0aWYgKHR5cGVvZiBsYXN0RHVyYXRpb24gIT09ICd1bmRlZmluZWQnICYmIGxhc3REdXJhdGlvbiA+IDE2KSB7XHJcblx0XHRcdFx0bGFzdER1cmF0aW9uID0gTWF0aC5taW4obGFzdER1cmF0aW9uIC0gMTYsIDI1MCk7XHJcblxyXG5cdFx0XHRcdHBlbmRpbmdUaW1lb3V0ID0gc2V0VGltZW91dCh0aWNrLCAyNTApO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKHR5cGVvZiBsYXN0Q2FsbCAhPT0gJ3VuZGVmaW5lZCcgJiYgbm93KCkgLSBsYXN0Q2FsbCA8IDEwKSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAodHlwZW9mIHBlbmRpbmdUaW1lb3V0ICE9PSAndW5kZWZpbmVkJykge1xyXG5cdFx0XHRcdGNsZWFyVGltZW91dChwZW5kaW5nVGltZW91dCk7XHJcblx0XHRcdFx0cGVuZGluZ1RpbWVvdXQgPSBudWxsO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRsYXN0Q2FsbCA9IG5vdygpO1xyXG5cdFx0XHRwcm9jZXNzSGFuZGxlcnMoZSk7XHJcblx0XHRcdGxhc3REdXJhdGlvbiA9IG5vdygpIC0gbGFzdENhbGw7XHJcblx0XHR9O1xyXG5cclxuXHRcdCQoKCkgPT4ge1xyXG5cdFx0XHRwcm9jZXNzSGFuZGxlcnMoKTtcclxuXHRcdFx0WydyZXNpemUnLCAnc2Nyb2xsJywgJ3RvdWNobW92ZSddLmZvckVhY2goZXZlbnQgPT4ge1xyXG5cdFx0XHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCB0aWNrKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRzdWJzY3JpYmU6IChoYW5kbGVyLCBldmVudHMpID0+IHtcclxuXHRcdFx0XHRpZiAoYW5ndWxhci5pc1N0cmluZyhldmVudHMpKSB7XHJcblx0XHRcdFx0XHRldmVudHMgPSBbZXZlbnRzXTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0aGFuZGxlcnMucHVzaCh7aGFuZGxlcjogaGFuZGxlciwgZXZlbnRzOiBldmVudHN9KTtcclxuXHRcdFx0XHRwcm9jZXNzSGFuZGxlcnMoKTtcclxuXHRcdFx0XHRyZXR1cm4gKCkgPT4ge1xyXG5cdFx0XHRcdFx0cmVtb3ZlKGhhbmRsZXJzLCBoYW5kbGVyKTtcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxufSkoKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdGFuZ3VsYXJcclxuXHRcdC5tb2R1bGUoJ21yLnVleCcpXHJcblx0XHQuZmFjdG9yeSgndWV4VXRpbCcsIHV0aWwpO1xyXG5cclxuXHRmdW5jdGlvbiB1dGlsKCkge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0Y2FtZWxUb0Rhc2g6IHN0ciA9PiB7XHJcblx0XHRcdFx0cmV0dXJuIHN0ci5yZXBsYWNlKC9cXFcrL2csICctJykucmVwbGFjZSgvKFthLXpcXGRdKShbQS1aXSkvZywgJyQxLSQyJyk7XHJcblx0XHRcdH0sXHJcblx0XHRcdGRhc2hUb0NhbWVsOiBzdHIgPT4ge1xyXG5cdFx0XHRcdHJldHVybiBzdHIucmVwbGFjZSgvXFxXKyguKS9nLCAoeCwgY2hyKSA9PiBjaHIudG9VcHBlckNhc2UoKSk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG59KSgpO1xyXG4iLCIoZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0YW5ndWxhclxyXG5cdFx0Lm1vZHVsZSgnbXIudWV4JylcclxuXHRcdC5mYWN0b3J5KCd1ZXhNb2RhbCcsIG1vZGFsKTtcclxuXHJcblx0ZnVuY3Rpb24gbW9kYWwoJHJvb3RTY29wZSwgJGNvbXBpbGUsICRjb250cm9sbGVyLCAkYW5pbWF0ZSwgJHRlbXBsYXRlUmVxdWVzdCwgJHEsIHVleFV0aWwpIHtcclxuXHRcdHZhciBpbnN0YW5jZXMgPSBbXSxcclxuXHRcdFx0JGJvZHkgPSAkKGRvY3VtZW50LmJvZHkpLFxyXG5cdFx0XHQkYmQgPSBhbmd1bGFyLmVsZW1lbnQoJzxkaXYgY2xhc3M9XCJ1ZXgtbW9kYWwtYmRcIiAvPicpO1xyXG5cclxuXHRcdCRib2R5Lm9uKCdrZXlkb3duJywgZSA9PiB7XHJcblx0XHRcdGlmICghZS5pc0RlZmF1bHRQcmV2ZW50ZWQoKSAmJiBlLndoaWNoID09PSAyNykge1xyXG5cdFx0XHRcdCRyb290U2NvcGUuJGFwcGx5KCgpID0+IHtcclxuXHRcdFx0XHRcdGRpc21pc3NUb3BNb2RhbChlKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gb3B0aW9uczpcclxuXHRcdC8vICAgc2NvcGVcclxuXHRcdC8vICAgdGVtcGxhdGUgLSB0ZW1wbGF0ZVVybFxyXG5cdFx0Ly8gICBjb21wb25lbnRcclxuXHRcdC8vICAgdGl0bGVcclxuXHRcdC8vICAgY2xhc3Nlc1xyXG5cdFx0Ly8gICBsb2NhbHNcclxuXHRcdC8vXHJcblx0XHR2YXIgZnVuYyA9IG9wdGlvbnMgPT4ge1xyXG5cdFx0XHRvcHRpb25zID0gYW5ndWxhci5pc1N0cmluZyhvcHRpb25zKSA/IHsgY29tcG9uZW50OiBvcHRpb25zIH0gOiBvcHRpb25zO1xyXG5cdFx0XHR2YXIgc2NvcGUgPSAob3B0aW9ucy5zY29wZSB8fCAkcm9vdFNjb3BlKS4kbmV3KCksXHJcblx0XHRcdFx0JGVsZW1lbnQgPSAkKGdldFRlbXBsYXRlTW9kYWxDb250YWluZXIob3B0aW9ucykpO1xyXG5cclxuXHRcdFx0dmFyIGRlc3Ryb3lBbmRDbGVhbiA9IGluc3RhbmNlID0+IHtcclxuXHRcdFx0XHRpbnN0YW5jZS5zY29wZS4kZGVzdHJveSgpO1xyXG5cdFx0XHRcdHZhciBkZWxlZ2F0ZXMgPSBpbnN0YW5jZS5fZGVsZWdhdGVzO1xyXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZGVsZWdhdGVzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0XHRkZWxlZ2F0ZXNbaV0oKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHR2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpLFxyXG5cdFx0XHRcdGluc3RhbmNlID0ge1xyXG5cdFx0XHRcdF9kZWxlZ2F0ZXM6IFtdLFxyXG5cdFx0XHRcdHNjb3BlOiBzY29wZSxcclxuXHRcdFx0XHRlbGVtZW50OiAkZWxlbWVudCxcclxuXHRcdFx0XHR0aXRsZTogdiA9PiB7XHJcblx0XHRcdFx0XHRzY29wZS4kdGl0bGUgPSB2O1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0cmVzb2x2ZTogdiA9PiB7XHJcblx0XHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKHYpO1xyXG5cdFx0XHRcdFx0aW5zdGFuY2UuZGlzbWlzcygpO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0cmVqZWN0OiByZWFzb24gPT4ge1xyXG5cdFx0XHRcdFx0aW5zdGFuY2UuZGlzbWlzcyhyZWFzb24pO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0ZGlzbWlzczogcmVhc29uID0+IHtcclxuXHRcdFx0XHRcdHZhciBpID0gaW5zdGFuY2VzLmluZGV4T2YoaW5zdGFuY2UpO1xyXG5cdFx0XHRcdFx0aW5zdGFuY2VzLnNwbGljZShpLCAxKTtcclxuXHRcdFx0XHRcdHZhciBsZWF2aW5nID0gJGFuaW1hdGUubGVhdmUoJGVsZW1lbnQpO1xyXG5cclxuXHRcdFx0XHRcdGlmIChpbnN0YW5jZXMubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdFx0XHRcdGxlYXZpbmcudGhlbigoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0JGFuaW1hdGUubGVhdmUoJGJkKTtcclxuXHRcdFx0XHRcdFx0XHQkYm9keS5yZW1vdmVDbGFzcygndWV4LW1vZGFsLWFjdGl2ZScpO1xyXG5cdFx0XHRcdFx0XHRcdGRlc3Ryb3lBbmRDbGVhbihpbnN0YW5jZSk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0aW5zdGFuY2VzW2luc3RhbmNlcy5sZW5ndGggLSAxXS5fYWN0aXZlKHRydWUpO1xyXG5cdFx0XHRcdFx0XHRkZXN0cm95QW5kQ2xlYW4oaW5zdGFuY2UpO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdGRlZmVycmVkLnJlamVjdChyZWFzb24pO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0b25EaXNtaXNzOiBhY3Rpb24gPT4ge1xyXG5cdFx0XHRcdFx0aW5zdGFuY2UuX2RlbGVnYXRlcy5wdXNoKGFjdGlvbik7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRfYWN0aXZlOiB2YWx1ZSA9PiB7XHJcblx0XHRcdFx0XHRpZiAodmFsdWUpIGluc3RhbmNlLmVsZW1lbnQucmVtb3ZlQ2xhc3MoJ2luYWN0aXZlJyk7XHJcblx0XHRcdFx0XHRlbHNlIGluc3RhbmNlLmVsZW1lbnQuYWRkQ2xhc3MoJ2luYWN0aXZlJyk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cdFx0XHRpbnN0YW5jZXMucHVzaChpbnN0YW5jZSk7XHJcblxyXG5cdFx0XHR2YXIgcmVzb2x2ZSA9IGFuZ3VsYXIuZXh0ZW5kKFxyXG5cdFx0XHRcdHt9LFxyXG5cdFx0XHRcdG9wdGlvbnMubG9jYWxzIHx8IHt9LFxyXG5cdFx0XHRcdHsgbW9kYWw6IGluc3RhbmNlIH0pO1xyXG5cdFx0XHR2YXIgdGVtcGxhdGVQcm9taXNlID0gZ2V0VGVtcGxhdGVQcm9taXNlKG9wdGlvbnMsIHJlc29sdmUpO1xyXG5cclxuXHRcdFx0dGVtcGxhdGVQcm9taXNlLnRoZW4odGVtcGxhdGUgPT4ge1xyXG5cdFx0XHRcdCRlbGVtZW50LmZpbmQoJy51ZXgtbW9kYWwtY29udGVudCcpLmh0bWwodGVtcGxhdGUpO1xyXG5cclxuXHRcdFx0XHQkY29tcGlsZSgkZWxlbWVudCkoYW5ndWxhci5leHRlbmQoc2NvcGUsIHtcclxuXHRcdFx0XHRcdCR0aXRsZTogb3B0aW9ucy50aXRsZSB8fCAnTW9kYWwnLFxyXG5cdFx0XHRcdFx0JG1vZGFsOiBpbnN0YW5jZSxcclxuXHRcdFx0XHRcdCRyZXNvbHZlOiByZXNvbHZlLFxyXG5cdFx0XHRcdFx0X3RyeURpc21pc3M6IGV2ZW50ID0+IHtcclxuXHRcdFx0XHRcdFx0aWYgKCQoZXZlbnQudGFyZ2V0KS5pcygnLnVleC1tb2RhbCcpKSB7XHJcblx0XHRcdFx0XHRcdFx0c2NvcGUuJG1vZGFsLmRpc21pc3MoKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pKTtcclxuXHJcblx0XHRcdFx0aWYgKGluc3RhbmNlcy5sZW5ndGggIT09IDEpIHtcclxuXHRcdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgaW5zdGFuY2VzLmxlbmd0aCAtIDE7IGkrKykge1xyXG5cdFx0XHRcdFx0XHRpbnN0YW5jZXNbaV0uX2FjdGl2ZShmYWxzZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQkYm9keS5hZGRDbGFzcygndWV4LW1vZGFsLWFjdGl2ZScpO1xyXG5cdFx0XHRcdHZhciBiZEVudGVyaW5nO1xyXG5cdFx0XHRcdGlmIChpbnN0YW5jZXMubGVuZ3RoID09PSAxKSB7XHJcblx0XHRcdFx0XHRiZEVudGVyaW5nID0gJGFuaW1hdGUuZW50ZXIoJGJkLCAkYm9keSwgJGJvZHkuY2hpbGRyZW4oKS5sYXN0KCkpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHQoYmRFbnRlcmluZyB8fCAkcS53aGVuKCkpLnRoZW4oKCkgPT4ge1xyXG5cdFx0XHRcdFx0JGFuaW1hdGUuZW50ZXIoJGVsZW1lbnQsICRib2R5LCAkYm9keS5jaGlsZHJlbigpLmxhc3QoKSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0sICgpID0+IHtcclxuXHRcdFx0XHRkZXN0cm95QW5kQ2xlYW4oaW5zdGFuY2UpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0X2luc3RhbmNlOiBpbnN0YW5jZSxcclxuXHRcdFx0XHRwcm9taXNlOiBkZWZlcnJlZC5wcm9taXNlLFxyXG5cdFx0XHRcdHNjb3BlOiBpbnN0YW5jZS5zY29wZSxcclxuXHRcdFx0XHRlbGVtZW50OiBpbnN0YW5jZS4kZWxlbWVudCxcclxuXHRcdFx0XHRkaXNtaXNzOiBpbnN0YW5jZS5kaXNtaXNzXHJcblx0XHRcdH07XHJcblx0XHR9O1xyXG5cclxuXHRcdGZ1bmMuY29uZmlybSA9ICgpID0+IHtcclxuXHRcdFx0dmFyIG9wdGlvbnMgPSB7XHJcblx0XHRcdFx0dGl0bGU6ICdDb25maXJtJyxcclxuXHRcdFx0XHR0ZW1wbGF0ZTogJ0FyZSB5b3Ugc3VyZT8nLFxyXG5cdFx0XHRcdGRhbmdlcjogZmFsc2UsXHJcblx0XHRcdFx0eWVzVGV4dDogJ1llcycsXHJcblx0XHRcdFx0bm9UZXh0OiAnQ2FuY2VsJyxcclxuXHRcdFx0XHRpbmZvOiBmYWxzZVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0dmFyIHJldCA9IHtcclxuXHRcdFx0XHRvcGVuOiBwYXJlbnRTY29wZSA9PiB7XHJcblx0XHRcdFx0XHR2YXIgc2NvcGUgPSAocGFyZW50U2NvcGUgfHwgJHJvb3RTY29wZSkuJG5ldygpLFxyXG5cdFx0XHRcdFx0XHRpbnN0YW5jZSA9IGZ1bmMoe1xyXG5cdFx0XHRcdFx0XHR0aXRsZTogb3B0aW9ucy50aXRsZSxcclxuXHRcdFx0XHRcdFx0c2NvcGU6IGFuZ3VsYXIuZXh0ZW5kKHNjb3BlLCB7XHJcblx0XHRcdFx0XHRcdFx0ZGFuZ2VyOiBvcHRpb25zLmRhbmdlcixcclxuXHRcdFx0XHRcdFx0XHR5ZXNUZXh0OiBvcHRpb25zLnllc1RleHQsXHJcblx0XHRcdFx0XHRcdFx0bm9UZXh0OiBvcHRpb25zLm5vVGV4dCxcclxuXHRcdFx0XHRcdFx0XHRpbmZvOiBvcHRpb25zLmluZm8sXHJcblx0XHRcdFx0XHRcdFx0cmVzb2x2ZTogdiA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRpbnN0YW5jZS5faW5zdGFuY2UucmVzb2x2ZSh2KTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH0pLFxyXG5cdFx0XHRcdFx0XHR0ZW1wbGF0ZTpcclxuJzxkaXYgY2xhc3M9XCJ1ZXgtbW9kYWwtdC1jb25maXJtXCI+XFxcclxuXHQ8ZGl2IGNsYXNzPVwidWV4LW1vZGFsLXQtY29uZmlybS1jb250ZW50XCI+JyArXHJcblx0b3B0aW9ucy50ZW1wbGF0ZSArICdcXFxyXG5cdDwvZGl2PlxcXHJcblx0PGRpdiBjbGFzcz1cInVleC1tb2RhbC10LWNvbmZpcm0tYWN0aW9uc1wiPlxcXHJcblx0XHQ8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImJ0biBidG4tZGVmYXVsdCBuby1idG5cIiBuZy1jbGljaz1cIiRtb2RhbC5kaXNtaXNzKClcIiBuZy1pZj1cIjo6IWluZm9cIj57ezo6bm9UZXh0fX08L2J1dHRvbj5cXFxyXG5cdFx0PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJidG4geWVzLWJ0blwiIG5nLWNsaWNrPVwicmVzb2x2ZSgpXCIgbmctY2xhc3M9XCJ7ZGFuZ2VyOiBkYW5nZXIsIFxcJ2J0bi1kYW5nZXJcXCc6IGRhbmdlciwgXFwnYnRuLXByaW1hcnlcXCc6ICFkYW5nZXJ9XCI+e3s6Onllc1RleHR9fTwvYnV0dG9uPlxcXHJcblx0PC9kaXY+XFxcclxuPC9kaXY+J1xyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0aW5zdGFuY2UucHJvbWlzZS50aGVuKG51bGwsICgpID0+IHtcclxuXHRcdFx0XHRcdFx0c2NvcGUuJGRlc3Ryb3koKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRcdHJldHVybiBpbnN0YW5jZS5wcm9taXNlO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0dGl0bGU6IHYgPT4ge1xyXG5cdFx0XHRcdFx0b3B0aW9ucy50aXRsZSA9IHY7XHJcblx0XHRcdFx0XHRyZXR1cm4gcmV0O1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0ZGFuZ2VyOiAoKSA9PiB7XHJcblx0XHRcdFx0XHRvcHRpb25zLmRhbmdlciA9IHRydWU7XHJcblx0XHRcdFx0XHRyZXR1cm4gcmV0O1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0eWVzOiB2ID0+IHtcclxuXHRcdFx0XHRcdG9wdGlvbnMueWVzVGV4dCA9IHY7XHJcblx0XHRcdFx0XHRyZXR1cm4gcmV0O1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0bm86IHYgPT4ge1xyXG5cdFx0XHRcdFx0b3B0aW9ucy5ub1RleHQgPSB2O1xyXG5cdFx0XHRcdFx0cmV0dXJuIHJldDtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHRleHQ6IHYgPT4ge1xyXG5cdFx0XHRcdFx0b3B0aW9ucy50ZW1wbGF0ZSA9IHY7XHJcblx0XHRcdFx0XHRyZXR1cm4gcmV0O1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0dGVtcGxhdGU6IHYgPT4ge1xyXG5cdFx0XHRcdFx0b3B0aW9ucy50ZW1wbGF0ZSA9IHY7XHJcblx0XHRcdFx0XHRyZXR1cm4gcmV0O1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0Y2xhc3NlczogdiA9PiB7XHJcblx0XHRcdFx0XHRvcHRpb25zLmNsYXNzZXMgPSB2O1xyXG5cdFx0XHRcdFx0cmV0dXJuIHJldDtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGluZm86ICgpID0+IHtcclxuXHRcdFx0XHRcdG9wdGlvbnMuaW5mbyA9IHRydWU7XHJcblx0XHRcdFx0XHRyZXR1cm4gcmV0O1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHJldHVybiByZXQ7XHJcblx0XHR9O1xyXG5cclxuXHRcdGZ1bmMuaW5mbyA9ICgpID0+IHtcclxuXHRcdFx0cmV0dXJuIGZ1bmMuY29uZmlybSgpLmluZm8oKS50aXRsZSgnSW5mbycpLnllcygnT0snKTtcclxuXHRcdH07XHJcblxyXG5cdFx0cmV0dXJuIGZ1bmM7XHJcblxyXG5cdFx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcblx0XHRmdW5jdGlvbiBkaXNtaXNzVG9wTW9kYWwoZSkge1xyXG5cdFx0XHRpZiAoaW5zdGFuY2VzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHR2YXIgdG9wID0gaW5zdGFuY2VzW2luc3RhbmNlcy5sZW5ndGggLSAxXTtcclxuXHRcdFx0dG9wLmRpc21pc3MoKTtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBnZXRDbGFzc2VzT3B0aW9uKG9wdGlvbnMpIHtcclxuXHRcdFx0cmV0dXJuIG9wdGlvbnMuY2xhc3NlcyB8fCBvcHRpb25zWydjbGFzcyddO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGdldFdyYXBwZXJDbGFzc2VzKG9wdGlvbnMpIHtcclxuXHRcdFx0dmFyIGNsYXNzZXMgPSBnZXRDbGFzc2VzT3B0aW9uKG9wdGlvbnMpO1xyXG5cdFx0XHRyZXR1cm4gY2xhc3NlcyA/ICcgJyArIGNsYXNzZXMgOiAnJztcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBnZXRUZW1wbGF0ZU1vZGFsQ29udGFpbmVyKG9wdGlvbnMpIHtcclxuXHRcdFx0cmV0dXJuICdcXFxyXG48ZGl2IGNsYXNzPVwidWV4LW1vZGFsJyArIGdldFdyYXBwZXJDbGFzc2VzKG9wdGlvbnMpICsnXCIgbmctY2xpY2s9XCJfdHJ5RGlzbWlzcygkZXZlbnQpXCI+XFxcclxuXHQ8ZGl2IGNsYXNzPVwidWV4LW1vZGFsLWNvbnRhaW5lclwiPlxcXHJcblx0XHQ8ZGl2IGNsYXNzPVwidWV4LW1vZGFsLWhlYWRlclwiPlxcXHJcblx0XHRcdDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwidWV4LW1vZGFsLWNsb3NlXCIgbmctY2xpY2s9XCIkbW9kYWwuZGlzbWlzcygpXCI+XFxcclxuXHRcdFx0XHQ8dWV4LWljb24gaWNvbj1cImNsb3NlXCI+PC91ZXgtaWNvbj5cXFxyXG5cdFx0XHQ8L2J1dHRvbj5cXFxyXG5cdFx0XHQ8aDI+e3skdGl0bGV9fTwvaDI+XFxcclxuXHRcdDwvZGl2PlxcXHJcblx0XHQ8ZGl2IGNsYXNzPVwidWV4LW1vZGFsLWNvbnRlbnRcIj48L2Rpdj5cXFxyXG5cdDwvZGl2PlxcXHJcbjwvZGl2Pic7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gdGVtcGxhdGVGb3JDb21wb25lbnQobmFtZSwgcmVzb2x2ZSkge1xyXG5cdFx0XHR2YXIgdCA9ICc8JyArIG5hbWU7XHJcblx0XHRcdGlmIChyZXNvbHZlKSB7XHJcblx0XHRcdFx0Zm9yICh2YXIgcCBpbiByZXNvbHZlKSB7XHJcblx0XHRcdFx0XHR2YXIgcE5hbWUgPSB1ZXhVdGlsLmNhbWVsVG9EYXNoKHApO1xyXG5cdFx0XHRcdFx0dCArPSAnICcgKyBwTmFtZSArICc9XCI6OiRyZXNvbHZlLicgKyBwICsgJ1wiJztcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0dCArPSAnPjwvJyArIG5hbWUgKyAnPic7XHJcblx0XHRcdHJldHVybiB0O1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGdldFRlbXBsYXRlUHJvbWlzZShvcHRpb25zLCByZXNvbHZlKSB7XHJcblx0XHRcdGlmIChvcHRpb25zLmNvbXBvbmVudCkge1xyXG5cdFx0XHRcdHZhciBjb21wb25lbnROYW1lID0gdWV4VXRpbC5jYW1lbFRvRGFzaChvcHRpb25zLmNvbXBvbmVudCk7XHJcblx0XHRcdFx0cmV0dXJuICRxLndoZW4odGVtcGxhdGVGb3JDb21wb25lbnQoXHJcblx0XHRcdFx0XHRjb21wb25lbnROYW1lLFxyXG5cdFx0XHRcdFx0cmVzb2x2ZSkpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gb3B0aW9ucy50ZW1wbGF0ZSA/ICRxLndoZW4ob3B0aW9ucy50ZW1wbGF0ZS50cmltKCkpIDpcclxuXHRcdFx0XHQkdGVtcGxhdGVSZXF1ZXN0KGFuZ3VsYXIuaXNGdW5jdGlvbihvcHRpb25zLnRlbXBsYXRlVXJsKSA/XHJcblx0XHRcdFx0XHRvcHRpb25zLnRlbXBsYXRlVXJsKCkgOiBvcHRpb25zLnRlbXBsYXRlVXJsKTtcclxuXHRcdH1cclxuXHR9XHJcbn0pKCk7XHJcbiIsIihmdW5jdGlvbiAoKSB7XHJcblx0XCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG5cdGFuZ3VsYXJcclxuXHRcdC5tb2R1bGUoJ21yLnVleCcpXHJcblx0XHQuZGlyZWN0aXZlKCd1ZXhNb2RhbCcsIG1vZGFsKVxyXG5cdFx0LmRpcmVjdGl2ZSgndWV4TW9kYWxDb25maXJtJywgbW9kYWxDb25maXJtKTtcclxuXHJcblx0ZnVuY3Rpb24gbW9kYWwodWV4TW9kYWwpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHJlc3RyaWN0OiAnRScsXHJcblx0XHRcdHNjb3BlOiB0cnVlLFxyXG5cdFx0XHR0ZW1wbGF0ZTogKCRlbGVtZW50LCAkYXR0cnMpID0+IHtcclxuXHRcdFx0XHQkYXR0cnMuJGh0bWwgPSAkZWxlbWVudC5odG1sKCk7XHJcblx0XHRcdFx0JGVsZW1lbnQuZW1wdHkoKTtcclxuXHRcdFx0fSxcclxuXHRcdFx0YmluZFRvQ29udHJvbGxlcjoge1xyXG5cdFx0XHRcdGRlbGVnYXRlOiAnPSdcclxuXHRcdFx0fSxcclxuXHRcdFx0Y29udHJvbGxlckFzOiAnJHVleE1vZGFsQ3RybCcsXHJcblx0XHRcdGNvbnRyb2xsZXI6IGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMpIHtcclxuXHRcdFx0XHR2YXIgdGl0bGUgPSAkYXR0cnMudGl0bGUsXHJcblx0XHRcdFx0XHRjbGFzc2VzID0gJGF0dHJzWydjbGFzcyddLFxyXG5cdFx0XHRcdFx0dGVtcGxhdGUgPSAkYXR0cnMuJGh0bWw7XHJcblxyXG5cdFx0XHRcdHRoaXMuZGVsZWdhdGUgPSB7XHJcblx0XHRcdFx0XHRvcGVuOiBvcHRpb25zID0+IHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIHVleE1vZGFsKGFuZ3VsYXIuZXh0ZW5kKHtcclxuXHRcdFx0XHRcdFx0XHRzY29wZTogJHNjb3BlLFxyXG5cdFx0XHRcdFx0XHRcdHRpdGxlOiB0aXRsZSxcclxuXHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBjbGFzc2VzLFxyXG5cdFx0XHRcdFx0XHRcdHRlbXBsYXRlOiB0ZW1wbGF0ZVxyXG5cdFx0XHRcdFx0XHR9LCBvcHRpb25zKSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIG1vZGFsQ29uZmlybSh1ZXhNb2RhbCkge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0cmVzdHJpY3Q6ICdFJyxcclxuXHRcdFx0c2NvcGU6IHRydWUsXHJcblx0XHRcdHRlbXBsYXRlOiAoJGVsZW1lbnQsICRhdHRycykgPT4ge1xyXG5cdFx0XHRcdCRhdHRycy4kaHRtbCA9ICRlbGVtZW50Lmh0bWwoKTtcclxuXHRcdFx0XHQkZWxlbWVudC5lbXB0eSgpO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRiaW5kVG9Db250cm9sbGVyOiB7XHJcblx0XHRcdFx0ZGVsZWdhdGU6ICc9J1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRjb250cm9sbGVyQXM6ICckdWV4TW9kYWxDb25maXJtQ3RybCcsXHJcblx0XHRcdGNvbnRyb2xsZXI6IGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMpIHtcclxuXHRcdFx0XHR2YXIgdGl0bGUgPSAkYXR0cnMudGl0bGUsXHJcblx0XHRcdFx0XHRjbGFzc2VzID0gJGF0dHJzWydjbGFzcyddLFxyXG5cdFx0XHRcdFx0dGVtcGxhdGUgPSAkYXR0cnMuJGh0bWw7XHJcblxyXG5cdFx0XHRcdHRoaXMuZGVsZWdhdGUgPSB7XHJcblx0XHRcdFx0XHRvcGVuOiAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdHJldHVybiB1ZXhNb2RhbC5jb25maXJtKClcclxuXHRcdFx0XHRcdFx0XHQuY2xhc3NlcyhjbGFzc2VzKVxyXG5cdFx0XHRcdFx0XHRcdC50aXRsZSh0aXRsZSlcclxuXHRcdFx0XHRcdFx0XHQudGVtcGxhdGUodGVtcGxhdGUpXHJcblx0XHRcdFx0XHRcdFx0Lm9wZW4oJHNjb3BlKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxufSkoKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdGFuZ3VsYXJcclxuXHRcdC5tb2R1bGUoJ21yLnVleCcpXHJcblx0XHQucHJvdmlkZXIoJ3VleFAnLCB1ZXhQUHJvdmlkZXIpXHJcblx0XHQuZGlyZWN0aXZlKCd1ZXhQJywgdWV4UClcclxuXHRcdC5kaXJlY3RpdmUoJ3VleFBTcmMnLCB1ZXhQU3JjKVxyXG5cdFx0LmRpcmVjdGl2ZSgndWV4UFJ1bm5pbmcnLCB1ZXhQUnVubmluZylcclxuXHRcdC5kaXJlY3RpdmUoJ3VleFBTdWNjZXNzJywgdWV4UFN1Y2Nlc3MpXHJcblx0XHQuZGlyZWN0aXZlKCd1ZXhQRXJyb3InLCB1ZXhQRXJyb3IpXHJcblx0XHQuZGlyZWN0aXZlKCd1ZXhQU3RhdHVzJywgdWV4UFN0YXR1cylcclxuXHRcdC5kaXJlY3RpdmUoJ3VleFBCdG4nLCB1ZXhQQnRuKTtcclxuXHJcblx0ZnVuY3Rpb24gdWV4UFByb3ZpZGVyKCkge1xyXG5cdFx0dGhpcy5vcHRzID0ge1xyXG5cdFx0XHRzdWNjZXNzSW50ZXJ2YWw6IDEwMDAsXHJcblx0XHRcdGVycm9ySW50ZXJ2YWw6IDEwMDBcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy4kZ2V0ID0gKCkgPT4gdGhpcy5vcHRzO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gdWV4UCgkcGFyc2UsIHVleFApIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHJlc3RyaWN0OiAnQScsXHJcblx0XHRcdHNjb3BlOiB0cnVlLFxyXG5cdFx0XHRjb250cm9sbGVyOiBjb250cm9sbGVyLFxyXG5cdFx0XHRjb250cm9sbGVyQXM6ICckdWV4UCdcclxuXHRcdH07XHJcblxyXG5cdFx0ZnVuY3Rpb24gY29udHJvbGxlcigkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMsICR0aW1lb3V0LCAkcSkge1xyXG5cdFx0XHR2YXIgcHJvbWlzZSxcclxuXHRcdFx0XHRmbiA9ICRwYXJzZSgkYXR0cnMudWV4UCksXHJcblx0XHRcdFx0b3B0aW9ucyA9ICRzY29wZS4kZXZhbCgkYXR0cnMudWV4UE9wdHMpIHx8IHt9LFxyXG5cdFx0XHRcdCQkcHJvbWlzZXMgPSB7fTtcclxuXHJcblx0XHRcdHRoaXMucnVubmluZyA9IGZhbHNlO1xyXG5cdFx0XHR0aGlzLnN1Y2Nlc3MgPSBmYWxzZTtcclxuXHRcdFx0dGhpcy5lcnJvciA9IGZhbHNlO1xyXG5cclxuXHRcdFx0aWYgKCRlbGVtZW50LmlzKCdmb3JtJykgJiYgJGF0dHJzLnVleFBTcmMgPT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRcdCRlbGVtZW50Lm9uKCdzdWJtaXQnLCBlID0+IHtcclxuXHRcdFx0XHRcdCRzY29wZS4kYXBwbHkodGhpcy5ydW4oZSkpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRmdW5jdGlvbiBnZXRMb2NhbHMoYXJncykge1xyXG5cdFx0XHRcdGlmICghYXJncyB8fCBhcmdzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHQkZXZlbnQ6IGFyZ3NbMF1cclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR2YXIgaW50ZXJwb2xhdGUgPSAobmFtZSwgaW50ZXJ2YWwpID0+IHtcclxuXHRcdFx0XHR0aGlzW25hbWVdID0gdHJ1ZTtcclxuXHRcdFx0XHR2YXIgcCA9ICQkcHJvbWlzZXNbbmFtZV0gPSAkdGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAoJCRwcm9taXNlc1tuYW1lXSA9PT0gcCkge1xyXG5cdFx0XHRcdFx0XHR0aGlzW25hbWVdID0gZmFsc2U7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSwgaW50ZXJ2YWwpO1xyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0dGhpcy5ydW4gPSBlID0+IHtcclxuXHRcdFx0XHRpZiAoZS5pc0RlZmF1bHRQcmV2ZW50ZWQoKSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRcdHZhciBwID0gZm4oJHNjb3BlLCBnZXRMb2NhbHMoYXJndW1lbnRzKSk7XHJcblx0XHRcdFx0aWYgKHAgJiYgcC5maW5hbGx5KSB7XHJcblx0XHRcdFx0XHRwcm9taXNlID0gcDtcclxuXHRcdFx0XHRcdHRoaXMucnVubmluZyA9IHRydWU7XHJcblx0XHRcdFx0XHRwcm9taXNlLnRoZW4oKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRpbnRlcnBvbGF0ZSgnc3VjY2VzcycsIG9wdGlvbnMuc3VjY2Vzc0ludGVydmFsIHx8IHVleFAuc3VjY2Vzc0ludGVydmFsKTtcclxuXHRcdFx0XHRcdH0sICgpID0+IHtcclxuXHRcdFx0XHRcdFx0aW50ZXJwb2xhdGUoJ2Vycm9yJywgb3B0aW9ucy5lcnJvckludGVydmFsIHx8IHVleFAuZXJyb3JJbnRlcnZhbCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdHByb21pc2UuZmluYWxseSgoKSA9PiB7XHJcblx0XHRcdFx0XHRcdGlmIChwICE9PSBwcm9taXNlKSByZXR1cm47XHJcblx0XHRcdFx0XHRcdHRoaXMucnVubmluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gdWV4UFNyYygpIHtcclxuXHRcdGZ1bmN0aW9uIGRldGVybWluZUV2ZW50KCRlbGVtZW50LCB2YWx1ZSkge1xyXG5cdFx0XHRpZiAodmFsdWUgJiYgYW5ndWxhci5pc1N0cmluZyh2YWx1ZSkpIHJldHVybiB2YWx1ZTtcclxuXHRcdFx0aWYgKCRlbGVtZW50LmlzKCdmb3JtJykpIHJldHVybiAnc3VibWl0JztcclxuXHRcdFx0cmV0dXJuICdjbGljayc7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0cmVzdHJpY3Q6ICdBJyxcclxuXHRcdFx0cmVxdWlyZTogJ151ZXhQJyxcclxuXHRcdFx0c2NvcGU6IGZhbHNlLFxyXG5cdFx0XHRsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzLCBjdHJsKSB7XHJcblx0XHRcdFx0dmFyIGV2ZW50ID0gZGV0ZXJtaW5lRXZlbnQoJGVsZW1lbnQsICRhdHRycy51ZXhQU3JjKTtcclxuXHRcdFx0XHQkZWxlbWVudC5vbihldmVudCwgZSA9PiB7XHJcblx0XHRcdFx0XHRpZiAoJGVsZW1lbnQuYXR0cignZGlzYWJsZWQnKSkge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0JHNjb3BlLiRhcHBseShjdHJsLnJ1bihlKSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiB1ZXhQQ29tbW9uKGtpbmQpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHJlc3RyaWN0OiAnQScsXHJcblx0XHRcdHJlcXVpcmU6ICdedWV4UCcsXHJcblx0XHRcdHNjb3BlOiB7fSxcclxuXHRcdFx0dHJhbnNjbHVkZTogdHJ1ZSxcclxuXHRcdFx0dGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwidWV4LXAtJyArIGtpbmQgKyAnXCIgbmctc2hvdz1cInNob3duXCIgbmctdHJhbnNjbHVkZT48L2Rpdj4nLFxyXG5cdFx0XHRsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzLCBjdHJsKSB7XHJcblx0XHRcdFx0JGVsZW1lbnQuYWRkQ2xhc3MoJ3VleC1wLScgKyBraW5kKTtcclxuXHRcdFx0XHQkc2NvcGUuJHdhdGNoKCgpID0+IGN0cmxba2luZF0sIChuLCBvKSA9PiB7XHJcblx0XHRcdFx0XHQkc2NvcGUuc2hvd24gPSAhIW47XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiB1ZXhQUnVubmluZygpIHtcclxuXHRcdHJldHVybiB1ZXhQQ29tbW9uKCdydW5uaW5nJyk7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiB1ZXhQU3VjY2VzcygpIHtcclxuXHRcdHJldHVybiB1ZXhQQ29tbW9uKCdzdWNjZXNzJyk7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiB1ZXhQRXJyb3IoKSB7XHJcblx0XHRyZXR1cm4gdWV4UENvbW1vbignZXJyb3InKTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHVleFBTdGF0dXMoKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRyZXN0cmljdDogJ0VBJyxcclxuXHRcdFx0c2NvcGU6IHt9LFxyXG5cdFx0XHR0ZW1wbGF0ZTogJzxzcGFuIG5nLXNob3c9XCJzdWNjZXNzIHx8IGVycm9yXCIgY2xhc3M9XCJ1ZXgtcC1zdGF0dXNcIiBuZy1jbGFzcz1cImNsYXNzZXNcIj57e3RleHR9fTwvc3Bhbj4nLFxyXG5cdFx0XHRyZXF1aXJlOiAnXnVleFAnLFxyXG5cdFx0XHRsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzLCBjdHJsKSB7XHJcblx0XHRcdFx0dmFyIHN1Y2Nlc3NUZXh0ID0gJGF0dHJzLnN1Y2Nlc3MgfHwgJ1N1Y2Nlc3MnLFxyXG5cdFx0XHRcdFx0ZXJyb3JUZXh0ID0gJGF0dHJzLmVycm9yIHx8ICdFcnJvcic7XHJcblx0XHRcdFx0JHNjb3BlLmNsYXNzZXMgPSAnJztcclxuXHJcblx0XHRcdFx0JHNjb3BlLiR3YXRjaCgoKSA9PiBjdHJsLnN1Y2Nlc3MsIChuLCBvKSA9PiB7XHJcblx0XHRcdFx0XHQkc2NvcGUuc3VjY2VzcyA9IG47XHJcblx0XHRcdFx0XHRpZiAobikge1xyXG5cdFx0XHRcdFx0XHQkc2NvcGUuY2xhc3NlcyA9ICd1ZXgtcC1zdWNjZXNzJztcclxuXHRcdFx0XHRcdFx0JHNjb3BlLnRleHQgPSBzdWNjZXNzVGV4dDtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0JHNjb3BlLiR3YXRjaCgoKSA9PiBjdHJsLmVycm9yLCAobiwgbykgPT4ge1xyXG5cdFx0XHRcdFx0JHNjb3BlLmVycm9yID0gbjtcclxuXHRcdFx0XHRcdGlmIChuKSB7XHJcblx0XHRcdFx0XHRcdCRzY29wZS5jbGFzc2VzID0gJ3VleC1wLWVycm9yJztcclxuXHRcdFx0XHRcdFx0JHNjb3BlLnRleHQgPSBlcnJvclRleHQ7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiB1ZXhQQnRuKCkge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0cmVzdHJpY3Q6ICdBJyxcclxuXHRcdFx0cmVxdWlyZTogJ151ZXhQJyxcclxuXHRcdFx0bGluazogZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQsICRhdHRycywgY3RybCkge1xyXG5cdFx0XHRcdHZhciBpc09uZVRpbWUgPSAkYXR0cnMudWV4UEJ0biA9PT0gJ29uZXRpbWUnO1xyXG5cdFx0XHRcdCRzY29wZS4kd2F0Y2goKCkgPT4gY3RybC5ydW5uaW5nLCAobiwgbykgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKG4pIHtcclxuXHRcdFx0XHRcdFx0JGVsZW1lbnQuYXR0cignZGlzYWJsZWQnLCAnZGlzYWJsZWQnKTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdGlmIChjdHJsLmVycm9yIHx8ICFpc09uZVRpbWUpIHtcclxuXHRcdFx0XHRcdFx0XHQkZWxlbWVudC5yZW1vdmVBdHRyKCdkaXNhYmxlZCcpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG59KSgpO1xyXG4iLCIoZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0YW5ndWxhclxyXG5cdFx0Lm1vZHVsZSgnbXIudWV4JylcclxuXHRcdC5mYWN0b3J5KCd1ZXhQb3AnLCBwb3ApO1xyXG5cclxuXHRmdW5jdGlvbiBwb3AoJHJvb3RTY29wZSwgJGNvbXBpbGUsICRhbmltYXRlLCAkdGVtcGxhdGVSZXF1ZXN0LCAkcSwgdWV4UG9zaXRpb25pbmdUaHJvdHRsZXIsIHVleFBvc2l0aW9uZXIsICR0aW1lb3V0KSB7XHJcblx0XHR2YXIgX2luc3RhbmNlLFxyXG5cdFx0XHQkYm9keSA9ICQoZG9jdW1lbnQuYm9keSk7XHJcblxyXG5cdFx0JGJvZHkub24oJ2tleWRvd24nLCBlID0+IHtcclxuXHRcdFx0aWYgKCFlLmlzRGVmYXVsdFByZXZlbnRlZCgpICYmIGUud2hpY2ggPT09IDI3KSB7XHJcblx0XHRcdFx0ZGlzbWlzcyhlKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dWV4UG9zaXRpb25pbmdUaHJvdHRsZXIuc3Vic2NyaWJlKGNvbnRleHQgPT4ge1xyXG5cdFx0XHRpZiAoX2luc3RhbmNlKSBfaW5zdGFuY2UucG9zaXRpb24oKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIG9wdGlvbnM6XHJcblx0XHQvLyAgIHNjb3BlXHJcblx0XHQvLyAgIHBsYWNlbWVudDogW3RvcCwgcmlnaHQsIGJvdHRvbSwgbGVmdF0gW3N0YXJ0LCBjZW50ZXIsIGVuZF1cclxuXHRcdC8vICAgb2Zmc2V0XHJcblx0XHQvLyAgIHRhcmdldFxyXG5cdFx0Ly8gICB0ZW1wbGF0ZSAtIHRlbXBsYXRlVXJsXHJcblx0XHQvLyAgIGxhenlcclxuXHRcdC8vICAgY2xhc3Nlc1xyXG5cdFx0Ly8gICBsb2NhbHNcclxuXHRcdC8vICAgb25Qb3NpdGlvblxyXG5cdFx0Ly9cclxuXHRcdHZhciBmdW5jID0gb3B0aW9ucyA9PiB7XHJcblx0XHRcdHZhbGlkYXRlKG9wdGlvbnMpO1xyXG5cclxuXHRcdFx0dmFyICRlbGVtZW50ID0gJChnZXRUZW1wbGF0ZVBvcChvcHRpb25zKSksXHJcblx0XHRcdFx0bGlua2ZuO1xyXG5cclxuXHRcdFx0dmFyIGNyZWF0ZVNjb3BlID0gKCkgPT4ge1xyXG5cdFx0XHRcdHJldHVybiAob3B0aW9ucy5zY29wZSB8fCAkcm9vdFNjb3BlKS4kbmV3KCk7XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHR2YXIgaW5zdGFuY2UgPSB7XHJcblx0XHRcdFx0X2RlbGVnYXRlczogW10sXHJcblx0XHRcdFx0dGFyZ2V0OiBhbmd1bGFyLmVsZW1lbnQob3B0aW9ucy50YXJnZXQpLFxyXG5cdFx0XHRcdG9wZW46ICgpID0+IHtcclxuXHRcdFx0XHRcdGlmIChfaW5zdGFuY2UgJiYgX2luc3RhbmNlICE9PSBpbnN0YW5jZSkge1xyXG5cdFx0XHRcdFx0XHRfaW5zdGFuY2UuZGlzbWlzcygpO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdF9pbnN0YW5jZSA9IGluc3RhbmNlO1xyXG5cclxuXHRcdFx0XHRcdHZhciB0ZW1wbGF0ZVByb21pc2U7XHJcblx0XHRcdFx0XHRpZiAoIWxpbmtmbikge1xyXG5cdFx0XHRcdFx0XHR0ZW1wbGF0ZVByb21pc2UgPSBnZXRUZW1wbGF0ZVByb21pc2Uob3B0aW9ucykudGhlbih0ZW1wbGF0ZSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0JGVsZW1lbnQuZmluZCgnLnVleC1wb3AtY29udGVudCcpLmh0bWwodGVtcGxhdGUpO1xyXG5cdFx0XHRcdFx0XHRcdGxpbmtmbiA9ICRjb21waWxlKCRlbGVtZW50KTtcclxuXHRcdFx0XHRcdFx0fSwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdGRlc3Ryb3lBbmRDbGVhbihpbnN0YW5jZSk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0dGVtcGxhdGVQcm9taXNlID0gJHEud2hlbigpO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdHJldHVybiB0ZW1wbGF0ZVByb21pc2UudGhlbigoKSA9PiB7XHJcblx0XHRcdFx0XHRcdHZhciBzY29wZSA9IGFuZ3VsYXIuZXh0ZW5kKGNyZWF0ZVNjb3BlKCksIHtcclxuXHRcdFx0XHRcdFx0XHQkcG9wOiBpbnN0YW5jZSxcclxuXHRcdFx0XHRcdFx0fSwgb3B0aW9ucy5sb2NhbHMgfHwge30pO1xyXG5cclxuXHRcdFx0XHRcdFx0bGlua2ZuKHNjb3BlLCAoJGNsb25lLCBzY29wZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdGluc3RhbmNlLnNjb3BlID0gc2NvcGU7XHJcblxyXG5cdFx0XHRcdFx0XHRcdHNjb3BlLiRvbignJGRlc3Ryb3knLCAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRpbnN0YW5jZS5kaXNtaXNzKCk7XHJcblx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdFx0aW5zdGFuY2UuZWxlbWVudCA9IGluc3RhbmNlLnBvcCA9ICRjbG9uZTtcclxuXHJcblx0XHRcdFx0XHRcdFx0aW5zdGFuY2UudGFyZ2V0LmFkZENsYXNzKCd1ZXgtcG9wLW9wZW4nKTtcclxuXHRcdFx0XHRcdFx0XHQkYm9keS5hZGRDbGFzcygndWV4LXBvcC1hY3RpdmUnKTtcclxuXHRcdFx0XHRcdFx0XHQkYW5pbWF0ZS5lbnRlcigkY2xvbmUsICRib2R5LCAkYm9keS5jaGlsZHJlbigpLmxhc3QoKSk7XHJcblx0XHRcdFx0XHRcdFx0c2NvcGUuJGV2YWxBc3luYygoKSA9PiBpbnN0YW5jZS5wb3NpdGlvbigpKTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGRpc21pc3M6ICgpID0+IHtcclxuXHRcdFx0XHRcdCRhbmltYXRlLmxlYXZlKGluc3RhbmNlLmVsZW1lbnQpLnRoZW4oKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRpbnN0YW5jZS50YXJnZXQucmVtb3ZlQ2xhc3MoJ3VleC1wb3Atb3BlbicpO1xyXG5cdFx0XHRcdFx0XHQkYm9keS5yZW1vdmVDbGFzcygndWV4LXBvcC1hY3RpdmUnKTtcclxuXHRcdFx0XHRcdFx0ZGVzdHJveUFuZENsZWFuKGluc3RhbmNlKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0cG9zaXRpb246IHN0dWIgPT4ge1xyXG5cdFx0XHRcdFx0dmFyIHRhcmdldCA9IGluc3RhbmNlLnRhcmdldCxcclxuXHRcdFx0XHRcdFx0cG9wID0gaW5zdGFuY2UucG9wO1xyXG5cclxuXHRcdFx0XHRcdHZhciBvID0gYW5ndWxhci5leHRlbmQob3B0aW9ucywge1xyXG5cdFx0XHRcdFx0XHR0YXJnZXQ6IHRhcmdldCxcclxuXHRcdFx0XHRcdFx0ZWxlbWVudDogcG9wLFxyXG5cdFx0XHRcdFx0XHRtYXJnaW46IDVcclxuXHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRcdGlmIChzdHViKSB7XHJcblx0XHRcdFx0XHRcdG8uc3R1YiA9IHRydWU7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR2YXIgY29udGV4dCA9IHVleFBvc2l0aW9uZXIobyk7XHJcblx0XHRcdFx0XHRpZiAob3B0aW9ucy5vblBvc2l0aW9uKSB7XHJcblx0XHRcdFx0XHRcdG9wdGlvbnMub25Qb3NpdGlvbihjb250ZXh0KTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHR1ZXhQb3NpdGlvbmVyLmFwcGx5KGNvbnRleHQpO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0b25EaXNtaXNzOiBhY3Rpb24gPT4ge1xyXG5cdFx0XHRcdFx0aW5zdGFuY2UuX2RlbGVnYXRlcy5wdXNoKGFjdGlvbik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0aWYgKCFvcHRpb25zLmxhenkpIHtcclxuXHRcdFx0XHRpbnN0YW5jZS5vcGVuKCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBpbnN0YW5jZTtcclxuXHRcdH07XHJcblxyXG5cdFx0cmV0dXJuIGZ1bmM7XHJcblxyXG5cdFx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcblx0XHRmdW5jdGlvbiB2YWxpZGF0ZShvcHRpb25zKSB7XHJcblx0XHRcdGlmICghb3B0aW9ucy50ZW1wbGF0ZSAmJiAhb3B0aW9ucy50ZW1wbGF0ZVVybCkge1xyXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcigndGVtcGxhdGUgb3IgdGVtcGxhdGVVcmwgbXVzdCBiZSBwcm92aWRlZC4nKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGRpc21pc3MoZSkge1xyXG5cdFx0XHRpZiAoX2luc3RhbmNlKSB7XHJcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRcdF9pbnN0YW5jZS5kaXNtaXNzKCk7XHJcblx0XHRcdFx0JHJvb3RTY29wZS4kYXBwbHlBc3luYygpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gZGVzdHJveUFuZENsZWFuKGluc3RhbmNlKSB7XHJcblx0XHRcdGluc3RhbmNlLnNjb3BlLiRkZXN0cm95KCk7XHJcblx0XHRcdHZhciBkZWxlZ2F0ZXMgPSBpbnN0YW5jZS5fZGVsZWdhdGVzO1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGRlbGVnYXRlcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdGRlbGVnYXRlc1tpXSgpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAoaW5zdGFuY2UgPT09IF9pbnN0YW5jZSkgX2luc3RhbmNlID0gbnVsbDtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBnZXRDbGFzc2VzT3B0aW9uKG9wdGlvbnMpIHtcclxuXHRcdFx0cmV0dXJuIG9wdGlvbnMuY2xhc3NlcyB8fCBvcHRpb25zWydjbGFzcyddO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGdldFdyYXBwZXJDbGFzc2VzKG9wdGlvbnMpIHtcclxuXHRcdFx0dmFyIGNsYXNzZXMgPSBnZXRDbGFzc2VzT3B0aW9uKG9wdGlvbnMpO1xyXG5cdFx0XHRyZXR1cm4gY2xhc3NlcyA/ICcgJyArIGNsYXNzZXMgOiAnJztcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBnZXRUZW1wbGF0ZVBvcChvcHRpb25zKSB7XHJcblx0XHRcdHJldHVybiAnXFxcclxuPGRpdiBjbGFzcz1cInVleC1wb3AnICsgZ2V0V3JhcHBlckNsYXNzZXMob3B0aW9ucykgKyAnXCI+XFxcclxuXHQ8ZGl2IGNsYXNzPVwidWV4LXBvcC1iZFwiIG5nLWNsaWNrPVwiJHBvcC5kaXNtaXNzKClcIj48L2Rpdj5cXFxyXG5cdDxkaXYgY2xhc3M9XCJ1ZXgtcG9wLWNvbnRlbnRcIj5cXFxyXG5cdDwvZGl2PlxcXHJcbjwvZGl2Pic7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2V0VGVtcGxhdGVQcm9taXNlKG9wdGlvbnMpIHtcclxuXHRcdFx0cmV0dXJuIG9wdGlvbnMudGVtcGxhdGUgPyAkcS53aGVuKG9wdGlvbnMudGVtcGxhdGUpIDpcclxuXHRcdFx0XHQkdGVtcGxhdGVSZXF1ZXN0KGFuZ3VsYXIuaXNGdW5jdGlvbihvcHRpb25zLnRlbXBsYXRlVXJsKSA/XHJcblx0XHRcdFx0XHRvcHRpb25zLnRlbXBsYXRlVXJsKCkgOiBvcHRpb25zLnRlbXBsYXRlVXJsKTtcclxuXHRcdH1cclxuXHR9XHJcbn0pKCk7XHJcbiIsIihmdW5jdGlvbiAoKSB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cclxuXHRhbmd1bGFyXHJcblx0XHQubW9kdWxlKCdtci51ZXgnKVxyXG5cdFx0LmRpcmVjdGl2ZSgndWV4UG9wQ29udGFpbmVyJywgcG9wQ29udGFpbmVyKVxyXG5cdFx0LmRpcmVjdGl2ZSgndWV4UG9wVGFyZ2V0JywgcG9wVGFyZ2V0KVxyXG5cdFx0LmRpcmVjdGl2ZSgndWV4UG9wJywgcG9wKTtcclxuXHJcblx0ZnVuY3Rpb24gcG9wQ29udGFpbmVyKCkge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0cmVzdHJpY3Q6ICdBJyxcclxuXHRcdFx0c2NvcGU6IGZhbHNlLFxyXG5cdFx0XHRjb250cm9sbGVyOiBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0dmFyIF90YXJnZXRFbGVtZW50O1xyXG5cclxuXHRcdFx0XHR0aGlzLnJlZ2lzdGVyVGFyZ2V0ID0gdGFyZ2V0RWxlbWVudCA9PiB7XHJcblx0XHRcdFx0XHRfdGFyZ2V0RWxlbWVudCA9IHRhcmdldEVsZW1lbnQ7XHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0dGhpcy5nZXRUYXJnZXQgPSAoKSA9PiBfdGFyZ2V0RWxlbWVudDtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHBvcFRhcmdldCgpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHJlc3RyaWN0OiAnQScsXHJcblx0XHRcdHNjb3BlOiBmYWxzZSxcclxuXHRcdFx0cmVxdWlyZToge1xyXG5cdFx0XHRcdHBvcENvbnRhaW5lcjogJ151ZXhQb3BDb250YWluZXInXHJcblx0XHRcdH0sXHJcblx0XHRcdGJpbmRUb0NvbnRyb2xsZXI6IHRydWUsXHJcblx0XHRcdGNvbnRyb2xsZXJBczogJyR1ZXhQb3BUYXJnZXRDdHJsJyxcclxuXHRcdFx0Y29udHJvbGxlcjogZnVuY3Rpb24gKCRlbGVtZW50KSB7XHJcblx0XHRcdFx0dGhpcy4kb25Jbml0ID0gKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5wb3BDb250YWluZXIucmVnaXN0ZXJUYXJnZXQoJGVsZW1lbnQpO1xyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBwb3AodWV4UG9wKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRyZXN0cmljdDogJ0UnLFxyXG5cdFx0XHR0ZXJtaW5hbDogdHJ1ZSxcclxuXHRcdFx0c2NvcGU6IHRydWUsXHJcblx0XHRcdHJlcXVpcmU6IHtcclxuXHRcdFx0XHRwb3BDb250YWluZXI6ICdedWV4UG9wQ29udGFpbmVyJ1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRiaW5kVG9Db250cm9sbGVyOiB7XHJcblx0XHRcdFx0ZGVsZWdhdGU6ICc9PydcclxuXHRcdFx0fSxcclxuXHRcdFx0Y29udHJvbGxlckFzOiAnJHVleFBvcEN0cmwnLFxyXG5cdFx0XHRjb250cm9sbGVyOiBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzKSB7XHJcblx0XHRcdFx0dmFyIHRhcmdldCxcclxuXHRcdFx0XHRcdGNsYXNzZXMgPSAkYXR0cnNbJ2NsYXNzJ10sXHJcblx0XHRcdFx0XHR0ZW1wbGF0ZSA9ICRlbGVtZW50Lmh0bWwoKSxcclxuXHRcdFx0XHRcdG9uID0gJGF0dHJzLm9uIHx8ICdjbGljayc7XHJcblxyXG5cdFx0XHRcdHZhciBzaG93UG9wID0gKCkgPT4ge1xyXG5cdFx0XHRcdFx0dWV4UG9wKHtcclxuXHRcdFx0XHRcdFx0c2NvcGU6ICRzY29wZSxcclxuXHRcdFx0XHRcdFx0dGFyZ2V0OiB0YXJnZXQsXHJcblx0XHRcdFx0XHRcdHBsYWNlbWVudDogJGF0dHJzLnBsYWNlbWVudCxcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogY2xhc3NlcyxcclxuXHRcdFx0XHRcdFx0dGVtcGxhdGU6IHRlbXBsYXRlXHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHR0aGlzLiRvbkluaXQgPSAoKSA9PiB7XHJcblx0XHRcdFx0XHR0YXJnZXQgPSB0aGlzLnBvcENvbnRhaW5lci5nZXRUYXJnZXQoKTtcclxuXHJcblx0XHRcdFx0XHRpZiAob24gPT09ICdjbGljaycpIHtcclxuXHRcdFx0XHRcdFx0dGFyZ2V0Lm9uKCdjbGljaycsICgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRzaG93UG9wKCk7XHJcblx0XHRcdFx0XHRcdFx0JHNjb3BlLiRhcHBseUFzeW5jKCk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fSBlbHNlIGlmIChvbiA9PT0gJ2hvdmVyJykge1xyXG5cdFx0XHRcdFx0XHR0YXJnZXQub24oJ21vdXNlZW50ZXInLCAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0c2hvd1BvcCgpO1xyXG5cdFx0XHRcdFx0XHRcdCRzY29wZS4kYXBwbHlBc3luYygpO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHR0aGlzLmRlbGVnYXRlID0ge1xyXG5cdFx0XHRcdFx0b3BlbjogKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRzaG93UG9wKCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0dGhpcy4kcG9zdExpbmsgPSAoKSA9PiB7XHJcblx0XHRcdFx0XHQkZWxlbWVudC5yZW1vdmVDbGFzcygpO1xyXG5cdFx0XHRcdFx0JGVsZW1lbnQuZW1wdHkoKTtcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxufSkoKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdGFuZ3VsYXJcclxuXHRcdC5tb2R1bGUoJ21yLnVleCcpXHJcblx0XHQuZmFjdG9yeSgndWV4UG9wdGlwJywgcG9wdGlwKTtcclxuXHJcblx0ZnVuY3Rpb24gcG9wdGlwKCRyb290U2NvcGUsICRhbmltYXRlLCAkY29tcGlsZSwgdWV4UG9zaXRpb25lcikge1xyXG5cdFx0dmFyICRib2R5ID0gJChkb2N1bWVudC5ib2R5KTtcclxuXHJcblx0XHQvLyBvcHRpb25zOlxyXG5cdFx0Ly8gICBzY29wZVxyXG5cdFx0Ly8gICBwbGFjZW1lbnQ6IFt0b3AsIHJpZ2h0LCBib3R0b20sIGxlZnRdIFtzdGFydCwgY2VudGVyLCBlbmRdXHJcblx0XHQvLyAgIG9mZnNldFxyXG5cdFx0Ly8gICB0YXJnZXRcclxuXHRcdC8vICAgdGVtcGxhdGVcclxuXHRcdC8vICAgY2xhc3Nlc1xyXG5cdFx0Ly8gICBsb2NhbHNcclxuXHRcdC8vICAgZGVsYXlcclxuXHRcdC8vXHJcblx0XHR2YXIgZnVuYyA9IG9wdGlvbnMgPT4ge1xyXG5cdFx0XHRvcHRpb25zLnBsYWNlbWVudCA9IG9wdGlvbnMucGxhY2VtZW50IHx8ICdib3R0b20gY2VudGVyJztcclxuXHRcdFx0b3B0aW9ucy5kZWxheSA9IG9wdGlvbnMuZGVsYXkgfHwgMDtcclxuXHRcdFx0b3B0aW9ucy50cmlnZ2VyID0gb3B0aW9ucy50cmlnZ2VyIHx8ICdob3Zlcic7XHJcblxyXG5cdFx0XHR2YXIgc2NvcGUgPSBvcHRpb25zLnNjb3BlIHx8ICRyb290U2NvcGUsXHJcblx0XHRcdFx0dGFyZ2V0ID0gb3B0aW9ucy50YXJnZXQsXHJcblx0XHRcdFx0ZWxlbWVudCA9ICQoZ2V0VGVtcGxhdGVQb3B0aXAob3B0aW9ucykpLFxyXG5cdFx0XHRcdGFuaW1hdGVFbnRlcixcclxuXHRcdFx0XHRhbmltYXRlTGVhdmUsXHJcblx0XHRcdFx0JGFycm93ID0gZWxlbWVudC5maW5kKCcudWV4LXBvcHRpcC1hcnJvdycpLFxyXG5cdFx0XHRcdGV2ZW50SW4gID0gb3B0aW9ucy50cmlnZ2VyID09PSAnaG92ZXInID8gJ21vdXNlZW50ZXInIDogJ2ZvY3VzaW4nLFxyXG5cdFx0XHRcdGV2ZW50T3V0ID0gb3B0aW9ucy50cmlnZ2VyID09PSAnaG92ZXInID8gJ21vdXNlbGVhdmUnIDogJ2ZvY3Vzb3V0JztcclxuXHJcblx0XHRcdHZhciBwb3NpdGlvbiA9ICgpID0+IHtcclxuXHRcdFx0XHR2YXIgbyA9IGFuZ3VsYXIuZXh0ZW5kKG9wdGlvbnMsIHtcclxuXHRcdFx0XHRcdHRhcmdldDogdGFyZ2V0LFxyXG5cdFx0XHRcdFx0ZWxlbWVudDogZWxlbWVudCxcclxuXHRcdFx0XHRcdG1hcmdpbjogNSxcclxuXHRcdFx0XHRcdHN0dWI6IHRydWVcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0dmFyIGNvbnRleHQgPSB1ZXhQb3NpdGlvbmVyKG8pO1xyXG5cdFx0XHRcdHVleFBvc2l0aW9uZXIuYXBwbHkoY29udGV4dCk7XHJcblxyXG5cdFx0XHRcdHZhciB2LFxyXG5cdFx0XHRcdFx0ZXAgPSBjb250ZXh0LmVwLFxyXG5cdFx0XHRcdFx0dHAgPSBjb250ZXh0LnRwLFxyXG5cdFx0XHRcdFx0cCA9IHVleFBvc2l0aW9uZXIucGFyc2VQbGFjZW1lbnQob3B0aW9ucy5wbGFjZW1lbnQpO1xyXG5cdFx0XHRcdHN3aXRjaCAocC5wbGFjZSkge1xyXG5cdFx0XHRcdFx0Y2FzZSAndG9wJzpcclxuXHRcdFx0XHRcdGNhc2UgJ2JvdHRvbSc6XHJcblx0XHRcdFx0XHRcdHYgPSB0cC5sZWZ0IC0gZXAubGVmdCArICh0cC53aWR0aCAvIDIpIC0gNTtcclxuXHRcdFx0XHRcdFx0aWYgKHYgPCA1KSB2ID0gNTtcclxuXHRcdFx0XHRcdFx0aWYgKHYgPiBlcC53aWR0aCAtIDE1KSB2ID0gZXAud2lkdGggLSAxNTtcclxuXHRcdFx0XHRcdFx0JGFycm93LmNzcygnbGVmdCcsIHYgKyAncHgnKTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0Y2FzZSAncmlnaHQnOlxyXG5cdFx0XHRcdFx0Y2FzZSAnbGVmdCc6XHJcblx0XHRcdFx0XHRcdHYgPSB0cC50b3AgLSBlcC50b3AgKyAodHAuaGVpZ2h0IC8gMikgLSA1O1xyXG5cdFx0XHRcdFx0XHRpZiAodiA8IDUpIHYgPSA1O1xyXG5cdFx0XHRcdFx0XHRpZiAodiA+IGVwLmhlaWdodCAtIDE1KSB2ID0gZXAuaGVpZ2h0IC0gMTU7XHJcblx0XHRcdFx0XHRcdCRhcnJvdy5jc3MoJ3RvcCcsIHYgKyAncHgnKTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRhbmltYXRlRW50ZXIgPSAkYW5pbWF0ZS5lbnRlcihlbGVtZW50LCAkYm9keSwgJGJvZHkuY2hpbGRyZW4oKS5sYXN0KCkpO1xyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0JGNvbXBpbGUoZWxlbWVudCkoYW5ndWxhci5leHRlbmQoc2NvcGUsIG9wdGlvbnMubG9jYWxzIHx8IHt9KSk7XHJcblxyXG5cdFx0XHR2YXIgYWRkVG9ET00gPSAoKSA9PiB7XHJcblx0XHRcdFx0aWYgKGFuaW1hdGVMZWF2ZSkgJGFuaW1hdGUuY2FuY2VsKGFuaW1hdGVMZWF2ZSk7XHJcblx0XHRcdFx0cG9zaXRpb24oKTtcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHZhciByZW1vdmVGcm9tRE9NID0gKCkgPT4ge1xyXG5cdFx0XHRcdGlmIChhbmltYXRlRW50ZXIpICRhbmltYXRlLmNhbmNlbChhbmltYXRlRW50ZXIpO1xyXG5cdFx0XHRcdGFuaW1hdGVMZWF2ZSA9ICRhbmltYXRlLmxlYXZlKGVsZW1lbnQpO1xyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0c2NvcGUuJG9uKCckZGVzdHJveScsICgpID0+IHtcclxuXHRcdFx0XHRyZW1vdmVGcm9tRE9NKCk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0dGFyZ2V0Lm9uKGV2ZW50SW4sICgpID0+IHtcclxuXHRcdFx0XHRzY29wZS4kYXBwbHkoKCkgPT4ge1xyXG5cdFx0XHRcdFx0YWRkVG9ET00oKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHR0YXJnZXQub24oZXZlbnRPdXQsICgpID0+IHtcclxuXHRcdFx0XHRzY29wZS4kYXBwbHkoKCkgPT4ge1xyXG5cdFx0XHRcdFx0cmVtb3ZlRnJvbURPTSgpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHRcdH07XHJcblxyXG5cdFx0cmV0dXJuIGZ1bmM7XHJcblxyXG5cdFx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcblx0XHRmdW5jdGlvbiBnZXRDbGFzc2VzT3B0aW9uKG9wdGlvbnMpIHtcclxuXHRcdFx0cmV0dXJuIG9wdGlvbnMuY2xhc3NlcyB8fCBvcHRpb25zWydjbGFzcyddO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGdldFdyYXBwZXJDbGFzc2VzKG9wdGlvbnMpIHtcclxuXHRcdFx0dmFyIGNsYXNzZXMgPSBnZXRDbGFzc2VzT3B0aW9uKG9wdGlvbnMpO1xyXG5cdFx0XHRyZXR1cm4gY2xhc3NlcyA/ICcgJyArIGNsYXNzZXMgOiAnJztcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBnZXRUZW1wbGF0ZVBvcHRpcChvcHRpb25zKSB7XHJcblx0XHRcdHJldHVybiAgJ1xcXHJcbjxkaXYgY2xhc3M9XCJ1ZXgtcG9wdGlwIHVleC1wb3B0aXAtcC0nICsgb3B0aW9ucy5wbGFjZW1lbnQgKyBnZXRXcmFwcGVyQ2xhc3NlcyhvcHRpb25zKSArICdcIj5cXFxyXG5cdDxkaXYgY2xhc3M9XCJ1ZXgtcG9wdGlwLWFycm93XCI+PC9kaXY+XFxcclxuXHQ8ZGl2IGNsYXNzPVwidWV4LXBvcHRpcC1jb250ZW50XCI+JyArIG9wdGlvbnMudGVtcGxhdGUgKyAnPC9kaXY+XFxcclxuPC9kaXY+JztcclxuXHRcdH1cclxuXHR9XHJcbn0pKCk7XHJcbiIsIihmdW5jdGlvbiAoKSB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cclxuXHRhbmd1bGFyXHJcblx0XHQubW9kdWxlKCdtci51ZXgnKVxyXG5cdFx0LmRpcmVjdGl2ZSgndWV4UG9wdGlwQ29udGFpbmVyJywgcG9wdGlwQ29udGFpbmVyKVxyXG5cdFx0LmRpcmVjdGl2ZSgndWV4UG9wdGlwVGFyZ2V0JywgcG9wdGlwVGFyZ2V0KVxyXG5cdFx0LmRpcmVjdGl2ZSgndWV4UG9wdGlwJywgcG9wdGlwKTtcclxuXHJcblx0ZnVuY3Rpb24gcG9wdGlwQ29udGFpbmVyKCkge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0cmVzdHJpY3Q6ICdBJyxcclxuXHRcdFx0c2NvcGU6IGZhbHNlLFxyXG5cdFx0XHRjb250cm9sbGVyOiBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0dmFyIF90YXJnZXRFbGVtZW50O1xyXG5cclxuXHRcdFx0XHR0aGlzLnJlZ2lzdGVyVGFyZ2V0ID0gdGFyZ2V0RWxlbWVudCA9PiB7XHJcblx0XHRcdFx0XHRfdGFyZ2V0RWxlbWVudCA9IHRhcmdldEVsZW1lbnQ7XHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0dGhpcy5nZXRUYXJnZXQgPSAoKSA9PiBfdGFyZ2V0RWxlbWVudDtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHBvcHRpcFRhcmdldCgpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHJlc3RyaWN0OiAnQScsXHJcblx0XHRcdHNjb3BlOiBmYWxzZSxcclxuXHRcdFx0cmVxdWlyZToge1xyXG5cdFx0XHRcdHBvcHRpcENvbnRhaW5lcjogJ151ZXhQb3B0aXBDb250YWluZXInXHJcblx0XHRcdH0sXHJcblx0XHRcdGJpbmRUb0NvbnRyb2xsZXI6IHRydWUsXHJcblx0XHRcdGNvbnRyb2xsZXJBczogJyR1ZXhQb3B0aXBUYXJnZXRDdHJsJyxcclxuXHRcdFx0Y29udHJvbGxlcjogZnVuY3Rpb24gKCRlbGVtZW50KSB7XHJcblx0XHRcdFx0dGhpcy4kb25Jbml0ID0gKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5wb3B0aXBDb250YWluZXIucmVnaXN0ZXJUYXJnZXQoJGVsZW1lbnQpO1xyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBwb3B0aXAodWV4UG9wdGlwKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRyZXN0cmljdDogJ0UnLFxyXG5cdFx0XHR0ZXJtaW5hbDogdHJ1ZSxcclxuXHRcdFx0c2NvcGU6IGZhbHNlLFxyXG5cdFx0XHR0ZW1wbGF0ZTogKCRlbGVtZW50LCAkYXR0cnMpID0+IHtcclxuXHRcdFx0XHQkYXR0cnMuJGh0bWwgPSAkZWxlbWVudC5odG1sKCk7XHJcblx0XHRcdFx0JGVsZW1lbnQuZW1wdHkoKTtcclxuXHRcdFx0fSxcclxuXHRcdFx0YmluZFRvQ29udHJvbGxlcjogdHJ1ZSxcclxuXHRcdFx0cmVxdWlyZToge1xyXG5cdFx0XHRcdHBvcHRpcENvbnRhaW5lcjogJ151ZXhQb3B0aXBDb250YWluZXInXHJcblx0XHRcdH0sXHJcblx0XHRcdGNvbnRyb2xsZXJBczogJyR1ZXhQb3B0aXBDdHJsJyxcclxuXHRcdFx0Y29udHJvbGxlcjogZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQsICRhdHRycykge1xyXG5cdFx0XHRcdHZhciB0ZW1wbGF0ZSA9ICRhdHRycy4kaHRtbDtcclxuXHJcblx0XHRcdFx0dGhpcy4kb25Jbml0ID0gKCkgPT4ge1xyXG5cdFx0XHRcdFx0dmFyIHRhcmdldCA9IHRoaXMucG9wdGlwQ29udGFpbmVyLmdldFRhcmdldCgpO1xyXG5cclxuXHRcdFx0XHRcdHVleFBvcHRpcCh7XHJcblx0XHRcdFx0XHRcdHNjb3BlOiAkc2NvcGUsXHJcblx0XHRcdFx0XHRcdHRhcmdldDogdGFyZ2V0LFxyXG5cdFx0XHRcdFx0XHRwbGFjZW1lbnQ6ICRhdHRycy5wbGFjZW1lbnQsXHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6ICRhdHRyc1snY2xhc3MnXSxcclxuXHRcdFx0XHRcdFx0dHJpZ2dlcjogJGF0dHJzLnRyaWdnZXIsXHJcblx0XHRcdFx0XHRcdHRlbXBsYXRlOiB0ZW1wbGF0ZVxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcbn0pKCk7XHJcbiIsIihmdW5jdGlvbiAoKSB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cclxuXHRhbmd1bGFyLm1vZHVsZSgnbXIudWV4JykuY29tcG9uZW50KCd1ZXhSYWRpbycsIHtcclxuXHRcdHRlbXBsYXRlOiAnXFxcclxuXHRcdFx0PGRpdiBjbGFzcz1cIl91ZXgtaWNvblwiPlxcXHJcblx0XHRcdFx0PGRpdiBjbGFzcz1cIl91ZXgtb25cIj48L2Rpdj5cXFxyXG5cdFx0XHQ8L2Rpdj5cXFxyXG5cdFx0XHQ8bmctdHJhbnNjbHVkZSBjbGFzcz1cIl91ZXgtbGFiZWxcIj48L25nLXRyYW5zY2x1ZGU+JyxcclxuXHRcdHRyYW5zY2x1ZGU6IHRydWUsXHJcblx0XHRjb250cm9sbGVyOiAkY3RybCxcclxuXHRcdHJlcXVpcmU6IHtcclxuXHRcdFx0dWV4UmFkaW9Hcm91cEN0cmw6ICdedWV4UmFkaW9Hcm91cCdcclxuXHRcdH0sXHJcblx0XHRiaW5kaW5nczoge1xyXG5cdFx0XHR2YWx1ZTogJzwnXHJcblx0XHR9XHJcblx0fSk7XHJcblxyXG5cdGZ1bmN0aW9uICRjdHJsKCRzY29wZSwgJGVsZW1lbnQsICRhdHRycykge1xyXG5cdFx0dmFyIGxhc3RDaGVja2VkO1xyXG5cclxuXHRcdHZhciByZW5kZXIgPSAoKSA9PiB7XHJcblx0XHRcdHZhciBhdHRyVmFsdWUgPSAkYXR0cnMudmFsdWU7XHJcblx0XHRcdHZhciBjaGVja2VkID0gYXR0clZhbHVlID09PSB0aGlzLnVleFJhZGlvR3JvdXBDdHJsLm1vZGVsO1xyXG5cdFx0XHRpZiAoY2hlY2tlZCA9PT0gbGFzdENoZWNrZWQpIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGxhc3RDaGVja2VkID0gY2hlY2tlZDtcclxuXHRcdFx0aWYgKGNoZWNrZWQpIHtcclxuXHRcdFx0XHQkZWxlbWVudC5hZGRDbGFzcygnY2hlY2tlZCcpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdCRlbGVtZW50LnJlbW92ZUNsYXNzKCdjaGVja2VkJyk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0JGF0dHJzLiRvYnNlcnZlKCd2YWx1ZScsIHJlbmRlcik7XHJcblx0XHQkc2NvcGUuJHdhdGNoKCgpID0+IHRoaXMudWV4UmFkaW9Hcm91cEN0cmwubW9kZWwsIHJlbmRlcik7XHJcblxyXG5cdFx0dmFyIGNsaWNrTGlzdGVuZXIgPSBlID0+IHtcclxuXHRcdFx0aWYgKGUuaXNEZWZhdWx0UHJldmVudGVkKCkgfHwgJGVsZW1lbnQuYXR0cignZGlzYWJsZWQnKSkge1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0JHNjb3BlLiRhcHBseSgoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy51ZXhSYWRpb0dyb3VwQ3RybC5zZWxlY3QoJGF0dHJzLnZhbHVlKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy4kcG9zdExpbmsgPSAoKSA9PiB7XHJcblx0XHRcdCRlbGVtZW50Lm9uKCdjbGljaycsIGNsaWNrTGlzdGVuZXIpO1xyXG5cdFx0fTtcclxuXHR9XHJcbn0pKCk7XHJcbiIsIihmdW5jdGlvbiAoKSB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cclxuXHRhbmd1bGFyLm1vZHVsZSgnbXIudWV4JykuY29tcG9uZW50KCd1ZXhSYWRpb0dyb3VwJywge1xyXG5cdFx0Y29udHJvbGxlcjogJGN0cmwsXHJcblx0XHRyZXF1aXJlOiB7XHJcblx0XHRcdG5nTW9kZWxDdHJsOiAnXm5nTW9kZWwnXHJcblx0XHR9LFxyXG5cdFx0YmluZGluZ3M6IHtcclxuXHRcdFx0bW9kZWw6ICc9bmdNb2RlbCdcclxuXHRcdH1cclxuXHR9KTtcclxuXHJcblx0ZnVuY3Rpb24gJGN0cmwoJHNjb3BlKSB7XHJcblx0XHR0aGlzLnNlbGVjdCA9IHZhbHVlID0+IHtcclxuXHRcdFx0dGhpcy5uZ01vZGVsQ3RybC4kc2V0Vmlld1ZhbHVlKHZhbHVlKTtcclxuXHRcdH07XHJcblx0fVxyXG59KSgpO1xyXG4iLCIoZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0YW5ndWxhclxyXG5cdFx0Lm1vZHVsZSgnbXIudWV4JylcclxuXHRcdC5jb21wb25lbnQoJ3VleFNlbGVjdCcsIHtcclxuXHRcdFx0dGVtcGxhdGU6ICgkZWxlbWVudCwgJGF0dHJzKSA9PiB7XHJcblx0XHRcdFx0J25nSW5qZWN0JztcclxuXHJcblx0XHRcdFx0JGF0dHJzLiRodG1sID0gJGVsZW1lbnQuaHRtbCgpO1xyXG5cdFx0XHRcdCRlbGVtZW50LmVtcHR5KCk7XHJcblxyXG5cdFx0XHRcdHJldHVybiAnXFxcclxuPGRpdiBjbGFzcz1cInVleC1zZWxlY3RcIiBuZy1jbGFzcz1cIntvcGVuOiAkY3RybC5vcGVuZWR9XCI+XFxcclxuXHQ8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImJ1dHRvbiBoYXMtY2FyZXRcIiBuZy1jbGljaz1cIiRjdHJsLm9wZW4oKVwiPlxcXHJcblx0XHR7eyRjdHJsLnRleHR9fVxcXHJcblx0PC9idXR0b24+XFxcclxuXHQ8dWV4LWljb24gaWNvbj1cImNsb3NlXCIgY2xhc3M9XCJidG4tcGxhaW4gYnRuLWRpbVwiIG5nLWlmPVwiJGN0cmwuY2xlYXJhYmxlICYmICRjdHJsLnNlbGVjdGVkXCIgbmctY2xpY2s9XCIkY3RybC5jbGVhcigpXCI+PC91ZXgtaWNvbj5cXFxyXG48L2Rpdj4nO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRjb250cm9sbGVyOiB1ZXhTZWxlY3RDdHJsLFxyXG5cdFx0XHRyZXF1aXJlOiB7XHJcblx0XHRcdFx0bmdNb2RlbEN0cmw6ICduZ01vZGVsJ1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRiaW5kaW5nczoge1xyXG5cdFx0XHRcdGV4cDogJ0AnLFxyXG5cdFx0XHRcdG9yaWdpbmFsVGV4dDogJ0B0ZXh0JyxcclxuXHRcdFx0XHRoZWFkZXI6ICdAPycsXHJcblx0XHRcdFx0Y2xhc3NlczogJ0A/JyxcclxuXHRcdFx0XHRjbGVhcmFibGU6ICc8PydcclxuXHRcdFx0fVxyXG5cdFx0fSlcclxuXHRcdC5kaXJlY3RpdmUoJ3VleFNlbGVjdFRyYW5zY2x1ZGUnLCB1ZXhTZWxlY3RUcmFuc2NsdWRlKVxyXG5cdFx0LmRpcmVjdGl2ZSgndWV4U2VsZWN0U2ltcGxlJywgdWV4U2VsZWN0U2ltcGxlKTtcclxuXHJcblx0ZnVuY3Rpb24gdWV4U2VsZWN0VHJhbnNjbHVkZSgpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHJlc3RyaWN0OiAnQScsXHJcblx0XHRcdGNvbXBpbGU6IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0cHJlOiBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzKSB7XHJcblx0XHRcdFx0XHRcdHZhciBjdHJsID0gJHNjb3BlLiRjdHJsO1xyXG5cdFx0XHRcdFx0XHRjdHJsLl9wb3B1bGF0ZVNjb3BlKCRzY29wZSk7XHJcblxyXG5cdFx0XHRcdFx0XHQkc2NvcGUuJGV2YWxBc3luYygoKSA9PiBjdHJsLnBvcCgpLnBvc2l0aW9uKCkpO1xyXG5cclxuXHRcdFx0XHRcdFx0JHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHRcdFx0Y3RybC5fcmVtb3ZlU2NvcGUoJHNjb3BlKTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHVleFNlbGVjdEN0cmwoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzLCAkcGFyc2UsIHVleFBvcCkge1xyXG5cdFx0dmFsaWRhdGUoJGF0dHJzKTtcclxuXHJcblx0XHR2YXIgc2NvcGVzID0gW10sXHJcblx0XHRcdG9yaWdpbmFsVGV4dCA9IHRoaXMub3JpZ2luYWxUZXh0LFxyXG5cdFx0XHRvcHRpb25zID0gcGFyc2UodGhpcy5leHApLFxyXG5cdFx0XHRrZXlOYW1lID0gb3B0aW9ucy5rZXlOYW1lLFxyXG5cdFx0XHRjbGFzc2VzID0gdGhpcy5jbGFzc2VzLFxyXG5cdFx0XHRwb3BJbnN0YW5jZTtcclxuXHJcblx0XHR2YXIgY29udGVudCA9ICRhdHRycy4kaHRtbCxcclxuXHRcdFx0JGJ1dHRvbjtcclxuXHJcblx0XHR2YXIgZGlzcGxheSA9IGl0ZW0gPT4ge1xyXG5cdFx0XHRpZiAob3B0aW9ucy5hc0ZuID09PSBhbmd1bGFyLm5vb3ApIHJldHVybiBpdGVtO1xyXG5cdFx0XHR2YXIgbG9jYWxzID0ge307XHJcblx0XHRcdGxvY2Fsc1trZXlOYW1lXSA9IGl0ZW07XHJcblx0XHRcdHJldHVybiBvcHRpb25zLmFzRm4oJHNjb3BlLCBsb2NhbHMpO1xyXG5cdFx0fTtcclxuXHJcblx0XHR2YXIgdHJhY2sgPSBpdGVtID0+IHtcclxuXHRcdFx0aWYgKG9wdGlvbnMudHJhY2tGbiA9PT0gYW5ndWxhci5ub29wKSByZXR1cm4gaXRlbTtcclxuXHRcdFx0dmFyIGxvY2FscyA9IHt9O1xyXG5cdFx0XHRsb2NhbHNba2V5TmFtZV0gPSBpdGVtO1xyXG5cdFx0XHRyZXR1cm4gb3B0aW9ucy50cmFja0ZuKCRzY29wZSwgbG9jYWxzKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dmFyIGdldEl0ZW1zID0gKCkgPT4ge1xyXG5cdFx0XHRyZXR1cm4gb3B0aW9ucy5pbkZuKCRzY29wZS4kcGFyZW50KTtcclxuXHRcdH07XHJcblxyXG5cdFx0dmFyIHNldFRleHQgPSB0ID0+IHtcclxuXHRcdFx0dGhpcy50ZXh0ID0gdDtcclxuXHRcdH07XHJcblxyXG5cdFx0dmFyIHJlc2V0VGV4dCA9ICgpID0+IHtcclxuXHRcdFx0dGhpcy50ZXh0ID0gb3JpZ2luYWxUZXh0O1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLiRwb3N0TGluayA9ICgpID0+IHtcclxuXHRcdFx0JGJ1dHRvbiA9ICRlbGVtZW50LmZpbmQoJy5idXR0b24nKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy4kb25Jbml0ID0gKCkgPT4ge1xyXG5cdFx0XHR0aGlzLm5nTW9kZWxDdHJsLiRyZW5kZXIgPSAoKSA9PiB7XHJcblx0XHRcdFx0dmFyIHZhbHVlID0gdGhpcy5uZ01vZGVsQ3RybC4kdmlld1ZhbHVlO1xyXG5cdFx0XHRcdHRoaXMuc2VsZWN0KHZhbHVlID8gdmFsdWUgOiBudWxsKTtcclxuXHRcdFx0fTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5fcG9wdWxhdGVTY29wZSA9IHNjb3BlID0+IHtcclxuXHRcdFx0dmFyIGl0ZW0gPSBzY29wZS5pdGVtO1xyXG5cdFx0XHRzY29wZXMucHVzaChzY29wZSk7XHJcblx0XHRcdGlmIChpdGVtICYmIHRyYWNrKGl0ZW0pID09PSB0cmFjayh0aGlzLnNlbGVjdGVkKSkge1xyXG5cdFx0XHRcdHNjb3BlLiRzZWxlY3RlZCA9IHRydWU7XHJcblx0XHRcdH0gZWxzZSBpZiAoaXRlbSkge1xyXG5cdFx0XHRcdHNjb3BlLiRzZWxlY3RlZCA9IGZhbHNlO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChpdGVtKSB7XHJcblx0XHRcdFx0c2NvcGVba2V5TmFtZV0gPSBpdGVtO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuX3JlbW92ZVNjb3BlID0gc2NvcGUgPT4ge1xyXG5cdFx0XHR2YXIgaW5kZXggPSBzY29wZXMuaW5kZXhPZihzY29wZSk7XHJcblx0XHRcdGlmIChpbmRleCA+PSAwKSB7XHJcblx0XHRcdFx0c2NvcGVzLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5fZmluZFNjb3BlID0gKGl0ZW0sIHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHNjb3Blcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdHZhciBzY29wZSA9IHNjb3Blc1tpXTtcclxuXHRcdFx0XHRpZiAoaXRlbSA9PT0gc2NvcGUuaXRlbSkge1xyXG5cdFx0XHRcdFx0aWYgKHJlc29sdmUpXHJcblx0XHRcdFx0XHRcdHJlc29sdmUoc2NvcGUpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRpZiAocmVqZWN0KVxyXG5cdFx0XHRcdFx0XHRyZWplY3Qoc2NvcGUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLm9wZW4gPSAoKSA9PiB7XHJcblx0XHRcdHRoaXMub3BlbmVkID0gdHJ1ZTtcclxuXHRcdFx0aWYgKCFwb3BJbnN0YW5jZSkge1xyXG5cdFx0XHRcdHBvcEluc3RhbmNlID0gdWV4UG9wKHtcclxuXHRcdFx0XHRcdHNjb3BlOiAkc2NvcGUsXHJcblx0XHRcdFx0XHR0YXJnZXQ6ICRidXR0b24sXHJcblx0XHRcdFx0XHRwbGFjZW1lbnQ6ICdib3R0b20gc3RhcnQnLFxyXG5cdFx0XHRcdFx0Y2xhc3NlczogJ3VleC1zZWxlY3QtcG9wICcgKyBjbGFzc2VzLFxyXG5cdFx0XHRcdFx0dGVtcGxhdGU6IGdldFRlbXBsYXRlUG9wKGNvbnRlbnQpXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0cG9wSW5zdGFuY2Uub25EaXNtaXNzKCgpID0+IHRoaXMub3BlbmVkID0gZmFsc2UpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHBvcEluc3RhbmNlLm9wZW4oKTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmNsb3NlID0gKCkgPT4ge1xyXG5cdFx0XHRpZiAocG9wSW5zdGFuY2UpIHBvcEluc3RhbmNlLmRpc21pc3MoKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5jbGVhciA9ICgpID0+IHRoaXMuc2VsZWN0KG51bGwpO1xyXG5cclxuXHRcdHRoaXMuc2VsZWN0ID0gaXRlbSA9PiB7XHJcblx0XHRcdGlmICghaXRlbSAmJiAhdGhpcy5zZWxlY3RlZCkgcmV0dXJuO1xyXG5cclxuXHRcdFx0dGhpcy5zZWxlY3RlZCA9IGl0ZW07XHJcblxyXG5cdFx0XHRpZiAoaXRlbSkge1xyXG5cdFx0XHRcdHRoaXMuX2ZpbmRTY29wZShpdGVtLCBzY29wZSA9PiB7XHJcblx0XHRcdFx0XHRzY29wZS4kc2VsZWN0ZWQgPSB0cnVlO1xyXG5cdFx0XHRcdH0sIHNjb3BlID0+IHtcclxuXHRcdFx0XHRcdHNjb3BlLiRzZWxlY3RlZCA9IGZhbHNlO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdHRoaXMubmdNb2RlbEN0cmwuJHNldFZpZXdWYWx1ZShpdGVtKTtcclxuXHRcdFx0XHRzZXRUZXh0KGRpc3BsYXkoaXRlbSkpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRoaXMuX2ZpbmRTY29wZShudWxsLCBudWxsLCBzY29wZSA9PiB7XHJcblx0XHRcdFx0XHRzY29wZS4kc2VsZWN0ZWQgPSBmYWxzZTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHR0aGlzLm5nTW9kZWxDdHJsLiRzZXRWaWV3VmFsdWUobnVsbCk7XHJcblx0XHRcdFx0cmVzZXRUZXh0KCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHRoaXMuY2xvc2UoKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5pdGVtcyA9ICgpID0+IGdldEl0ZW1zKCk7XHJcblxyXG5cdFx0dGhpcy5wb3AgPSAoKSA9PiBwb3BJbnN0YW5jZTtcclxuXHJcblx0XHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuXHRcdGlmICh0aGlzLmNsZWFyYWJsZSA9PT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdHRoaXMuY2xlYXJhYmxlID0gdHJ1ZTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoIXRoaXMuaGVhZGVyKSB7XHJcblx0XHRcdHRoaXMuaGVhZGVyID0gb3JpZ2luYWxUZXh0O1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMub3BlbmVkID0gZmFsc2U7XHJcblx0XHR0aGlzLnNlbGVjdGVkID0gbnVsbDtcclxuXHRcdHRoaXMudGV4dCA9IG9yaWdpbmFsVGV4dDtcclxuXHJcblx0XHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuXHRcdGZ1bmN0aW9uIHBhcnNlKGV4cCkge1xyXG5cdFx0XHR2YXIgbWF0Y2ggPSBleHAubWF0Y2goXHJcblx0XHRcdFx0L15cXHMqKFtcXHNcXFNdKz8pXFxzK2luXFxzKyhbXFxzXFxTXSs/KSg/Olxccythc1xccysoW1xcc1xcU10rPykpPyg/Olxccyt0cmFja1xccytieVxccysoW1xcc1xcU10rPykpP1xccyokLyk7XHJcblxyXG5cdFx0XHR2YXIgcGFyc2VkID0ge1xyXG5cdFx0XHRcdGtleU5hbWU6IG1hdGNoWzFdLFxyXG5cdFx0XHRcdGluRm46ICRwYXJzZShtYXRjaFsyXSksXHJcblx0XHRcdFx0YXNGbjogJHBhcnNlKG1hdGNoWzNdKSxcclxuXHRcdFx0XHR0cmFja0ZuOiAkcGFyc2UobWF0Y2hbNF0pXHJcblx0XHRcdH07XHJcblx0XHRcdHBhcnNlZC5hc3luY01vZGUgPSAhcGFyc2VkLmluRm4uYXNzaWduICYmICFwYXJzZWQuaW5Gbi5saXRlcmFsO1xyXG5cdFx0XHRyZXR1cm4gcGFyc2VkO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIHZhbGlkYXRlKCRhdHRycykge1xyXG5cdFx0XHRpZiAoISRhdHRycy5leHApIHtcclxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1xcJ3VleFNlbGVjdFxcJzogQXR0cmlidXRlIFxcJ2V4cFxcJyBpcyByZXF1aXJlZC4nKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGdldFRlbXBsYXRlUG9wKGNvbnRlbnQpIHtcclxuXHRcdFx0cmV0dXJuICdcXFxyXG48aGVhZGVyPlxcXHJcblx0PHVleC1pY29uIGljb249XCJjbG9zZVwiIGNsYXNzPVwiY2xvc2UtYnRuIGJ0bi1wbGFpbiBidG4tZGltXCIgbmctY2xpY2s9XCIkcG9wLmRpc21pc3MoKVwiPjwvdWV4LWljb24+XFxcclxuXHQ8ZGl2IGNsYXNzPVwiaGVhZGVyLXRleHRcIj57ezo6JGN0cmwuaGVhZGVyfX08L2Rpdj5cXFxyXG48L2hlYWRlcj5cXFxyXG48ZGl2IGNsYXNzPVwiX3VleC1jb250ZW50XCI+XFxcclxuXHQ8dWwgY2xhc3M9XCJvcHRpb25zIG5vLW1hcmdpblwiPlxcXHJcblx0XHQ8bGkgbmctcmVwZWF0PVwiaXRlbSBpbiAkY3RybC5pdGVtcygpXCIgbmctY2xpY2s9XCIkY3RybC5zZWxlY3QoaXRlbSlcIiB1ZXgtc2VsZWN0LXRyYW5zY2x1ZGU+JyArIGNvbnRlbnQgKyAnPC9saT5cXFxyXG5cdDwvdWw+XFxcclxuPC9kaXY+JztcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHVleFNlbGVjdFNpbXBsZSgpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHJlc3RyaWN0OiAnRScsXHJcblx0XHRcdHRyYW5zY2x1ZGU6IHRydWUsXHJcblx0XHRcdHRlbXBsYXRlOiAnXFxcclxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwidWV4LXNlbGVjdC1zaW1wbGUtY29udGVudFwiIG5nLXRyYW5zY2x1ZGU+PC9kaXY+XFxcclxuXHRcdFx0XHQ8dWV4LWljb24gaWNvbj1cImNoZWNrXCIgbmctaWY9XCIkc2VsZWN0ZWRcIj48L3VleC1pY29uPidcclxuXHRcdH07XHJcblx0fVxyXG59KSgpO1xyXG4iLCIoZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0YW5ndWxhclxyXG5cdFx0Lm1vZHVsZSgnbXIudWV4JylcclxuXHRcdC5kaXJlY3RpdmUoJ3VleFRvb2x0aXAnLCB1ZXhUb29sdGlwKTtcclxuXHJcblx0ZnVuY3Rpb24gdWV4VG9vbHRpcCgpIHtcclxuXHRcdGZ1bmN0aW9uIGV4dHJhY3RQbGFjZW1lbnQodikge1xyXG5cdFx0XHR2YXIgaW5kZXggPSB2LmluZGV4T2YoJywnKTtcclxuXHRcdFx0cmV0dXJuIHYuc2xpY2UoMCwgaW5kZXgpLnRyaW0oKTtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBleHRyYWN0VGV4dCh2KSB7XHJcblx0XHRcdHZhciBpbmRleCA9IHYuaW5kZXhPZignLCcpO1xyXG5cdFx0XHRyZXR1cm4gdi5zbGljZShpbmRleCArIDEpLnRyaW0oKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRyZXN0cmljdDogJ0EnLFxyXG5cdFx0XHRzY29wZTogZmFsc2UsXHJcblx0XHRcdGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMpIHtcclxuXHRcdFx0XHR2YXIgcGxhY2VtZW50ID0gZXh0cmFjdFBsYWNlbWVudCgkYXR0cnMudWV4VG9vbHRpcCk7XHJcblx0XHRcdFx0JGVsZW1lbnQuYWRkQ2xhc3MoJ3Rvb2x0aXBwZWQgdG9vbHRpcHBlZC0nICsgcGxhY2VtZW50KTtcclxuXHJcblx0XHRcdFx0JGF0dHJzLiRvYnNlcnZlKCd1ZXhUb29sdGlwJywgZnVuY3Rpb24gKHYpIHtcclxuXHRcdFx0XHRcdHZhciB0ZXh0ID0gZXh0cmFjdFRleHQodik7XHJcblx0XHRcdFx0XHQkZWxlbWVudC5hdHRyKCdhcmlhLWxhYmVsJywgdGV4dCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG59KSgpO1xyXG4iXSwic291cmNlUm9vdCI6Ii9jb21wb25lbnRzIn0=
