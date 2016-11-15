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
			link: function ($scope, $element, $attrs) {
				var ctrl = $scope.$ctrl;
				ctrl._populateScope($scope);

				$scope.$evalAsync(() => ctrl.pop().position());

				$scope.$on('$destroy', function () {
					ctrl._removeScope($scope);
				});
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUuanMiLCJjaGVja2JveC9jaGVja2JveC5qcyIsImF1dG9jb21wbGV0ZS9hdXRvY29tcGxldGUuanMiLCJpY29uL2ljb24uanMiLCJtaXNjL2FsaWFzLmpzIiwibWlzYy9mb2N1cy5qcyIsIm1pc2MvcG9zaXRpb25lci5qcyIsIm1pc2MvcG9zaXRpb25pbmdUaHJvdHRsZXIuanMiLCJtaXNjL3V0aWwuanMiLCJtb2RhbC9tb2RhbC5qcyIsIm1vZGFsL21vZGFsRGlyZWN0aXZlLmpzIiwicC9wLmpzIiwicG9wL3BvcC5qcyIsInBvcC9wb3BEaXJlY3RpdmUuanMiLCJwb3B0aXAvcG9wdGlwLmpzIiwicG9wdGlwL3BvcHRpcERpcmVjdGl2ZS5qcyIsInJhZGlvL3JhZGlvLmpzIiwicmFkaW8vcmFkaW9Hcm91cC5qcyIsInNlbGVjdC9zZWxlY3QuanMiLCJ0b29sdGlwL3Rvb2x0aXAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL01BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeE5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0UkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6Im5nLW1yLXVleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImFuZ3VsYXJcclxuXHQubW9kdWxlKCdtci51ZXgnLCBbJ25nQW5pbWF0ZSddKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdGFuZ3VsYXIubW9kdWxlKCdtci51ZXgnKS5jb21wb25lbnQoJ3VleENoZWNrYm94Jywge1xyXG5cdFx0dGVtcGxhdGU6ICdcXFxyXG5cdFx0XHQ8ZGl2IGNsYXNzPVwiX3VleC1pY29uXCIgbmctY2xhc3M9XCJ7XFwnY2hlY2tlZFxcJzogJGN0cmwubW9kZWx9XCI+PC9kaXY+XFxcclxuXHRcdFx0PG5nLXRyYW5zY2x1ZGUgY2xhc3M9XCJfdWV4LWxhYmVsXCI+PC9uZy10cmFuc2NsdWRlPicsXHJcblx0XHR0cmFuc2NsdWRlOiB0cnVlLFxyXG5cdFx0Y29udHJvbGxlcjogJGN0cmwsXHJcblx0XHRyZXF1aXJlOiB7XHJcblx0XHRcdG5nTW9kZWxDdHJsOiAnbmdNb2RlbCdcclxuXHRcdH0sXHJcblx0XHRiaW5kaW5nczoge1xyXG5cdFx0XHRtb2RlbDogJz1uZ01vZGVsJ1xyXG5cdFx0fVxyXG5cdH0pO1xyXG5cclxuXHRmdW5jdGlvbiAkY3RybCgkc2NvcGUsICRlbGVtZW50KSB7XHJcblx0XHR2YXIgcmVuZGVyID0gKCkgPT4ge1xyXG5cdFx0XHRpZiAodGhpcy5tb2RlbCkge1xyXG5cdFx0XHRcdCRlbGVtZW50LmFkZENsYXNzKCdjaGVja2VkJyk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0JGVsZW1lbnQucmVtb3ZlQ2xhc3MoJ2NoZWNrZWQnKTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHQkc2NvcGUuJHdhdGNoKCgpID0+IHRoaXMubW9kZWwsIHJlbmRlcik7XHJcblxyXG5cdFx0dmFyIGNsaWNrTGlzdGVuZXIgPSBlID0+IHtcclxuXHRcdFx0aWYgKGUuaXNEZWZhdWx0UHJldmVudGVkKCkgfHwgJGVsZW1lbnQuYXR0cignZGlzYWJsZWQnKSkge1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0JHNjb3BlLiRhcHBseSgoKSA9PiB7XHJcblx0XHRcdFx0dmFyIHZpZXdWYWx1ZSA9ICF0aGlzLm1vZGVsO1xyXG5cdFx0XHRcdHRoaXMubmdNb2RlbEN0cmwuJHNldFZpZXdWYWx1ZSh2aWV3VmFsdWUpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy4kcG9zdExpbmsgPSAoKSA9PiB7XHJcblx0XHRcdCRlbGVtZW50Lm9uKCdjbGljaycsIGNsaWNrTGlzdGVuZXIpO1xyXG5cdFx0fTtcclxuXHR9XHJcbn0pKCk7XHJcbiIsIihmdW5jdGlvbiAoKSB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cclxuXHRhbmd1bGFyXHJcblx0XHQubW9kdWxlKCdtci51ZXgnKVxyXG5cdFx0LmRpcmVjdGl2ZSgndWV4QXV0b2NvbXBsZXRlJywgdWV4QXV0b2NvbXBsZXRlKTtcclxuXHJcblx0ZnVuY3Rpb24gdWV4QXV0b2NvbXBsZXRlQ3RybCgkc2NvcGUsICRhdHRycywgJHBhcnNlLCAkcSkge1xyXG5cdFx0ZnVuY3Rpb24gcGFyc2UoZXhwKSB7XHJcblx0XHRcdHZhciBtYXRjaCA9IGV4cC5tYXRjaCgvXlxccyooW1xcc1xcU10rPylcXHMraW5cXHMrKFtcXHNcXFNdKz8pKD86XFxzK2FzXFxzKyhbXFxzXFxTXSs/KSk/XFxzKiQvKTtcclxuXHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0a2V5TmFtZTogbWF0Y2hbMV0sXHJcblx0XHRcdFx0aW5GbjogJHBhcnNlKG1hdGNoWzJdKSxcclxuXHRcdFx0XHRhc0ZuOiAkcGFyc2UobWF0Y2hbM10pXHJcblx0XHRcdH07XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKCRhdHRycy5leHAgPT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1xcJ3VleEF1dG9jb21wbGV0ZVxcJzogQXR0cmlidXRlIFxcJ2V4cFxcJyBpcyByZXF1aXJlZC4nKTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgY3RybCA9IHRoaXMsXHJcblx0XHRcdG9wdGlvbnMgPSBwYXJzZSgkYXR0cnMuZXhwKSxcclxuXHRcdFx0a2V5TmFtZSA9IG9wdGlvbnMua2V5TmFtZSxcclxuXHRcdFx0cHJvbWlzZTtcclxuXHJcblx0XHRjdHJsLml0ZW1zID0gW107XHJcblx0XHRjdHJsLnRleHQgPSBbXTtcclxuXHRcdGN0cmwub3B0aW9ucyA9IG9wdGlvbnM7XHJcblx0XHRjdHJsLmtleU5hbWUgPSBrZXlOYW1lO1xyXG5cdFx0Y3RybC5hY3RpdmVJdGVtID0gbnVsbDtcclxuXHRcdGN0cmwuYWN0aXZlSW5kZXggPSAtMTtcclxuXHJcblx0XHR2YXIgdHJhbnNpZW50ID0gZmFsc2U7XHJcblxyXG5cdFx0Y3RybC5kaXNwbGF5ID0gZnVuY3Rpb24gKGl0ZW0pIHtcclxuXHRcdFx0aWYgKG9wdGlvbnMuYXNGbiA9PT0gYW5ndWxhci5ub29wKSByZXR1cm4gaXRlbTtcclxuXHRcdFx0dmFyIGxvY2FscyA9IHt9O1xyXG5cdFx0XHRsb2NhbHNba2V5TmFtZV0gPSBpdGVtO1xyXG5cdFx0XHRyZXR1cm4gb3B0aW9ucy5hc0ZuKCRzY29wZSwgbG9jYWxzKTtcclxuXHRcdH07XHJcblxyXG5cdFx0Y3RybC5zZWxlY3QgPSBmdW5jdGlvbiAoaXRlbSkge1xyXG5cdFx0XHRjdHJsLnRleHQgPSBjdHJsLmRpc3BsYXkoaXRlbSk7XHJcblx0XHRcdGN0cmwuY2xlYXIoKTtcclxuXHRcdFx0dHJhbnNpZW50ID0gdHJ1ZTtcclxuXHRcdH07XHJcblxyXG5cdFx0Y3RybC5zZXRBY3RpdmUgPSBmdW5jdGlvbiAoaW5kZXgpIHtcclxuXHRcdFx0aWYgKGluZGV4ID09PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0XHRjdHJsLmFjdGl2ZUl0ZW0gPSBudWxsO1xyXG5cdFx0XHRcdGN0cmwuYWN0aXZlSW5kZXggPSAtMTtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHRcdFx0dmFyIGl0ZW0gPSBjdHJsLml0ZW1zW2luZGV4XTtcclxuXHJcblx0XHRcdGN0cmwuYWN0aXZlSXRlbSA9IGl0ZW07XHJcblx0XHRcdGN0cmwuYWN0aXZlSW5kZXggPSBpbmRleDtcclxuXHRcdH07XHJcblxyXG5cdFx0Y3RybC5tb3VzZW92ZXIgPSBmdW5jdGlvbiAoaXRlbSwgaW5kZXgpIHtcclxuXHRcdFx0Y3RybC5zZXRBY3RpdmUoaW5kZXgpO1xyXG5cdFx0fTtcclxuXHJcblx0XHRjdHJsLmNsZWFyID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRjdHJsLml0ZW1zID0gW107XHJcblx0XHRcdGN0cmwuc2V0QWN0aXZlKCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdGZ1bmN0aW9uIGZpbHRlcklmTm90UHJvbWlzZShvKSB7XHJcblx0XHRcdGlmIChvLnRoZW4pIHJldHVybiBvO1xyXG5cdFx0XHR2YXIgdGV4dCA9IGN0cmwudGV4dDtcclxuXHRcdFx0aWYgKCF0ZXh0IHx8IHRleHQudHJpbSgpID09PSAnJykgcmV0dXJuIG87XHJcblx0XHRcdHZhciByID0gW107XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgby5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdGlmIChjdHJsLmRpc3BsYXkob1tpXSkuaW5kZXhPZih0ZXh0KSA+IC0xKSB7XHJcblx0XHRcdFx0XHRyLnB1c2gob1tpXSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiByO1xyXG5cdFx0fVxyXG5cclxuXHRcdCRzY29wZS4kd2F0Y2goZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRyZXR1cm4gY3RybC50ZXh0O1xyXG5cdFx0fSwgZnVuY3Rpb24gd2F0Y2hUZXh0KHYsIG9sZCkge1xyXG5cdFx0XHRpZiAodiA9PT0gb2xkIHx8IHYgPT09IG51bGwgfHwgdHJhbnNpZW50KSB7XHJcblx0XHRcdFx0dHJhbnNpZW50ID0gZmFsc2U7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblx0XHRcdGN0cmwubmdNb2RlbC4kc2V0Vmlld1ZhbHVlKHYpO1xyXG5cdFx0XHRjdHJsLmxvYWRpbmcgPSB0cnVlO1xyXG5cdFx0XHRjdHJsLmNsZWFyKCk7XHJcblx0XHRcdHZhciBwID0gcHJvbWlzZSA9ICRxLndoZW4oZmlsdGVySWZOb3RQcm9taXNlKGN0cmwub3B0aW9ucy5pbkZuKCRzY29wZSwgeyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcclxuXHRcdFx0XHRxOiB2XHJcblx0XHRcdH0pKSk7XHJcblx0XHRcdHAudGhlbihmdW5jdGlvbiAoZCkge1xyXG5cdFx0XHRcdGlmIChwICE9PSBwcm9taXNlKSByZXR1cm47XHJcblx0XHRcdFx0Y3RybC5pdGVtcyA9IGQ7XHJcblx0XHRcdH0pLmZpbmFsbHkoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdGN0cmwubG9hZGluZyA9IGZhbHNlO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gdWV4QXV0b2NvbXBsZXRlKCRkb2N1bWVudCkge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0cmVzdHJpY3Q6ICdFJyxcclxuXHRcdFx0Y29udHJvbGxlcjogdWV4QXV0b2NvbXBsZXRlQ3RybCxcclxuXHRcdFx0Y29udHJvbGxlckFzOiAnJHVleEF1dG9jb21wbGV0ZUN0cmwnLFxyXG5cdFx0XHR0ZW1wbGF0ZTogZnVuY3Rpb24gKGVsZW1lbnQsIGF0dHIpIHtcclxuXHRcdFx0XHRmdW5jdGlvbiBnZXRJdGVtVGVtcGxhdGUoKSB7XHJcblx0XHRcdFx0XHR2YXIgdGVtcGxhdGVUYWcgPSBlbGVtZW50LmZpbmQoJ3VleC1pdGVtLXRlbXBsYXRlJykuZGV0YWNoKCksXHJcblx0XHRcdFx0XHRcdGh0bWwgPSB0ZW1wbGF0ZVRhZy5sZW5ndGggPyB0ZW1wbGF0ZVRhZy5odG1sKCkgOiBlbGVtZW50Lmh0bWwoKTtcclxuXHRcdFx0XHRcdGlmICghdGVtcGxhdGVUYWcubGVuZ3RoKSBlbGVtZW50LmVtcHR5KCk7XHJcblx0XHRcdFx0XHRyZXR1cm4gaHRtbDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0cmV0dXJuICdcXFxyXG48ZGl2IGNsYXNzPVwidWV4LWF1dG9jb21wbGV0ZVwiPlxcXHJcblx0PGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmctbW9kZWw9XCIkdWV4QXV0b2NvbXBsZXRlQ3RybC50ZXh0XCIgbmcta2V5ZG93bj1cImtleWRvd24oJGV2ZW50KVwiID5cXFxyXG5cdDxkaXYgY2xhc3M9XCJ1ZXgtYXV0b2NvbXBsZXRlLWxpc3RcIiBuZy1pZj1cIiR1ZXhBdXRvY29tcGxldGVDdHJsLml0ZW1zLmxlbmd0aCA+IDBcIj5cXFxyXG5cdFx0PGRpdiBjbGFzcz1cInVleC1hdXRvY29tcGxldGUtaXRlbVwiXFxcclxuXHRcdFx0IG5nLXJlcGVhdD1cIml0ZW0gaW4gJHVleEF1dG9jb21wbGV0ZUN0cmwuaXRlbXNcIlxcXHJcblx0XHRcdCBuZy1jbGljaz1cIiR1ZXhBdXRvY29tcGxldGVDdHJsLnNlbGVjdChpdGVtKVwiXFxcclxuXHRcdFx0IG5nLWNsYXNzPVwieyBhY3RpdmU6ICRpbmRleCA9PSAkdWV4QXV0b2NvbXBsZXRlQ3RybC5hY3RpdmVJbmRleCB9XCJcXFxyXG5cdFx0XHQgbmctbW91c2VvdmVyPVwiJHVleEF1dG9jb21wbGV0ZUN0cmwubW91c2VvdmVyKGl0ZW0sICRpbmRleClcIlxcXHJcblx0XHRcdCB1ZXgtYWxpYXM9XCJpdGVtIHt7OjokdWV4QXV0b2NvbXBsZXRlQ3RybC5rZXlOYW1lfX1cIj4nICtcclxuXHRcdFx0IGdldEl0ZW1UZW1wbGF0ZSgpICsgJ1xcXHJcblx0XHQ8L2Rpdj5cXFxyXG5cdDwvZGl2PlxcXHJcbjwvZGl2Pic7XHJcblx0XHRcdH0sXHJcblx0XHRcdHJlcXVpcmU6IFsndWV4QXV0b2NvbXBsZXRlJywgJ25nTW9kZWwnXSxcclxuXHRcdFx0c2NvcGU6IHRydWUsXHJcblx0XHRcdGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMsIGN0cmxzLCAkdHJhbnNjbHVkZSkge1xyXG5cdFx0XHRcdHZhciBjdHJsID0gY3RybHNbMF0sXHJcblx0XHRcdFx0XHRuZ01vZGVsID0gY3RybHNbMV07XHJcblxyXG5cdFx0XHRcdGN0cmwubmdNb2RlbCA9IG5nTW9kZWw7XHJcblxyXG5cdFx0XHRcdG5nTW9kZWwuJHJlbmRlciA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdGN0cmwudGV4dCA9IG5nTW9kZWwuJHZpZXdWYWx1ZTtcclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHQkc2NvcGUua2V5ZG93biA9IGZ1bmN0aW9uIChlKSB7XHJcblx0XHRcdFx0XHR2YXIga2V5ID0gZS53aGljaCxcclxuXHRcdFx0XHRcdFx0c2hvdWxkUHJldmVudERlZmF1bHQgPSB0cnVlO1xyXG5cclxuXHRcdFx0XHRcdHN3aXRjaCAoa2V5KSB7XHJcblx0XHRcdFx0XHRcdGNhc2UgMTM6IC8vIGVudGVyXHJcblx0XHRcdFx0XHRcdFx0Y3RybC5zZWxlY3QoY3RybC5hY3RpdmVJdGVtKTtcclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0XHRcdGNhc2UgMjc6IC8vIGVzY1xyXG5cdFx0XHRcdFx0XHRcdGN0cmwuY2xlYXIoKTtcclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0XHRcdGNhc2UgMzg6IC8vIHVwXHJcblx0XHRcdFx0XHRcdFx0aWYgKGN0cmwuaXRlbXMubGVuZ3RoID09PSAwKSBicmVhaztcclxuXHRcdFx0XHRcdFx0XHRpZiAoY3RybC5hY3RpdmVJbmRleCA9PT0gLTEpIHtcclxuXHRcdFx0XHRcdFx0XHRcdGN0cmwuc2V0QWN0aXZlKGN0cmwuaXRlbXMubGVuZ3RoIC0gMSk7XHJcblx0XHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0aWYgKGN0cmwuYWN0aXZlSW5kZXggLSAxIDwgMCkgYnJlYWs7XHJcblx0XHRcdFx0XHRcdFx0Y3RybC5zZXRBY3RpdmUoY3RybC5hY3RpdmVJbmRleCAtIDEpO1xyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdFx0Y2FzZSA0MDogLy8gZG93blxyXG5cdFx0XHRcdFx0XHRcdGlmIChjdHJsLml0ZW1zLmxlbmd0aCA9PT0gMCkgYnJlYWs7XHJcblx0XHRcdFx0XHRcdFx0aWYgKGN0cmwuYWN0aXZlSW5kZXggPT09IC0xKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRjdHJsLnNldEFjdGl2ZSgwKTtcclxuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRpZiAoY3RybC5hY3RpdmVJbmRleCArIDEgPj0gY3RybC5pdGVtcy5sZW5ndGgpIGJyZWFrO1xyXG5cdFx0XHRcdFx0XHRcdGN0cmwuc2V0QWN0aXZlKGN0cmwuYWN0aXZlSW5kZXggKyAxKTtcclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0XHRcdFx0c2hvdWxkUHJldmVudERlZmF1bHQgPSBmYWxzZTtcclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRpZiAoc2hvdWxkUHJldmVudERlZmF1bHQpIHtcclxuXHRcdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdCRlbGVtZW50Lm9uKCdrZXlkb3duJywgZnVuY3Rpb24gKGUpIHtcclxuXHRcdFx0XHRcdGlmIChlLndoaWNoID09PSAyNykge1xyXG5cdFx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdFx0XHRcdCRzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0XHRcdGN0cmwuY2xlYXIoKTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdCRkb2N1bWVudC5vbignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xyXG5cdFx0XHRcdFx0aWYgKCEkLmNvbnRhaW5zKCRlbGVtZW50WzBdLCBlLnRhcmdldCkpIHtcclxuXHRcdFx0XHRcdFx0JHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHRcdFx0Y3RybC5jbGVhcigpO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcbn0pKCk7XHJcbiIsIihmdW5jdGlvbiAoKSB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cclxuXHRhbmd1bGFyXHJcblx0XHQubW9kdWxlKCdtci51ZXgnKVxyXG5cdFx0LnByb3ZpZGVyKCd1ZXhJY29ucycsIHVleEljb25zUHJvdmlkZXIpXHJcblx0XHQuZGlyZWN0aXZlKCd1ZXhJY29uJywgdWV4SWNvbik7XHJcblxyXG5cdGZ1bmN0aW9uIHVleEljb25zUHJvdmlkZXIoKSB7XHJcblx0XHR2YXIgaWNvbnMgPSBbe1xyXG5cdFx0XHRpZDogJ2FkZCxwbHVzJyxcclxuXHRcdFx0c3ZnOiAnPHBhdGggZD1cIk0xOTIgMjI0di0xMjhoLTY0djEyOGgtMTI4djY0aDEyOHYxMjhoNjR2LTEyOGgxMjh2LTY0aC0xMjh6XCIvPicsXHJcblx0XHRcdHZpZXdCb3g6ICcwIDAgMzIwIDUxMidcclxuXHRcdH0sIHtcclxuXHRcdFx0aWQ6ICdjbG9zZScsXHJcblx0XHRcdHN2ZzogJzxwYXRoIGQ9XCJNNy40OCA4bDMuNzUgMy43NS0xLjQ4IDEuNDhMNiA5LjQ4bC0zLjc1IDMuNzUtMS40OC0xLjQ4TDQuNTIgOCAuNzcgNC4yNWwxLjQ4LTEuNDhMNiA2LjUybDMuNzUtMy43NSAxLjQ4IDEuNDh6XCIvPicsXHJcblx0XHRcdHZpZXdCb3g6ICcwIDAgMTIgMTYnXHJcblx0XHR9LCB7XHJcblx0XHRcdGlkOiAnYXJyb3ctdG9wJyxcclxuXHRcdFx0c3ZnOiAnPHBhdGggZD1cIk01IDNMMCA5aDN2NGg0VjloM3pcIi8+JyxcclxuXHRcdFx0dmlld0JveDogJzAgMCAxMCAxNidcclxuXHRcdH0sIHtcclxuXHRcdFx0aWQ6ICdhcnJvdy1yaWdodCcsXHJcblx0XHRcdHN2ZzogJzxwYXRoIGQ9XCJNMTAgOEw0IDN2M0gwdjRoNHYzelwiLz4nLFxyXG5cdFx0XHR2aWV3Qm94OiAnMCAwIDEwIDE2J1xyXG5cdFx0fSwge1xyXG5cdFx0XHRpZDogJ2Fycm93LWJvdHRvbScsXHJcblx0XHRcdHN2ZzogJzxwYXRoIGQ9XCJNNyA3VjNIM3Y0SDBsNSA2IDUtNnpcIi8+JyxcclxuXHRcdFx0dmlld0JveDogJzAgMCAxMCAxNidcclxuXHRcdH0sIHtcclxuXHRcdFx0aWQ6ICdhcnJvdy1sZWZ0JyxcclxuXHRcdFx0c3ZnOiAnPHBhdGggZD1cIk02IDNMMCA4bDYgNXYtM2g0VjZINnpcIi8+JyxcclxuXHRcdFx0dmlld0JveDogJzAgMCAxMCAxNidcclxuXHRcdH0sIHtcclxuXHRcdFx0aWQ6ICdjaGV2cm9uLXRvcCcsXHJcblx0XHRcdHN2ZzogJzxwYXRoIGQ9XCJNMTYwIDEyOGwtMTYwIDE2MCA2NCA2NCA5Ni05NiA5NiA5NiA2NC02NC0xNjAtMTYwelwiLz4nLFxyXG5cdFx0XHR2aWV3Qm94OiAnMCAwIDMyMCA1MTInXHJcblx0XHR9LCB7XHJcblx0XHRcdGlkOiAnY2hldnJvbi1yaWdodCcsXHJcblx0XHRcdHN2ZzogJzxwYXRoIGQ9XCJNNjQgOTZsLTY0IDY0IDk2IDk2LTk2IDk2IDY0IDY0IDE2MC0xNjAtMTYwLTE2MHpcIi8+JyxcclxuXHRcdFx0dmlld0JveDogJzAgMCAyMjQgNTEyJ1xyXG5cdFx0fSwge1xyXG5cdFx0XHRpZDogJ2NoZXZyb24tYm90dG9tJyxcclxuXHRcdFx0c3ZnOiAnPHBhdGggZD1cIk0yNTYgMTYwbC05NiA5Ni05Ni05Ni02NCA2NCAxNjAgMTYwIDE2MC0xNjAtNjQtNjR6XCIvPicsXHJcblx0XHRcdHZpZXdCb3g6ICcwIDAgMzIwIDUxMidcclxuXHRcdH0sIHtcclxuXHRcdFx0aWQ6ICdjaGV2cm9uLWxlZnQnLFxyXG5cdFx0XHRzdmc6ICc8cGF0aCBkPVwiTTIyNCAxNjBsLTY0LTY0LTE2MCAxNjAgMTYwIDE2MCA2NC02NC05Ni05NiA5Ni05NnpcIi8+JyxcclxuXHRcdFx0dmlld0JveDogJzAgMCAyMjQgNTEyJ1xyXG5cdFx0fSwge1xyXG5cdFx0XHRpZDogJ2RvbmUsY2hlY2snLFxyXG5cdFx0XHRzdmc6ICc8cGF0aCBkPVwiTTMyMCA5NmwtMTkyIDE5Mi02NC02NC02NCA2NCAxMjggMTI4IDI1Ni0yNTYtNjQtNjR6XCIvPicsXHJcblx0XHRcdHZpZXdCb3g6ICcwIDAgMzg0IDUxMidcclxuXHRcdH0sIHtcclxuXHRcdFx0aWQ6ICdlZGl0LHBlbmNpbCcsXHJcblx0XHRcdHN2ZzogJzxwYXRoIGQ9XCJNMzUyIDMybC02NCA2NCA5NiA5NiA2NC02NC05Ni05NnpNMCAzODRsMC4zNDQgOTYuMjgxIDk1LjY1Ni0wLjI4MSAyNTYtMjU2LTk2LTk2LTI1NiAyNTZ6TTk2IDQ0OGgtNjR2LTY0aDMydjMyaDMydjMyelwiLz4nLFxyXG5cdFx0XHR2aWV3Qm94OiAnMCAwIDQ0OCA1MTInXHJcblx0XHR9LCB7XHJcblx0XHRcdGlkOiAndHJhc2gnLFxyXG5cdFx0XHRzdmc6ICc8cGF0aCBkPVwiTTExIDJIOWMwLS41NS0uNDUtMS0xLTFINWMtLjU1IDAtMSAuNDUtMSAxSDJjLS41NSAwLTEgLjQ1LTEgMXYxYzAgLjU1LjQ1IDEgMSAxdjljMCAuNTUuNDUgMSAxIDFoN2MuNTUgMCAxLS40NSAxLTFWNWMuNTUgMCAxLS40NSAxLTFWM2MwLS41NS0uNDUtMS0xLTF6bS0xIDEySDNWNWgxdjhoMVY1aDF2OGgxVjVoMXY4aDFWNWgxdjl6bTEtMTBIMlYzaDl2MXpcIi8+JyxcclxuXHRcdFx0dmlld0JveDogJzAgMCAxMiAxNidcclxuXHRcdH0sIHtcclxuXHRcdFx0aWQ6ICdtZW51JyxcclxuXHRcdFx0c3ZnOiAnPHBhdGggZD1cIk04IDR2MUgwVjRoOHpNMCA4aDhWN0gwdjF6bTAgM2g4di0xSDB2MXpcIi8+JyxcclxuXHRcdFx0dmlld0JveDogJzAgMCA4IDE2J1xyXG5cdFx0fSwge1xyXG5cdFx0XHRpZDogJ2NvbW1lbnQnLFxyXG5cdFx0XHRzdmc6ICc8cGF0aCBkPVwiTTE0IDFIMmMtLjU1IDAtMSAuNDUtMSAxdjhjMCAuNTUuNDUgMSAxIDFoMnYzLjVMNy41IDExSDE0Yy41NSAwIDEtLjQ1IDEtMVYyYzAtLjU1LS40NS0xLTEtMXptMCA5SDdsLTIgMnYtMkgyVjJoMTJ2OHpcIi8+JyxcclxuXHRcdFx0dmlld0JveDogJzAgMCAxNiAxNidcclxuXHRcdH0sIHtcclxuXHRcdFx0aWQ6ICdmaWxlJyxcclxuXHRcdFx0c3ZnOiAnPHBhdGggZD1cIk02IDVIMlY0aDR2MXpNMiA4aDdWN0gydjF6bTAgMmg3VjlIMnYxem0wIDJoN3YtMUgydjF6bTEwLTcuNVYxNGMwIC41NS0uNDUgMS0xIDFIMWMtLjU1IDAtMS0uNDUtMS0xVjJjMC0uNTUuNDUtMSAxLTFoNy41TDEyIDQuNXpNMTEgNUw4IDJIMXYxMmgxMFY1elwiLz4nLFxyXG5cdFx0XHR2aWV3Qm94OiAnMCAwIDEyIDE2J1xyXG5cdFx0fSwge1xyXG5cdFx0XHRpZDogJ2NvZyxnZWFyJyxcclxuXHRcdFx0c3ZnOiAnPHBhdGggZD1cIk0xNCA4Ljc3di0xLjZsLTEuOTQtLjY0LS40NS0xLjA5Ljg4LTEuODQtMS4xMy0xLjEzLTEuODEuOTEtMS4wOS0uNDUtLjY5LTEuOTJoLTEuNmwtLjYzIDEuOTQtMS4xMS40NS0xLjg0LS44OC0xLjEzIDEuMTMuOTEgMS44MS0uNDUgMS4wOUwwIDcuMjN2MS41OWwxLjk0LjY0LjQ1IDEuMDktLjg4IDEuODQgMS4xMyAxLjEzIDEuODEtLjkxIDEuMDkuNDUuNjkgMS45MmgxLjU5bC42My0xLjk0IDEuMTEtLjQ1IDEuODQuODggMS4xMy0xLjEzLS45Mi0xLjgxLjQ3LTEuMDlMMTQgOC43NXYuMDJ6TTcgMTFjLTEuNjYgMC0zLTEuMzQtMy0zczEuMzQtMyAzLTMgMyAxLjM0IDMgMy0xLjM0IDMtMyAzelwiLz4nLFxyXG5cdFx0XHR2aWV3Qm94OiAnMCAwIDE0IDE2J1xyXG5cdFx0fSwge1xyXG5cdFx0XHRpZDogJ2xpbmsnLFxyXG5cdFx0XHRzdmc6ICc8cGF0aCBkPVwiTTQgOWgxdjFINGMtMS41IDAtMy0xLjY5LTMtMy41UzIuNTUgMyA0IDNoNGMxLjQ1IDAgMyAxLjY5IDMgMy41IDAgMS40MS0uOTEgMi43Mi0yIDMuMjVWOC41OWMuNTgtLjQ1IDEtMS4yNyAxLTIuMDlDMTAgNS4yMiA4Ljk4IDQgOCA0SDRjLS45OCAwLTIgMS4yMi0yIDIuNVMzIDkgNCA5em05LTNoLTF2MWgxYzEgMCAyIDEuMjIgMiAyLjVTMTMuOTggMTIgMTMgMTJIOWMtLjk4IDAtMi0xLjIyLTItMi41IDAtLjgzLjQyLTEuNjQgMS0yLjA5VjYuMjVjLTEuMDkuNTMtMiAxLjg0LTIgMy4yNUM2IDExLjMxIDcuNTUgMTMgOSAxM2g0YzEuNDUgMCAzLTEuNjkgMy0zLjVTMTQuNSA2IDEzIDZ6XCIvPicsXHJcblx0XHRcdHZpZXdCb3g6ICcwIDAgMTYgMTYnXHJcblx0XHR9LCB7XHJcblx0XHRcdGlkOiAnbGluay1leHRlcm5hbCcsXHJcblx0XHRcdHN2ZzogJzxwYXRoIGQ9XCJNMTEgMTBoMXYzYzAgLjU1LS40NSAxLTEgMUgxYy0uNTUgMC0xLS40NS0xLTFWM2MwLS41NS40NS0xIDEtMWgzdjFIMXYxMGgxMHYtM3pNNiAybDIuMjUgMi4yNUw1IDcuNSA2LjUgOWwzLjI1LTMuMjVMMTIgOFYySDZ6XCIvPicsXHJcblx0XHRcdHZpZXdCb3g6ICcwIDAgMTIgMTYnXHJcblx0XHR9LCB7XHJcblx0XHRcdGlkOiAnbWFpbCcsXHJcblx0XHRcdHN2ZzogJzxwYXRoIGQ9XCJNMCA0djhjMCAuNTUuNDUgMSAxIDFoMTJjLjU1IDAgMS0uNDUgMS0xVjRjMC0uNTUtLjQ1LTEtMS0xSDFjLS41NSAwLTEgLjQ1LTEgMXptMTMgMEw3IDkgMSA0aDEyek0xIDUuNWw0IDMtNCAzdi02ek0yIDEybDMuNS0zTDcgMTAuNSA4LjUgOWwzLjUgM0gyem0xMS0uNWwtNC0zIDQtM3Y2elwiLz4nLFxyXG5cdFx0XHR2aWV3Qm94OiAnMCAwIDE0IDE2J1xyXG5cdFx0fSwge1xyXG5cdFx0XHRpZDogJ3NlYXJjaCcsXHJcblx0XHRcdHN2ZzogJzxwYXRoIGQ9XCJNMTUuNyAxMy4zbC0zLjgxLTMuODNBNS45MyA1LjkzIDAgMCAwIDEzIDZjMC0zLjMxLTIuNjktNi02LTZTMSAyLjY5IDEgNnMyLjY5IDYgNiA2YzEuMyAwIDIuNDgtLjQxIDMuNDctMS4xMWwzLjgzIDMuODFjLjE5LjIuNDUuMy43LjMuMjUgMCAuNTItLjA5LjctLjNhLjk5Ni45OTYgMCAwIDAgMC0xLjQxdi4wMXpNNyAxMC43Yy0yLjU5IDAtNC43LTIuMTEtNC43LTQuNyAwLTIuNTkgMi4xMS00LjcgNC43LTQuNyAyLjU5IDAgNC43IDIuMTEgNC43IDQuNyAwIDIuNTktMi4xMSA0LjctNC43IDQuN3pcIi8+JyxcclxuXHRcdFx0dmlld0JveDogJzAgMCAxNiAxNidcclxuXHRcdH0sIHtcclxuXHRcdFx0aWQ6ICd6YXAnLFxyXG5cdFx0XHRzdmc6ICc8cGF0aCBkPVwiTTEwIDdINmwzLTctOSA5aDRsLTMgN3pcIi8+JyxcclxuXHRcdFx0dmlld0JveDogJzAgMCAxMCAxNidcclxuXHRcdH1dO1xyXG5cclxuXHRcdHRoaXMuYWRkID0gaWNvbiA9PiB7XHJcblx0XHRcdGljb25zLnVuc2hpZnQoaWNvbik7XHJcblx0XHRcdHJldHVybiB0aGlzO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLiRnZXQgPSAoKSA9PiBpY29ucztcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHVleEljb24odWV4SWNvbnMpIHtcclxuXHRcdHZhciBpY29ucyA9IHVleEljb25zO1xyXG5cclxuXHRcdGZ1bmN0aW9uIGlkRXhpc3RzKGlkcywgaWQpIHtcclxuXHRcdFx0dmFyIGFsbCA9IGlkcy5zcGxpdCgnLCcpO1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGFsbC5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdGlmIChhbGxbaV0udHJpbSgpID09PSBpZClcclxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBmaW5kSWNvbkJ5SWQoaWQpIHtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBpY29ucy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdHZhciBpY29uID0gaWNvbnNbaV07XHJcblxyXG5cdFx0XHRcdGlmIChpZEV4aXN0cyhpY29uLmlkLCBpZCkpIHtcclxuXHRcdFx0XHRcdHJldHVybiBpY29uO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ3VleEljb246IFwiJyArIGlkICsgJ1wiIGhhcyBub3QgYmVlbiBmb3VuZC4nKTtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiB3cmFwKGNvbnRlbnQsIHZpZXdCb3gpIHtcclxuXHRcdFx0dmlld0JveCA9IHZpZXdCb3ggfHwgJzAgMCA1MTIgNTEyJztcclxuXHRcdFx0cmV0dXJuICc8c3ZnIHZlcnNpb249XCIxLjFcIiB4PVwiMHB4XCIgeT1cIjBweFwiIHZpZXdCb3g9XCInICsgdmlld0JveCArICdcIj4nICsgY29udGVudCArICc8L3N2Zz4nO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHJlc3RyaWN0OiAnRUEnLFxyXG5cdFx0XHRsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzKSB7XHJcblx0XHRcdFx0dmFyIGlkLCBpY29uO1xyXG5cdFx0XHRcdGlmICgkYXR0cnMudWV4SWNvbikge1xyXG5cdFx0XHRcdFx0aWQgPSAkYXR0cnMudWV4SWNvbjtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0aWQgPSAkYXR0cnMuaWNvbjtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGljb24gPSBmaW5kSWNvbkJ5SWQoaWQpO1xyXG5cdFx0XHRcdGlmICghaWNvbi5zdmcpIHtcclxuXHRcdFx0XHRcdGljb24gPSBmaW5kSWNvbkJ5SWQoaWNvbi5yZWYpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0dmFyIGNvbnRlbnQgPSB3cmFwKGljb24uc3ZnLCBpY29uLnZpZXdCb3ggfHwgaWNvbi52aWV3Ym94KTtcclxuXHRcdFx0XHQkZWxlbWVudC5lbXB0eSgpO1xyXG5cdFx0XHRcdCRlbGVtZW50LmFwcGVuZChjb250ZW50KTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcbn0pKCk7XHJcbiIsIihmdW5jdGlvbiAoKSB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cclxuXHRhbmd1bGFyXHJcblx0XHQubW9kdWxlKCdtci51ZXgnKVxyXG5cdFx0LmRpcmVjdGl2ZSgndWV4QWxpYXMnLCB1ZXhBbGlhcyk7XHJcblxyXG5cdGZ1bmN0aW9uIHVleEFsaWFzKCkge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0cmVzdHJpY3Q6ICdBJyxcclxuXHRcdFx0bGluazogZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQsICRhdHRycykge1xyXG5cdFx0XHRcdHZhciBleHByID0gJGF0dHJzLnVleEFsaWFzLFxyXG5cdFx0XHRcdFx0cGFydHMgPSBleHByLnNwbGl0KCcgJyksXHJcblx0XHRcdFx0XHRzb3VyY2UgPSBwYXJ0c1swXSxcclxuXHRcdFx0XHRcdGRlc3QgPSBwYXJ0c1sxXTtcclxuXHJcblx0XHRcdFx0JHNjb3BlLiR3YXRjaCgoKSA9PiAkc2NvcGUuJGV2YWwoc291cmNlKSwgKG4sIG8pID0+IHtcclxuXHRcdFx0XHRcdCRzY29wZVtkZXN0XSA9IG47XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG59KSgpO1xyXG4iLCIoZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0YW5ndWxhclxyXG5cdFx0Lm1vZHVsZSgnbXIudWV4JylcclxuXHRcdC5kaXJlY3RpdmUoJ3VleEZvY3VzJywgdWV4Rm9jdXMpO1xyXG5cclxuXHRmdW5jdGlvbiB1ZXhGb2N1cygkdGltZW91dCkge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0cmVzdHJpY3Q6ICdBJyxcclxuXHRcdFx0bGluazogZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQsICRhdHRycykge1xyXG5cdFx0XHRcdCRzY29wZS4kb24oJ3VleC5mb2N1cycsICgpID0+IHtcclxuXHRcdFx0XHRcdCR0aW1lb3V0KCRlbGVtZW50LmZvY3VzKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcbn0pKCk7XHJcbiIsIihmdW5jdGlvbiAoKSB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cclxuXHRhbmd1bGFyXHJcblx0XHQubW9kdWxlKCdtci51ZXgnKVxyXG5cdFx0LmZhY3RvcnkoJ3VleFBvc2l0aW9uZXInLCBwb3NpdGlvbmVyKTtcclxuXHJcblx0ZnVuY3Rpb24gcG9zaXRpb25lcigpIHtcclxuXHRcdHZhciAkd2luZG93LFxyXG5cdFx0XHQkYm9keTtcclxuXHJcblx0XHRmdW5jdGlvbiBlbnN1cmUoKSB7XHJcblx0XHRcdGlmICgkd2luZG93KSByZXR1cm47XHJcblxyXG5cdFx0XHQkd2luZG93ID0gJCh3aW5kb3cpO1xyXG5cdFx0XHQkYm9keSA9ICQoZG9jdW1lbnQuYm9keSk7XHJcblx0XHR9XHJcblxyXG5cdFx0ZW5zdXJlKCk7XHJcblxyXG5cdFx0ZnVuY3Rpb24gcGFyc2VQbGFjZW1lbnQocGxhY2VtZW50KSB7XHJcblx0XHRcdHZhciByZXQgPSB7fSxcclxuXHRcdFx0XHRhcnIgPSBwbGFjZW1lbnQuc3BsaXQoJyAnKTtcclxuXHRcdFx0cmV0LnBsYWNlID0gYXJyWzBdO1xyXG5cdFx0XHRyZXQuYWxpZ24gPSBhcnJbMV07XHJcblx0XHRcdHJldHVybiByZXQ7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gbWVhc3VyZShlbGVtZW50LCBmbikge1xyXG5cdFx0XHR2YXIgZWwgPSBlbGVtZW50LmNsb25lKGZhbHNlKTtcclxuXHRcdFx0ZWwuY3NzKCd2aXNpYmlsaXR5JywgJ2hpZGRlbicpO1xyXG5cdFx0XHRlbC5jc3MoJ3Bvc2l0aW9uJywgJ2Fic29sdXRlJyk7XHJcblx0XHRcdCRib2R5LmFwcGVuZChlbCk7XHJcblx0XHRcdHZhciByZXN1bHQgPSBmbihlbCk7XHJcblx0XHRcdGVsLnJlbW92ZSgpO1xyXG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGNvbXB1dGVMZWZ0Rm9yVmVydGljYWwodHAsIGVwLCBvZmZzZXQsIGFsaWduKSB7XHJcblx0XHRcdHN3aXRjaCAoYWxpZ24pIHtcclxuXHRcdFx0XHRjYXNlICdzdGFydCc6XHJcblx0XHRcdFx0XHRvZmZzZXQubGVmdCA9IHRwLmxlZnQ7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0Y2FzZSAnY2VudGVyJzpcclxuXHRcdFx0XHRcdG9mZnNldC5sZWZ0ID0gdHAubGVmdCArICh0cC53aWR0aCAvIDIpIC0gKGVwLndpZHRoIC8gMik7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0Y2FzZSAnZW5kJzpcclxuXHRcdFx0XHRcdG9mZnNldC5sZWZ0ID0gdHAubGVmdCArIHRwLndpZHRoIC0gZXAud2lkdGg7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGNvbXB1dGVUb3BGb3JIb3Jpem9udGFsKHRwLCBlcCwgb2Zmc2V0LCBhbGlnbikge1xyXG5cdFx0XHRzd2l0Y2ggKGFsaWduKSB7XHJcblx0XHRcdFx0Y2FzZSAnc3RhcnQnOlxyXG5cdFx0XHRcdFx0b2Zmc2V0LnRvcCA9IHRwLnRvcDtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRjYXNlICdjZW50ZXInOlxyXG5cdFx0XHRcdFx0b2Zmc2V0LnRvcCA9IHRwLnRvcCArICh0cC5oZWlnaHQgLyAyKSAtIChlcC5oZWlnaHQgLyAyKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRjYXNlICdlbmQnOlxyXG5cdFx0XHRcdFx0b2Zmc2V0LnRvcCA9IHRwLnRvcCArIHRwLmhlaWdodCAtIGVwLmhlaWdodDtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gY29tcHV0ZU9mZnNldChjb250ZXh0LCBvcHRpb25zKSB7XHJcblx0XHRcdHZhciBwbGFjZSA9IG9wdGlvbnMucGxhY2UsXHJcblx0XHRcdFx0YWxpZ24gPSBvcHRpb25zLmFsaWduLFxyXG5cdFx0XHRcdG8gPSBvcHRpb25zLm9mZnNldCxcclxuXHRcdFx0XHRlcCA9IGNvbnRleHQuZXAsXHJcblx0XHRcdFx0dHAgPSBjb250ZXh0LnRwO1xyXG5cclxuXHRcdFx0dmFyIG9mZnNldCA9IHtcclxuXHRcdFx0XHR0b3A6IDAsXHJcblx0XHRcdFx0bGVmdDogMFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0c3dpdGNoIChwbGFjZSkge1xyXG5cdFx0XHRcdGNhc2UgJ3RvcCc6XHJcblx0XHRcdFx0XHRvZmZzZXQudG9wID0gdHAudG9wIC0gZXAuaGVpZ2h0IC0gbztcclxuXHRcdFx0XHRcdGNvbXB1dGVMZWZ0Rm9yVmVydGljYWwodHAsIGVwLCBvZmZzZXQsIGFsaWduKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRjYXNlICdyaWdodCc6XHJcblx0XHRcdFx0XHRvZmZzZXQubGVmdCA9IHRwLmxlZnQgKyB0cC53aWR0aCArIG87XHJcblx0XHRcdFx0XHRjb21wdXRlVG9wRm9ySG9yaXpvbnRhbCh0cCwgZXAsIG9mZnNldCwgYWxpZ24pO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdGNhc2UgJ2JvdHRvbSc6XHJcblx0XHRcdFx0XHRvZmZzZXQudG9wID0gdHAudG9wICsgdHAuaGVpZ2h0ICsgbztcclxuXHRcdFx0XHRcdGNvbXB1dGVMZWZ0Rm9yVmVydGljYWwodHAsIGVwLCBvZmZzZXQsIGFsaWduKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRjYXNlICdsZWZ0JzpcclxuXHRcdFx0XHRcdG9mZnNldC5sZWZ0ID0gdHAubGVmdCAtIGVwLndpZHRoIC0gbztcclxuXHRcdFx0XHRcdGNvbXB1dGVUb3BGb3JIb3Jpem9udGFsKHRwLCBlcCwgb2Zmc2V0LCBhbGlnbik7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIG9mZnNldDtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBjb2Fyc2VPZmZzZXQoY29udGV4dCwgb3B0aW9ucykge1xyXG5cdFx0XHR2YXIgb2Zmc2V0ID0gY29udGV4dC5vZmZzZXQsXHJcblx0XHRcdFx0bWFyZ2luID0gb3B0aW9ucy5tYXJnaW4gfHwgMCxcclxuXHRcdFx0XHRzY3JvbGxUb3AgPSAkd2luZG93LnNjcm9sbFRvcCgpLFxyXG5cdFx0XHRcdGdwID0ge1xyXG5cdFx0XHRcdFx0bGVmdDogbWFyZ2luLFxyXG5cdFx0XHRcdFx0dG9wOiBtYXJnaW4sXHJcblx0XHRcdFx0XHR3aWR0aDogJHdpbmRvdy53aWR0aCgpIC0gbWFyZ2luICogMixcclxuXHRcdFx0XHRcdGhlaWdodDogJHdpbmRvdy5oZWlnaHQoKSAtIG1hcmdpbiAqIDJcclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gQ29hcnNlIGxlZnRcclxuXHRcdFx0aWYgKG9mZnNldC5sZWZ0ICsgY29udGV4dC5lcC53aWR0aCA+IGdwLndpZHRoKSB7XHJcblx0XHRcdFx0b2Zmc2V0LmxlZnQgLT0gb2Zmc2V0LmxlZnQgKyBjb250ZXh0LmVwLndpZHRoIC0gZ3Aud2lkdGg7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENvYXJzZSB0b3BcclxuXHRcdFx0aWYgKG9mZnNldC50b3AgKyBjb250ZXh0LmVwLmhlaWdodCA+IGdwLmhlaWdodCArIHNjcm9sbFRvcCkge1xyXG5cdFx0XHRcdG9mZnNldC50b3AgLT0gb2Zmc2V0LnRvcCArIGNvbnRleHQuZXAuaGVpZ2h0IC0gZ3AuaGVpZ2h0IC0gc2Nyb2xsVG9wO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBDb2Fyc2UgbmVnYXRpdmVzXHJcblx0XHRcdGlmIChvZmZzZXQubGVmdCA8IGdwLmxlZnQpIG9mZnNldC5sZWZ0ID0gZ3AubGVmdDtcclxuXHRcdFx0aWYgKG9mZnNldC50b3AgPCBncC50b3AgKyBzY3JvbGxUb3ApIG9mZnNldC50b3AgPSBncC50b3AgKyBzY3JvbGxUb3A7XHJcblxyXG5cdFx0XHQvLyBTZXQgbWF4V2lkdGhcclxuXHRcdFx0b2Zmc2V0Lm1heFdpZHRoID0gZ3Aud2lkdGg7XHJcblxyXG5cdFx0XHQvLyBTZXQgbWF4SGVpZ2h0XHJcblx0XHRcdG9mZnNldC5tYXhIZWlnaHQgPSBncC5oZWlnaHQ7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gbWVhc3VyaW5nKG9wdGlvbnMsIGZuKSB7XHJcblx0XHRcdGlmIChvcHRpb25zLnN0dWIgPT09IHRydWUpIHtcclxuXHRcdFx0XHRtZWFzdXJlKG9wdGlvbnMuZWxlbWVudCwgZm4pO1xyXG5cdFx0XHR9IGVsc2UgaWYgKG9wdGlvbnMuc3R1Yikge1xyXG5cdFx0XHRcdGZuKG9wdGlvbnMuc3R1Yik7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Zm4ob3B0aW9ucy5lbGVtZW50KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIHRhcmdldDogdGhlIHRhcmdldCBlbGVtZW50XHJcblx0XHQvLyBlbGVtZW50OiB0aGUgZWxlbWVudCB0byBiZSBwb3NpdGlvbmVkXHJcblx0XHQvLyBwbGFjZW1lbnQ6IFt0b3AsIHJpZ2h0LCBib3R0b20sIGxlZnRdIFtzdGFydCwgY2VudGVyLCBlbmRdXHJcblx0XHQvLyBtYXJnaW46IHRoZSBtYXJnaW4gZnJvbSB0aGUgb3V0ZXIgd2luZG93XHJcblx0XHQvLyBvZmZzZXQ6IHRoZSBvZmZzZXQgZnJvbSB0aGUgdGFyZ2V0XHJcblx0XHQvLyBzdHViOiB0cnVlIHRvIHN0dWIgdGhlIGVsZW1lbnQgYmVmb3JlIG1lYXN1cmluZywgb3IgdGhlIHN0dWIgZWxlbWVudCBpdHNlbGZcclxuXHRcdC8vXHJcblx0XHR2YXIgZnVuYyA9IG9wdGlvbnMgPT4ge1xyXG5cdFx0XHRvcHRpb25zLm1hcmdpbiA9IG9wdGlvbnMubWFyZ2luIHx8IDU7XHJcblx0XHRcdG9wdGlvbnMub2Zmc2V0ID0gb3B0aW9ucy5vZmZzZXQgfHwgNTtcclxuXHRcdFx0aWYgKG9wdGlvbnMucGxhY2VtZW50KSB7XHJcblx0XHRcdFx0b3B0aW9ucy5wbGFjZW1lbnRPYmplY3QgPSBwYXJzZVBsYWNlbWVudChvcHRpb25zLnBsYWNlbWVudCk7XHJcblx0XHRcdFx0b3B0aW9ucy5wbGFjZSA9IG9wdGlvbnMucGxhY2VtZW50T2JqZWN0LnBsYWNlO1xyXG5cdFx0XHRcdG9wdGlvbnMuYWxpZ24gPSBvcHRpb25zLnBsYWNlbWVudE9iamVjdC5hbGlnbjtcclxuXHRcdFx0fVxyXG5cdFx0XHRvcHRpb25zLnBsYWNlID0gb3B0aW9ucy5wbGFjZSB8fCAnYm90dG9tJztcclxuXHRcdFx0b3B0aW9ucy5hbGlnbiA9IG9wdGlvbnMuYWxpZ24gfHwgJ3N0YXJ0JztcclxuXHJcblx0XHRcdHZhciB0YXJnZXQgPSBvcHRpb25zLnRhcmdldCxcclxuXHRcdFx0XHRlbGVtZW50ID0gb3B0aW9ucy5lbGVtZW50LFxyXG5cdFx0XHRcdHRhcmdldE9mZnNldCA9IHRhcmdldC5vZmZzZXQoKTtcclxuXHJcblx0XHRcdHZhciB0cCA9IHtcclxuXHRcdFx0XHR0b3A6IHRhcmdldE9mZnNldC50b3AsXHJcblx0XHRcdFx0bGVmdDogdGFyZ2V0T2Zmc2V0LmxlZnQsXHJcblx0XHRcdFx0d2lkdGg6IHRhcmdldC5vdXRlcldpZHRoKCksXHJcblx0XHRcdFx0aGVpZ2h0OiB0YXJnZXQub3V0ZXJIZWlnaHQoKVxyXG5cdFx0XHR9O1xyXG5cdFx0XHR2YXIgZXAgPSB7fTtcclxuXHRcdFx0bWVhc3VyaW5nKG9wdGlvbnMsIGVsID0+IHtcclxuXHRcdFx0XHRlcC53aWR0aCA9IGVsLm91dGVyV2lkdGgoKTtcclxuXHRcdFx0XHRlcC5oZWlnaHQgPSBlbC5vdXRlckhlaWdodCgpO1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0dmFyIGNvbnRleHQgPSB7XHJcblx0XHRcdFx0dGFyZ2V0OiB0YXJnZXQsXHJcblx0XHRcdFx0ZWxlbWVudDogZWxlbWVudCxcclxuXHRcdFx0XHR0cDogdHAsXHJcblx0XHRcdFx0ZXA6IGVwXHJcblx0XHRcdH07XHJcblx0XHRcdHZhciBvZmZzZXQgPSBjb21wdXRlT2Zmc2V0KGNvbnRleHQsIG9wdGlvbnMpO1xyXG5cdFx0XHRjb250ZXh0Lm9mZnNldCA9IG9mZnNldDtcclxuXHRcdFx0Y29hcnNlT2Zmc2V0KGNvbnRleHQsIG9wdGlvbnMpO1xyXG5cdFx0XHRjb250ZXh0LmVwLmxlZnQgPSBvZmZzZXQubGVmdDtcclxuXHRcdFx0Y29udGV4dC5lcC50b3AgPSBvZmZzZXQudG9wO1xyXG5cclxuXHRcdFx0cmV0dXJuIGNvbnRleHQ7XHJcblx0XHR9O1xyXG5cclxuXHRcdGZ1bmMuYXBwbHkgPSAoY29udGV4dCkgPT4ge1xyXG5cdFx0XHR2YXIgZWxlbWVudCA9IGNvbnRleHQuZWxlbWVudCxcclxuXHRcdFx0XHRvZmZzZXQgPSBjb250ZXh0Lm9mZnNldDtcclxuXHJcblx0XHRcdGVsZW1lbnQuY3NzKCd0b3AnLCBvZmZzZXQudG9wKTtcclxuXHRcdFx0ZWxlbWVudC5jc3MoJ2xlZnQnLCBvZmZzZXQubGVmdCk7XHJcblx0XHRcdGlmIChvZmZzZXQubWF4V2lkdGgpIHtcclxuXHRcdFx0XHRlbGVtZW50LmNzcygnbWF4LXdpZHRoJywgb2Zmc2V0Lm1heFdpZHRoKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAob2Zmc2V0Lm1heEhlaWdodCkge1xyXG5cdFx0XHRcdGVsZW1lbnQuY3NzKCdtYXgtaGVpZ2h0Jywgb2Zmc2V0Lm1heEhlaWdodCk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0ZnVuYy5wYXJzZVBsYWNlbWVudCA9IHBhcnNlUGxhY2VtZW50O1xyXG5cclxuXHRcdHJldHVybiBmdW5jO1xyXG5cdH1cclxufSkoKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdGFuZ3VsYXJcclxuXHRcdC5tb2R1bGUoJ21yLnVleCcpXHJcblx0XHQuZmFjdG9yeSgndWV4UG9zaXRpb25pbmdUaHJvdHRsZXInLCBwb3NpdGlvbmluZ1Rocm90dGxlcik7XHJcblxyXG5cdGZ1bmN0aW9uIG5vdygpIHtcclxuXHRcdHJldHVybiArbmV3IERhdGUoKTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHJlbW92ZShhcnJheSwgaXRlbSkge1xyXG5cdFx0dmFyIGluZGV4ID0gYXJyYXkuaW5kZXhPZihpdGVtKTtcclxuXHRcdGFycmF5LnNwbGljZShpbmRleCwgMSk7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBwb3NpdGlvbmluZ1Rocm90dGxlcigpIHtcclxuXHRcdHZhciBoYW5kbGVycyA9IFtdLFxyXG5cdFx0XHQkd2luZG93ID0gJCh3aW5kb3cpLFxyXG5cdFx0XHRsYXN0Q2FsbCA9IG51bGwsXHJcblx0XHRcdGxhc3REdXJhdGlvbiA9IG51bGwsXHJcblx0XHRcdHBlbmRpbmdUaW1lb3V0ID0gbnVsbDtcclxuXHJcblx0XHR2YXIgZ2V0Q29udGV4dCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRjbGllbnQ6IHtcclxuXHRcdFx0XHRcdGhlaWdodDogJHdpbmRvdy5oZWlnaHQoKSxcclxuXHRcdFx0XHRcdHdpZHRoOiAkd2luZG93LndpZHRoKCksXHJcblx0XHRcdFx0XHR0b3A6ICR3aW5kb3cuc2Nyb2xsVG9wKClcclxuXHRcdFx0XHR9XHJcblx0XHRcdH07XHJcblx0XHR9O1xyXG5cclxuXHRcdGZ1bmN0aW9uIGhhbmRsZXJTYXRpc2ZpZXMoZXZlbnRzLCBlKSB7XHJcblx0XHRcdGlmICghZXZlbnRzKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH1cclxuXHRcdFx0dmFyIHR5cGUgPSBlLnR5cGUsXHJcblx0XHRcdFx0Zm91bmQgPSBmYWxzZTtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBldmVudHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRpZiAoZXZlbnRzW2ldID09PSB0eXBlKSBmb3VuZCA9IHRydWU7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIGZvdW5kO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBwcm9jZXNzSGFuZGxlcnMgPSBlID0+IHtcclxuXHRcdFx0dmFyIGNvbnRleHQgPSBnZXRDb250ZXh0KCk7XHJcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgaGFuZGxlcnMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHR2YXIgY29tcG9zaXRlID0gaGFuZGxlcnNbaV0sXHJcblx0XHRcdFx0XHRoYW5kbGVyID0gY29tcG9zaXRlLmhhbmRsZXIsXHJcblx0XHRcdFx0XHRldmVudHMgPSBjb21wb3NpdGUuZXZlbnRzO1xyXG5cdFx0XHRcdGlmIChlICYmICFoYW5kbGVyU2F0aXNmaWVzKGV2ZW50cywgZSkpICB7XHJcblx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0aGFuZGxlcihjb250ZXh0KTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHR2YXIgdGljayA9IGZ1bmN0aW9uIChlKSB7XHJcblx0XHRcdGlmICh0eXBlb2YgbGFzdER1cmF0aW9uICE9PSAndW5kZWZpbmVkJyAmJiBsYXN0RHVyYXRpb24gPiAxNikge1xyXG5cdFx0XHRcdGxhc3REdXJhdGlvbiA9IE1hdGgubWluKGxhc3REdXJhdGlvbiAtIDE2LCAyNTApO1xyXG5cclxuXHRcdFx0XHRwZW5kaW5nVGltZW91dCA9IHNldFRpbWVvdXQodGljaywgMjUwKTtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmICh0eXBlb2YgbGFzdENhbGwgIT09ICd1bmRlZmluZWQnICYmIG5vdygpIC0gbGFzdENhbGwgPCAxMCkge1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKHR5cGVvZiBwZW5kaW5nVGltZW91dCAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRcdFx0XHRjbGVhclRpbWVvdXQocGVuZGluZ1RpbWVvdXQpO1xyXG5cdFx0XHRcdHBlbmRpbmdUaW1lb3V0ID0gbnVsbDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0bGFzdENhbGwgPSBub3coKTtcclxuXHRcdFx0cHJvY2Vzc0hhbmRsZXJzKGUpO1xyXG5cdFx0XHRsYXN0RHVyYXRpb24gPSBub3coKSAtIGxhc3RDYWxsO1xyXG5cdFx0fTtcclxuXHJcblx0XHQkKCgpID0+IHtcclxuXHRcdFx0cHJvY2Vzc0hhbmRsZXJzKCk7XHJcblx0XHRcdFsncmVzaXplJywgJ3Njcm9sbCcsICd0b3VjaG1vdmUnXS5mb3JFYWNoKGV2ZW50ID0+IHtcclxuXHRcdFx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgdGljayk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0c3Vic2NyaWJlOiAoaGFuZGxlciwgZXZlbnRzKSA9PiB7XHJcblx0XHRcdFx0aWYgKGFuZ3VsYXIuaXNTdHJpbmcoZXZlbnRzKSkge1xyXG5cdFx0XHRcdFx0ZXZlbnRzID0gW2V2ZW50c107XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGhhbmRsZXJzLnB1c2goe2hhbmRsZXI6IGhhbmRsZXIsIGV2ZW50czogZXZlbnRzfSk7XHJcblx0XHRcdFx0cHJvY2Vzc0hhbmRsZXJzKCk7XHJcblx0XHRcdFx0cmV0dXJuICgpID0+IHtcclxuXHRcdFx0XHRcdHJlbW92ZShoYW5kbGVycywgaGFuZGxlcik7XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcbn0pKCk7XHJcbiIsIihmdW5jdGlvbiAoKSB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cclxuXHRhbmd1bGFyXHJcblx0XHQubW9kdWxlKCdtci51ZXgnKVxyXG5cdFx0LmZhY3RvcnkoJ3VleFV0aWwnLCB1dGlsKTtcclxuXHJcblx0ZnVuY3Rpb24gdXRpbCgpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdGNhbWVsVG9EYXNoOiBzdHIgPT4ge1xyXG5cdFx0XHRcdHJldHVybiBzdHIucmVwbGFjZSgvXFxXKy9nLCAnLScpLnJlcGxhY2UoLyhbYS16XFxkXSkoW0EtWl0pL2csICckMS0kMicpO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRkYXNoVG9DYW1lbDogc3RyID0+IHtcclxuXHRcdFx0XHRyZXR1cm4gc3RyLnJlcGxhY2UoL1xcVysoLikvZywgKHgsIGNocikgPT4gY2hyLnRvVXBwZXJDYXNlKCkpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxufSkoKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdGFuZ3VsYXJcclxuXHRcdC5tb2R1bGUoJ21yLnVleCcpXHJcblx0XHQuZmFjdG9yeSgndWV4TW9kYWwnLCBtb2RhbCk7XHJcblxyXG5cdGZ1bmN0aW9uIG1vZGFsKCRyb290U2NvcGUsICRjb21waWxlLCAkY29udHJvbGxlciwgJGFuaW1hdGUsICR0ZW1wbGF0ZVJlcXVlc3QsICRxLCB1ZXhVdGlsKSB7XHJcblx0XHR2YXIgaW5zdGFuY2VzID0gW10sXHJcblx0XHRcdCRib2R5ID0gJChkb2N1bWVudC5ib2R5KSxcclxuXHRcdFx0JGJkID0gYW5ndWxhci5lbGVtZW50KCc8ZGl2IGNsYXNzPVwidWV4LW1vZGFsLWJkXCIgLz4nKTtcclxuXHJcblx0XHQkYm9keS5vbigna2V5ZG93bicsIGUgPT4ge1xyXG5cdFx0XHRpZiAoIWUuaXNEZWZhdWx0UHJldmVudGVkKCkgJiYgZS53aGljaCA9PT0gMjcpIHtcclxuXHRcdFx0XHQkcm9vdFNjb3BlLiRhcHBseSgoKSA9PiB7XHJcblx0XHRcdFx0XHRkaXNtaXNzVG9wTW9kYWwoZSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIG9wdGlvbnM6XHJcblx0XHQvLyAgIHNjb3BlXHJcblx0XHQvLyAgIHRlbXBsYXRlIC0gdGVtcGxhdGVVcmxcclxuXHRcdC8vICAgY29tcG9uZW50XHJcblx0XHQvLyAgIHRpdGxlXHJcblx0XHQvLyAgIGNsYXNzZXNcclxuXHRcdC8vICAgbG9jYWxzXHJcblx0XHQvL1xyXG5cdFx0dmFyIGZ1bmMgPSBvcHRpb25zID0+IHtcclxuXHRcdFx0b3B0aW9ucyA9IGFuZ3VsYXIuaXNTdHJpbmcob3B0aW9ucykgPyB7IGNvbXBvbmVudDogb3B0aW9ucyB9IDogb3B0aW9ucztcclxuXHRcdFx0dmFyIHNjb3BlID0gKG9wdGlvbnMuc2NvcGUgfHwgJHJvb3RTY29wZSkuJG5ldygpLFxyXG5cdFx0XHRcdCRlbGVtZW50ID0gJChnZXRUZW1wbGF0ZU1vZGFsQ29udGFpbmVyKG9wdGlvbnMpKTtcclxuXHJcblx0XHRcdHZhciBkZXN0cm95QW5kQ2xlYW4gPSBpbnN0YW5jZSA9PiB7XHJcblx0XHRcdFx0aW5zdGFuY2Uuc2NvcGUuJGRlc3Ryb3koKTtcclxuXHRcdFx0XHR2YXIgZGVsZWdhdGVzID0gaW5zdGFuY2UuX2RlbGVnYXRlcztcclxuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGRlbGVnYXRlcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdFx0ZGVsZWdhdGVzW2ldKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0dmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKSxcclxuXHRcdFx0XHRpbnN0YW5jZSA9IHtcclxuXHRcdFx0XHRfZGVsZWdhdGVzOiBbXSxcclxuXHRcdFx0XHRzY29wZTogc2NvcGUsXHJcblx0XHRcdFx0ZWxlbWVudDogJGVsZW1lbnQsXHJcblx0XHRcdFx0dGl0bGU6IHYgPT4ge1xyXG5cdFx0XHRcdFx0c2NvcGUuJHRpdGxlID0gdjtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHJlc29sdmU6IHYgPT4ge1xyXG5cdFx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZSh2KTtcclxuXHRcdFx0XHRcdGluc3RhbmNlLmRpc21pc3MoKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHJlamVjdDogcmVhc29uID0+IHtcclxuXHRcdFx0XHRcdGluc3RhbmNlLmRpc21pc3MocmVhc29uKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGRpc21pc3M6IHJlYXNvbiA9PiB7XHJcblx0XHRcdFx0XHR2YXIgaSA9IGluc3RhbmNlcy5pbmRleE9mKGluc3RhbmNlKTtcclxuXHRcdFx0XHRcdGluc3RhbmNlcy5zcGxpY2UoaSwgMSk7XHJcblx0XHRcdFx0XHR2YXIgbGVhdmluZyA9ICRhbmltYXRlLmxlYXZlKCRlbGVtZW50KTtcclxuXHJcblx0XHRcdFx0XHRpZiAoaW5zdGFuY2VzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRcdFx0XHRsZWF2aW5nLnRoZW4oKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdCRhbmltYXRlLmxlYXZlKCRiZCk7XHJcblx0XHRcdFx0XHRcdFx0JGJvZHkucmVtb3ZlQ2xhc3MoJ3VleC1tb2RhbC1hY3RpdmUnKTtcclxuXHRcdFx0XHRcdFx0XHRkZXN0cm95QW5kQ2xlYW4oaW5zdGFuY2UpO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdGluc3RhbmNlc1tpbnN0YW5jZXMubGVuZ3RoIC0gMV0uX2FjdGl2ZSh0cnVlKTtcclxuXHRcdFx0XHRcdFx0ZGVzdHJveUFuZENsZWFuKGluc3RhbmNlKTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRkZWZlcnJlZC5yZWplY3QocmVhc29uKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uRGlzbWlzczogYWN0aW9uID0+IHtcclxuXHRcdFx0XHRcdGluc3RhbmNlLl9kZWxlZ2F0ZXMucHVzaChhY3Rpb24pO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0X2FjdGl2ZTogdmFsdWUgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKHZhbHVlKSBpbnN0YW5jZS5lbGVtZW50LnJlbW92ZUNsYXNzKCdpbmFjdGl2ZScpO1xyXG5cdFx0XHRcdFx0ZWxzZSBpbnN0YW5jZS5lbGVtZW50LmFkZENsYXNzKCdpbmFjdGl2ZScpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHRcdFx0aW5zdGFuY2VzLnB1c2goaW5zdGFuY2UpO1xyXG5cclxuXHRcdFx0dmFyIHJlc29sdmUgPSBhbmd1bGFyLmV4dGVuZChcclxuXHRcdFx0XHR7fSxcclxuXHRcdFx0XHRvcHRpb25zLmxvY2FscyB8fCB7fSxcclxuXHRcdFx0XHR7IG1vZGFsOiBpbnN0YW5jZSB9KTtcclxuXHRcdFx0dmFyIHRlbXBsYXRlUHJvbWlzZSA9IGdldFRlbXBsYXRlUHJvbWlzZShvcHRpb25zLCByZXNvbHZlKTtcclxuXHJcblx0XHRcdHRlbXBsYXRlUHJvbWlzZS50aGVuKHRlbXBsYXRlID0+IHtcclxuXHRcdFx0XHQkZWxlbWVudC5maW5kKCcudWV4LW1vZGFsLWNvbnRlbnQnKS5odG1sKHRlbXBsYXRlKTtcclxuXHJcblx0XHRcdFx0JGNvbXBpbGUoJGVsZW1lbnQpKGFuZ3VsYXIuZXh0ZW5kKHNjb3BlLCB7XHJcblx0XHRcdFx0XHQkdGl0bGU6IG9wdGlvbnMudGl0bGUgfHwgJ01vZGFsJyxcclxuXHRcdFx0XHRcdCRtb2RhbDogaW5zdGFuY2UsXHJcblx0XHRcdFx0XHQkcmVzb2x2ZTogcmVzb2x2ZSxcclxuXHRcdFx0XHRcdF90cnlEaXNtaXNzOiBldmVudCA9PiB7XHJcblx0XHRcdFx0XHRcdGlmICgkKGV2ZW50LnRhcmdldCkuaXMoJy51ZXgtbW9kYWwnKSkge1xyXG5cdFx0XHRcdFx0XHRcdHNjb3BlLiRtb2RhbC5kaXNtaXNzKCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KSk7XHJcblxyXG5cdFx0XHRcdGlmIChpbnN0YW5jZXMubGVuZ3RoICE9PSAxKSB7XHJcblx0XHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGluc3RhbmNlcy5sZW5ndGggLSAxOyBpKyspIHtcclxuXHRcdFx0XHRcdFx0aW5zdGFuY2VzW2ldLl9hY3RpdmUoZmFsc2UpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0JGJvZHkuYWRkQ2xhc3MoJ3VleC1tb2RhbC1hY3RpdmUnKTtcclxuXHRcdFx0XHR2YXIgYmRFbnRlcmluZztcclxuXHRcdFx0XHRpZiAoaW5zdGFuY2VzLmxlbmd0aCA9PT0gMSkge1xyXG5cdFx0XHRcdFx0YmRFbnRlcmluZyA9ICRhbmltYXRlLmVudGVyKCRiZCwgJGJvZHksICRib2R5LmNoaWxkcmVuKCkubGFzdCgpKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0KGJkRW50ZXJpbmcgfHwgJHEud2hlbigpKS50aGVuKCgpID0+IHtcclxuXHRcdFx0XHRcdCRhbmltYXRlLmVudGVyKCRlbGVtZW50LCAkYm9keSwgJGJvZHkuY2hpbGRyZW4oKS5sYXN0KCkpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9LCAoKSA9PiB7XHJcblx0XHRcdFx0ZGVzdHJveUFuZENsZWFuKGluc3RhbmNlKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdF9pbnN0YW5jZTogaW5zdGFuY2UsXHJcblx0XHRcdFx0cHJvbWlzZTogZGVmZXJyZWQucHJvbWlzZSxcclxuXHRcdFx0XHRzY29wZTogaW5zdGFuY2Uuc2NvcGUsXHJcblx0XHRcdFx0ZWxlbWVudDogaW5zdGFuY2UuJGVsZW1lbnQsXHJcblx0XHRcdFx0ZGlzbWlzczogaW5zdGFuY2UuZGlzbWlzc1xyXG5cdFx0XHR9O1xyXG5cdFx0fTtcclxuXHJcblx0XHRmdW5jLmNvbmZpcm0gPSAoKSA9PiB7XHJcblx0XHRcdHZhciBvcHRpb25zID0ge1xyXG5cdFx0XHRcdHRpdGxlOiAnQ29uZmlybScsXHJcblx0XHRcdFx0dGVtcGxhdGU6ICdBcmUgeW91IHN1cmU/JyxcclxuXHRcdFx0XHRkYW5nZXI6IGZhbHNlLFxyXG5cdFx0XHRcdHllc1RleHQ6ICdZZXMnLFxyXG5cdFx0XHRcdG5vVGV4dDogJ0NhbmNlbCcsXHJcblx0XHRcdFx0aW5mbzogZmFsc2VcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHZhciByZXQgPSB7XHJcblx0XHRcdFx0b3BlbjogcGFyZW50U2NvcGUgPT4ge1xyXG5cdFx0XHRcdFx0dmFyIHNjb3BlID0gKHBhcmVudFNjb3BlIHx8ICRyb290U2NvcGUpLiRuZXcoKSxcclxuXHRcdFx0XHRcdFx0aW5zdGFuY2UgPSBmdW5jKHtcclxuXHRcdFx0XHRcdFx0dGl0bGU6IG9wdGlvbnMudGl0bGUsXHJcblx0XHRcdFx0XHRcdHNjb3BlOiBhbmd1bGFyLmV4dGVuZChzY29wZSwge1xyXG5cdFx0XHRcdFx0XHRcdGRhbmdlcjogb3B0aW9ucy5kYW5nZXIsXHJcblx0XHRcdFx0XHRcdFx0eWVzVGV4dDogb3B0aW9ucy55ZXNUZXh0LFxyXG5cdFx0XHRcdFx0XHRcdG5vVGV4dDogb3B0aW9ucy5ub1RleHQsXHJcblx0XHRcdFx0XHRcdFx0aW5mbzogb3B0aW9ucy5pbmZvLFxyXG5cdFx0XHRcdFx0XHRcdHJlc29sdmU6IHYgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0aW5zdGFuY2UuX2luc3RhbmNlLnJlc29sdmUodik7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9KSxcclxuXHRcdFx0XHRcdFx0dGVtcGxhdGU6XHJcbic8ZGl2IGNsYXNzPVwidWV4LW1vZGFsLXQtY29uZmlybVwiPlxcXHJcblx0PGRpdiBjbGFzcz1cInVleC1tb2RhbC10LWNvbmZpcm0tY29udGVudFwiPicgK1xyXG5cdG9wdGlvbnMudGVtcGxhdGUgKyAnXFxcclxuXHQ8L2Rpdj5cXFxyXG5cdDxkaXYgY2xhc3M9XCJ1ZXgtbW9kYWwtdC1jb25maXJtLWFjdGlvbnNcIj5cXFxyXG5cdFx0PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJidG4gYnRuLWRlZmF1bHQgbm8tYnRuXCIgbmctY2xpY2s9XCIkbW9kYWwuZGlzbWlzcygpXCIgbmctaWY9XCI6OiFpbmZvXCI+e3s6Om5vVGV4dH19PC9idXR0b24+XFxcclxuXHRcdDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiYnRuIHllcy1idG5cIiBuZy1jbGljaz1cInJlc29sdmUoKVwiIG5nLWNsYXNzPVwie2RhbmdlcjogZGFuZ2VyLCBcXCdidG4tZGFuZ2VyXFwnOiBkYW5nZXIsIFxcJ2J0bi1wcmltYXJ5XFwnOiAhZGFuZ2VyfVwiPnt7Ojp5ZXNUZXh0fX08L2J1dHRvbj5cXFxyXG5cdDwvZGl2PlxcXHJcbjwvZGl2PidcclxuXHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRcdGluc3RhbmNlLnByb21pc2UudGhlbihudWxsLCAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdHNjb3BlLiRkZXN0cm95KCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHRyZXR1cm4gaW5zdGFuY2UucHJvbWlzZTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHRpdGxlOiB2ID0+IHtcclxuXHRcdFx0XHRcdG9wdGlvbnMudGl0bGUgPSB2O1xyXG5cdFx0XHRcdFx0cmV0dXJuIHJldDtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGRhbmdlcjogKCkgPT4ge1xyXG5cdFx0XHRcdFx0b3B0aW9ucy5kYW5nZXIgPSB0cnVlO1xyXG5cdFx0XHRcdFx0cmV0dXJuIHJldDtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHllczogdiA9PiB7XHJcblx0XHRcdFx0XHRvcHRpb25zLnllc1RleHQgPSB2O1xyXG5cdFx0XHRcdFx0cmV0dXJuIHJldDtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG5vOiB2ID0+IHtcclxuXHRcdFx0XHRcdG9wdGlvbnMubm9UZXh0ID0gdjtcclxuXHRcdFx0XHRcdHJldHVybiByZXQ7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR0ZXh0OiB2ID0+IHtcclxuXHRcdFx0XHRcdG9wdGlvbnMudGVtcGxhdGUgPSB2O1xyXG5cdFx0XHRcdFx0cmV0dXJuIHJldDtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHRlbXBsYXRlOiB2ID0+IHtcclxuXHRcdFx0XHRcdG9wdGlvbnMudGVtcGxhdGUgPSB2O1xyXG5cdFx0XHRcdFx0cmV0dXJuIHJldDtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGNsYXNzZXM6IHYgPT4ge1xyXG5cdFx0XHRcdFx0b3B0aW9ucy5jbGFzc2VzID0gdjtcclxuXHRcdFx0XHRcdHJldHVybiByZXQ7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRpbmZvOiAoKSA9PiB7XHJcblx0XHRcdFx0XHRvcHRpb25zLmluZm8gPSB0cnVlO1xyXG5cdFx0XHRcdFx0cmV0dXJuIHJldDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRyZXR1cm4gcmV0O1xyXG5cdFx0fTtcclxuXHJcblx0XHRmdW5jLmluZm8gPSAoKSA9PiB7XHJcblx0XHRcdHJldHVybiBmdW5jLmNvbmZpcm0oKS5pbmZvKCkudGl0bGUoJ0luZm8nKS55ZXMoJ09LJyk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHJldHVybiBmdW5jO1xyXG5cclxuXHRcdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG5cdFx0ZnVuY3Rpb24gZGlzbWlzc1RvcE1vZGFsKGUpIHtcclxuXHRcdFx0aWYgKGluc3RhbmNlcy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0dmFyIHRvcCA9IGluc3RhbmNlc1tpbnN0YW5jZXMubGVuZ3RoIC0gMV07XHJcblx0XHRcdHRvcC5kaXNtaXNzKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2V0Q2xhc3Nlc09wdGlvbihvcHRpb25zKSB7XHJcblx0XHRcdHJldHVybiBvcHRpb25zLmNsYXNzZXMgfHwgb3B0aW9uc1snY2xhc3MnXTtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBnZXRXcmFwcGVyQ2xhc3NlcyhvcHRpb25zKSB7XHJcblx0XHRcdHZhciBjbGFzc2VzID0gZ2V0Q2xhc3Nlc09wdGlvbihvcHRpb25zKTtcclxuXHRcdFx0cmV0dXJuIGNsYXNzZXMgPyAnICcgKyBjbGFzc2VzIDogJyc7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2V0VGVtcGxhdGVNb2RhbENvbnRhaW5lcihvcHRpb25zKSB7XHJcblx0XHRcdHJldHVybiAnXFxcclxuPGRpdiBjbGFzcz1cInVleC1tb2RhbCcgKyBnZXRXcmFwcGVyQ2xhc3NlcyhvcHRpb25zKSArJ1wiIG5nLWNsaWNrPVwiX3RyeURpc21pc3MoJGV2ZW50KVwiPlxcXHJcblx0PGRpdiBjbGFzcz1cInVleC1tb2RhbC1jb250YWluZXJcIj5cXFxyXG5cdFx0PGRpdiBjbGFzcz1cInVleC1tb2RhbC1oZWFkZXJcIj5cXFxyXG5cdFx0XHQ8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cInVleC1tb2RhbC1jbG9zZVwiIG5nLWNsaWNrPVwiJG1vZGFsLmRpc21pc3MoKVwiPlxcXHJcblx0XHRcdFx0PHVleC1pY29uIGljb249XCJjbG9zZVwiPjwvdWV4LWljb24+XFxcclxuXHRcdFx0PC9idXR0b24+XFxcclxuXHRcdFx0PGgyPnt7JHRpdGxlfX08L2gyPlxcXHJcblx0XHQ8L2Rpdj5cXFxyXG5cdFx0PGRpdiBjbGFzcz1cInVleC1tb2RhbC1jb250ZW50XCI+PC9kaXY+XFxcclxuXHQ8L2Rpdj5cXFxyXG48L2Rpdj4nO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIHRlbXBsYXRlRm9yQ29tcG9uZW50KG5hbWUsIHJlc29sdmUpIHtcclxuXHRcdFx0dmFyIHQgPSAnPCcgKyBuYW1lO1xyXG5cdFx0XHRpZiAocmVzb2x2ZSkge1xyXG5cdFx0XHRcdGZvciAodmFyIHAgaW4gcmVzb2x2ZSkge1xyXG5cdFx0XHRcdFx0dmFyIHBOYW1lID0gdWV4VXRpbC5jYW1lbFRvRGFzaChwKTtcclxuXHRcdFx0XHRcdHQgKz0gJyAnICsgcE5hbWUgKyAnPVwiOjokcmVzb2x2ZS4nICsgcCArICdcIic7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdHQgKz0gJz48LycgKyBuYW1lICsgJz4nO1xyXG5cdFx0XHRyZXR1cm4gdDtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBnZXRUZW1wbGF0ZVByb21pc2Uob3B0aW9ucywgcmVzb2x2ZSkge1xyXG5cdFx0XHRpZiAob3B0aW9ucy5jb21wb25lbnQpIHtcclxuXHRcdFx0XHR2YXIgY29tcG9uZW50TmFtZSA9IHVleFV0aWwuY2FtZWxUb0Rhc2gob3B0aW9ucy5jb21wb25lbnQpO1xyXG5cdFx0XHRcdHJldHVybiAkcS53aGVuKHRlbXBsYXRlRm9yQ29tcG9uZW50KFxyXG5cdFx0XHRcdFx0Y29tcG9uZW50TmFtZSxcclxuXHRcdFx0XHRcdHJlc29sdmUpKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIG9wdGlvbnMudGVtcGxhdGUgPyAkcS53aGVuKG9wdGlvbnMudGVtcGxhdGUudHJpbSgpKSA6XHJcblx0XHRcdFx0JHRlbXBsYXRlUmVxdWVzdChhbmd1bGFyLmlzRnVuY3Rpb24ob3B0aW9ucy50ZW1wbGF0ZVVybCkgP1xyXG5cdFx0XHRcdFx0b3B0aW9ucy50ZW1wbGF0ZVVybCgpIDogb3B0aW9ucy50ZW1wbGF0ZVVybCk7XHJcblx0XHR9XHJcblx0fVxyXG59KSgpO1xyXG4iLCIoZnVuY3Rpb24gKCkge1xyXG5cdFwidXNlIHN0cmljdFwiO1xyXG5cclxuXHRhbmd1bGFyXHJcblx0XHQubW9kdWxlKCdtci51ZXgnKVxyXG5cdFx0LmRpcmVjdGl2ZSgndWV4TW9kYWwnLCBtb2RhbClcclxuXHRcdC5kaXJlY3RpdmUoJ3VleE1vZGFsQ29uZmlybScsIG1vZGFsQ29uZmlybSk7XHJcblxyXG5cdGZ1bmN0aW9uIG1vZGFsKHVleE1vZGFsKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRyZXN0cmljdDogJ0UnLFxyXG5cdFx0XHRzY29wZTogdHJ1ZSxcclxuXHRcdFx0dGVtcGxhdGU6ICgkZWxlbWVudCwgJGF0dHJzKSA9PiB7XHJcblx0XHRcdFx0JGF0dHJzLiRodG1sID0gJGVsZW1lbnQuaHRtbCgpO1xyXG5cdFx0XHRcdCRlbGVtZW50LmVtcHR5KCk7XHJcblx0XHRcdH0sXHJcblx0XHRcdGJpbmRUb0NvbnRyb2xsZXI6IHtcclxuXHRcdFx0XHRkZWxlZ2F0ZTogJz0nXHJcblx0XHRcdH0sXHJcblx0XHRcdGNvbnRyb2xsZXJBczogJyR1ZXhNb2RhbEN0cmwnLFxyXG5cdFx0XHRjb250cm9sbGVyOiBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzKSB7XHJcblx0XHRcdFx0dmFyIHRpdGxlID0gJGF0dHJzLnRpdGxlLFxyXG5cdFx0XHRcdFx0Y2xhc3NlcyA9ICRhdHRyc1snY2xhc3MnXSxcclxuXHRcdFx0XHRcdHRlbXBsYXRlID0gJGF0dHJzLiRodG1sO1xyXG5cclxuXHRcdFx0XHR0aGlzLmRlbGVnYXRlID0ge1xyXG5cdFx0XHRcdFx0b3Blbjogb3B0aW9ucyA9PiB7XHJcblx0XHRcdFx0XHRcdHJldHVybiB1ZXhNb2RhbChhbmd1bGFyLmV4dGVuZCh7XHJcblx0XHRcdFx0XHRcdFx0c2NvcGU6ICRzY29wZSxcclxuXHRcdFx0XHRcdFx0XHR0aXRsZTogdGl0bGUsXHJcblx0XHRcdFx0XHRcdFx0Y2xhc3NlczogY2xhc3NlcyxcclxuXHRcdFx0XHRcdFx0XHR0ZW1wbGF0ZTogdGVtcGxhdGVcclxuXHRcdFx0XHRcdFx0fSwgb3B0aW9ucykpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBtb2RhbENvbmZpcm0odWV4TW9kYWwpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHJlc3RyaWN0OiAnRScsXHJcblx0XHRcdHNjb3BlOiB0cnVlLFxyXG5cdFx0XHR0ZW1wbGF0ZTogKCRlbGVtZW50LCAkYXR0cnMpID0+IHtcclxuXHRcdFx0XHQkYXR0cnMuJGh0bWwgPSAkZWxlbWVudC5odG1sKCk7XHJcblx0XHRcdFx0JGVsZW1lbnQuZW1wdHkoKTtcclxuXHRcdFx0fSxcclxuXHRcdFx0YmluZFRvQ29udHJvbGxlcjoge1xyXG5cdFx0XHRcdGRlbGVnYXRlOiAnPSdcclxuXHRcdFx0fSxcclxuXHRcdFx0Y29udHJvbGxlckFzOiAnJHVleE1vZGFsQ29uZmlybUN0cmwnLFxyXG5cdFx0XHRjb250cm9sbGVyOiBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzKSB7XHJcblx0XHRcdFx0dmFyIHRpdGxlID0gJGF0dHJzLnRpdGxlLFxyXG5cdFx0XHRcdFx0Y2xhc3NlcyA9ICRhdHRyc1snY2xhc3MnXSxcclxuXHRcdFx0XHRcdHRlbXBsYXRlID0gJGF0dHJzLiRodG1sO1xyXG5cclxuXHRcdFx0XHR0aGlzLmRlbGVnYXRlID0ge1xyXG5cdFx0XHRcdFx0b3BlbjogKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gdWV4TW9kYWwuY29uZmlybSgpXHJcblx0XHRcdFx0XHRcdFx0LmNsYXNzZXMoY2xhc3NlcylcclxuXHRcdFx0XHRcdFx0XHQudGl0bGUodGl0bGUpXHJcblx0XHRcdFx0XHRcdFx0LnRlbXBsYXRlKHRlbXBsYXRlKVxyXG5cdFx0XHRcdFx0XHRcdC5vcGVuKCRzY29wZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcbn0pKCk7XHJcbiIsIihmdW5jdGlvbiAoKSB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cclxuXHRhbmd1bGFyXHJcblx0XHQubW9kdWxlKCdtci51ZXgnKVxyXG5cdFx0LnByb3ZpZGVyKCd1ZXhQJywgdWV4UFByb3ZpZGVyKVxyXG5cdFx0LmRpcmVjdGl2ZSgndWV4UCcsIHVleFApXHJcblx0XHQuZGlyZWN0aXZlKCd1ZXhQU3JjJywgdWV4UFNyYylcclxuXHRcdC5kaXJlY3RpdmUoJ3VleFBSdW5uaW5nJywgdWV4UFJ1bm5pbmcpXHJcblx0XHQuZGlyZWN0aXZlKCd1ZXhQU3VjY2VzcycsIHVleFBTdWNjZXNzKVxyXG5cdFx0LmRpcmVjdGl2ZSgndWV4UEVycm9yJywgdWV4UEVycm9yKVxyXG5cdFx0LmRpcmVjdGl2ZSgndWV4UFN0YXR1cycsIHVleFBTdGF0dXMpXHJcblx0XHQuZGlyZWN0aXZlKCd1ZXhQQnRuJywgdWV4UEJ0bik7XHJcblxyXG5cdGZ1bmN0aW9uIHVleFBQcm92aWRlcigpIHtcclxuXHRcdHRoaXMub3B0cyA9IHtcclxuXHRcdFx0c3VjY2Vzc0ludGVydmFsOiAxMDAwLFxyXG5cdFx0XHRlcnJvckludGVydmFsOiAxMDAwXHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuJGdldCA9ICgpID0+IHRoaXMub3B0cztcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHVleFAoJHBhcnNlLCB1ZXhQKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRyZXN0cmljdDogJ0EnLFxyXG5cdFx0XHRzY29wZTogdHJ1ZSxcclxuXHRcdFx0Y29udHJvbGxlcjogY29udHJvbGxlcixcclxuXHRcdFx0Y29udHJvbGxlckFzOiAnJHVleFAnXHJcblx0XHR9O1xyXG5cclxuXHRcdGZ1bmN0aW9uIGNvbnRyb2xsZXIoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzLCAkdGltZW91dCwgJHEpIHtcclxuXHRcdFx0dmFyIHByb21pc2UsXHJcblx0XHRcdFx0Zm4gPSAkcGFyc2UoJGF0dHJzLnVleFApLFxyXG5cdFx0XHRcdG9wdGlvbnMgPSAkc2NvcGUuJGV2YWwoJGF0dHJzLnVleFBPcHRzKSB8fCB7fSxcclxuXHRcdFx0XHQkJHByb21pc2VzID0ge307XHJcblxyXG5cdFx0XHR0aGlzLnJ1bm5pbmcgPSBmYWxzZTtcclxuXHRcdFx0dGhpcy5zdWNjZXNzID0gZmFsc2U7XHJcblx0XHRcdHRoaXMuZXJyb3IgPSBmYWxzZTtcclxuXHJcblx0XHRcdGlmICgkZWxlbWVudC5pcygnZm9ybScpICYmICRhdHRycy51ZXhQU3JjID09PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0XHQkZWxlbWVudC5vbignc3VibWl0JywgZSA9PiB7XHJcblx0XHRcdFx0XHQkc2NvcGUuJGFwcGx5KHRoaXMucnVuKGUpKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0ZnVuY3Rpb24gZ2V0TG9jYWxzKGFyZ3MpIHtcclxuXHRcdFx0XHRpZiAoIWFyZ3MgfHwgYXJncy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0JGV2ZW50OiBhcmdzWzBdXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dmFyIGludGVycG9sYXRlID0gKG5hbWUsIGludGVydmFsKSA9PiB7XHJcblx0XHRcdFx0dGhpc1tuYW1lXSA9IHRydWU7XHJcblx0XHRcdFx0dmFyIHAgPSAkJHByb21pc2VzW25hbWVdID0gJHRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKCQkcHJvbWlzZXNbbmFtZV0gPT09IHApIHtcclxuXHRcdFx0XHRcdFx0dGhpc1tuYW1lXSA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0sIGludGVydmFsKTtcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHRoaXMucnVuID0gZSA9PiB7XHJcblx0XHRcdFx0aWYgKGUuaXNEZWZhdWx0UHJldmVudGVkKCkpIHtcclxuXHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0XHR2YXIgcCA9IGZuKCRzY29wZSwgZ2V0TG9jYWxzKGFyZ3VtZW50cykpO1xyXG5cdFx0XHRcdGlmIChwICYmIHAuZmluYWxseSkge1xyXG5cdFx0XHRcdFx0cHJvbWlzZSA9IHA7XHJcblx0XHRcdFx0XHR0aGlzLnJ1bm5pbmcgPSB0cnVlO1xyXG5cdFx0XHRcdFx0cHJvbWlzZS50aGVuKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0aW50ZXJwb2xhdGUoJ3N1Y2Nlc3MnLCBvcHRpb25zLnN1Y2Nlc3NJbnRlcnZhbCB8fCB1ZXhQLnN1Y2Nlc3NJbnRlcnZhbCk7XHJcblx0XHRcdFx0XHR9LCAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdGludGVycG9sYXRlKCdlcnJvcicsIG9wdGlvbnMuZXJyb3JJbnRlcnZhbCB8fCB1ZXhQLmVycm9ySW50ZXJ2YWwpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRwcm9taXNlLmZpbmFsbHkoKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRpZiAocCAhPT0gcHJvbWlzZSkgcmV0dXJuO1xyXG5cdFx0XHRcdFx0XHR0aGlzLnJ1bm5pbmcgPSBmYWxzZTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHVleFBTcmMoKSB7XHJcblx0XHRmdW5jdGlvbiBkZXRlcm1pbmVFdmVudCgkZWxlbWVudCwgdmFsdWUpIHtcclxuXHRcdFx0aWYgKHZhbHVlICYmIGFuZ3VsYXIuaXNTdHJpbmcodmFsdWUpKSByZXR1cm4gdmFsdWU7XHJcblx0XHRcdGlmICgkZWxlbWVudC5pcygnZm9ybScpKSByZXR1cm4gJ3N1Ym1pdCc7XHJcblx0XHRcdHJldHVybiAnY2xpY2snO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHJlc3RyaWN0OiAnQScsXHJcblx0XHRcdHJlcXVpcmU6ICdedWV4UCcsXHJcblx0XHRcdHNjb3BlOiBmYWxzZSxcclxuXHRcdFx0bGluazogZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQsICRhdHRycywgY3RybCkge1xyXG5cdFx0XHRcdHZhciBldmVudCA9IGRldGVybWluZUV2ZW50KCRlbGVtZW50LCAkYXR0cnMudWV4UFNyYyk7XHJcblx0XHRcdFx0JGVsZW1lbnQub24oZXZlbnQsIGUgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKCRlbGVtZW50LmF0dHIoJ2Rpc2FibGVkJykpIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdCRzY29wZS4kYXBwbHkoY3RybC5ydW4oZSkpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gdWV4UENvbW1vbihraW5kKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRyZXN0cmljdDogJ0EnLFxyXG5cdFx0XHRyZXF1aXJlOiAnXnVleFAnLFxyXG5cdFx0XHRzY29wZToge30sXHJcblx0XHRcdHRyYW5zY2x1ZGU6IHRydWUsXHJcblx0XHRcdHRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cInVleC1wLScgKyBraW5kICsgJ1wiIG5nLXNob3c9XCJzaG93blwiIG5nLXRyYW5zY2x1ZGU+PC9kaXY+JyxcclxuXHRcdFx0bGluazogZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQsICRhdHRycywgY3RybCkge1xyXG5cdFx0XHRcdCRlbGVtZW50LmFkZENsYXNzKCd1ZXgtcC0nICsga2luZCk7XHJcblx0XHRcdFx0JHNjb3BlLiR3YXRjaCgoKSA9PiBjdHJsW2tpbmRdLCAobiwgbykgPT4ge1xyXG5cdFx0XHRcdFx0JHNjb3BlLnNob3duID0gISFuO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gdWV4UFJ1bm5pbmcoKSB7XHJcblx0XHRyZXR1cm4gdWV4UENvbW1vbigncnVubmluZycpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gdWV4UFN1Y2Nlc3MoKSB7XHJcblx0XHRyZXR1cm4gdWV4UENvbW1vbignc3VjY2VzcycpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gdWV4UEVycm9yKCkge1xyXG5cdFx0cmV0dXJuIHVleFBDb21tb24oJ2Vycm9yJyk7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiB1ZXhQU3RhdHVzKCkge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0cmVzdHJpY3Q6ICdFQScsXHJcblx0XHRcdHNjb3BlOiB7fSxcclxuXHRcdFx0dGVtcGxhdGU6ICc8c3BhbiBuZy1zaG93PVwic3VjY2VzcyB8fCBlcnJvclwiIGNsYXNzPVwidWV4LXAtc3RhdHVzXCIgbmctY2xhc3M9XCJjbGFzc2VzXCI+e3t0ZXh0fX08L3NwYW4+JyxcclxuXHRcdFx0cmVxdWlyZTogJ151ZXhQJyxcclxuXHRcdFx0bGluazogZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQsICRhdHRycywgY3RybCkge1xyXG5cdFx0XHRcdHZhciBzdWNjZXNzVGV4dCA9ICRhdHRycy5zdWNjZXNzIHx8ICdTdWNjZXNzJyxcclxuXHRcdFx0XHRcdGVycm9yVGV4dCA9ICRhdHRycy5lcnJvciB8fCAnRXJyb3InO1xyXG5cdFx0XHRcdCRzY29wZS5jbGFzc2VzID0gJyc7XHJcblxyXG5cdFx0XHRcdCRzY29wZS4kd2F0Y2goKCkgPT4gY3RybC5zdWNjZXNzLCAobiwgbykgPT4ge1xyXG5cdFx0XHRcdFx0JHNjb3BlLnN1Y2Nlc3MgPSBuO1xyXG5cdFx0XHRcdFx0aWYgKG4pIHtcclxuXHRcdFx0XHRcdFx0JHNjb3BlLmNsYXNzZXMgPSAndWV4LXAtc3VjY2Vzcyc7XHJcblx0XHRcdFx0XHRcdCRzY29wZS50ZXh0ID0gc3VjY2Vzc1RleHQ7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdCRzY29wZS4kd2F0Y2goKCkgPT4gY3RybC5lcnJvciwgKG4sIG8pID0+IHtcclxuXHRcdFx0XHRcdCRzY29wZS5lcnJvciA9IG47XHJcblx0XHRcdFx0XHRpZiAobikge1xyXG5cdFx0XHRcdFx0XHQkc2NvcGUuY2xhc3NlcyA9ICd1ZXgtcC1lcnJvcic7XHJcblx0XHRcdFx0XHRcdCRzY29wZS50ZXh0ID0gZXJyb3JUZXh0O1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gdWV4UEJ0bigpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHJlc3RyaWN0OiAnQScsXHJcblx0XHRcdHJlcXVpcmU6ICdedWV4UCcsXHJcblx0XHRcdGxpbms6IGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMsIGN0cmwpIHtcclxuXHRcdFx0XHR2YXIgaXNPbmVUaW1lID0gJGF0dHJzLnVleFBCdG4gPT09ICdvbmV0aW1lJztcclxuXHRcdFx0XHQkc2NvcGUuJHdhdGNoKCgpID0+IGN0cmwucnVubmluZywgKG4sIG8pID0+IHtcclxuXHRcdFx0XHRcdGlmIChuKSB7XHJcblx0XHRcdFx0XHRcdCRlbGVtZW50LmF0dHIoJ2Rpc2FibGVkJywgJ2Rpc2FibGVkJyk7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRpZiAoY3RybC5lcnJvciB8fCAhaXNPbmVUaW1lKSB7XHJcblx0XHRcdFx0XHRcdFx0JGVsZW1lbnQucmVtb3ZlQXR0cignZGlzYWJsZWQnKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxufSkoKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdGFuZ3VsYXJcclxuXHRcdC5tb2R1bGUoJ21yLnVleCcpXHJcblx0XHQuZmFjdG9yeSgndWV4UG9wJywgcG9wKTtcclxuXHJcblx0ZnVuY3Rpb24gcG9wKCRyb290U2NvcGUsICRjb21waWxlLCAkYW5pbWF0ZSwgJHRlbXBsYXRlUmVxdWVzdCwgJHEsIHVleFBvc2l0aW9uaW5nVGhyb3R0bGVyLCB1ZXhQb3NpdGlvbmVyLCAkdGltZW91dCkge1xyXG5cdFx0dmFyIF9pbnN0YW5jZSxcclxuXHRcdFx0JGJvZHkgPSAkKGRvY3VtZW50LmJvZHkpO1xyXG5cclxuXHRcdCRib2R5Lm9uKCdrZXlkb3duJywgZSA9PiB7XHJcblx0XHRcdGlmICghZS5pc0RlZmF1bHRQcmV2ZW50ZWQoKSAmJiBlLndoaWNoID09PSAyNykge1xyXG5cdFx0XHRcdGRpc21pc3MoZSk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdHVleFBvc2l0aW9uaW5nVGhyb3R0bGVyLnN1YnNjcmliZShjb250ZXh0ID0+IHtcclxuXHRcdFx0aWYgKF9pbnN0YW5jZSkgX2luc3RhbmNlLnBvc2l0aW9uKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBvcHRpb25zOlxyXG5cdFx0Ly8gICBzY29wZVxyXG5cdFx0Ly8gICBwbGFjZW1lbnQ6IFt0b3AsIHJpZ2h0LCBib3R0b20sIGxlZnRdIFtzdGFydCwgY2VudGVyLCBlbmRdXHJcblx0XHQvLyAgIG9mZnNldFxyXG5cdFx0Ly8gICB0YXJnZXRcclxuXHRcdC8vICAgdGVtcGxhdGUgLSB0ZW1wbGF0ZVVybFxyXG5cdFx0Ly8gICBsYXp5XHJcblx0XHQvLyAgIGNsYXNzZXNcclxuXHRcdC8vICAgbG9jYWxzXHJcblx0XHQvLyAgIG9uUG9zaXRpb25cclxuXHRcdC8vXHJcblx0XHR2YXIgZnVuYyA9IG9wdGlvbnMgPT4ge1xyXG5cdFx0XHR2YWxpZGF0ZShvcHRpb25zKTtcclxuXHJcblx0XHRcdHZhciAkZWxlbWVudCA9ICQoZ2V0VGVtcGxhdGVQb3Aob3B0aW9ucykpLFxyXG5cdFx0XHRcdGxpbmtmbjtcclxuXHJcblx0XHRcdHZhciBjcmVhdGVTY29wZSA9ICgpID0+IHtcclxuXHRcdFx0XHRyZXR1cm4gKG9wdGlvbnMuc2NvcGUgfHwgJHJvb3RTY29wZSkuJG5ldygpO1xyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0dmFyIGluc3RhbmNlID0ge1xyXG5cdFx0XHRcdF9kZWxlZ2F0ZXM6IFtdLFxyXG5cdFx0XHRcdHRhcmdldDogYW5ndWxhci5lbGVtZW50KG9wdGlvbnMudGFyZ2V0KSxcclxuXHRcdFx0XHRvcGVuOiAoKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAoX2luc3RhbmNlICYmIF9pbnN0YW5jZSAhPT0gaW5zdGFuY2UpIHtcclxuXHRcdFx0XHRcdFx0X2luc3RhbmNlLmRpc21pc3MoKTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRfaW5zdGFuY2UgPSBpbnN0YW5jZTtcclxuXHJcblx0XHRcdFx0XHR2YXIgdGVtcGxhdGVQcm9taXNlO1xyXG5cdFx0XHRcdFx0aWYgKCFsaW5rZm4pIHtcclxuXHRcdFx0XHRcdFx0dGVtcGxhdGVQcm9taXNlID0gZ2V0VGVtcGxhdGVQcm9taXNlKG9wdGlvbnMpLnRoZW4odGVtcGxhdGUgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdCRlbGVtZW50LmZpbmQoJy51ZXgtcG9wLWNvbnRlbnQnKS5odG1sKHRlbXBsYXRlKTtcclxuXHRcdFx0XHRcdFx0XHRsaW5rZm4gPSAkY29tcGlsZSgkZWxlbWVudCk7XHJcblx0XHRcdFx0XHRcdH0sICgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRkZXN0cm95QW5kQ2xlYW4oaW5zdGFuY2UpO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdHRlbXBsYXRlUHJvbWlzZSA9ICRxLndoZW4oKTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRyZXR1cm4gdGVtcGxhdGVQcm9taXNlLnRoZW4oKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHR2YXIgc2NvcGUgPSBhbmd1bGFyLmV4dGVuZChjcmVhdGVTY29wZSgpLCB7XHJcblx0XHRcdFx0XHRcdFx0JHBvcDogaW5zdGFuY2UsXHJcblx0XHRcdFx0XHRcdH0sIG9wdGlvbnMubG9jYWxzIHx8IHt9KTtcclxuXHJcblx0XHRcdFx0XHRcdGxpbmtmbihzY29wZSwgKCRjbG9uZSwgc2NvcGUpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRpbnN0YW5jZS5zY29wZSA9IHNjb3BlO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRzY29wZS4kb24oJyRkZXN0cm95JywgKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0aW5zdGFuY2UuZGlzbWlzcygpO1xyXG5cdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHRcdGluc3RhbmNlLmVsZW1lbnQgPSBpbnN0YW5jZS5wb3AgPSAkY2xvbmU7XHJcblxyXG5cdFx0XHRcdFx0XHRcdGluc3RhbmNlLnRhcmdldC5hZGRDbGFzcygndWV4LXBvcC1vcGVuJyk7XHJcblx0XHRcdFx0XHRcdFx0JGJvZHkuYWRkQ2xhc3MoJ3VleC1wb3AtYWN0aXZlJyk7XHJcblx0XHRcdFx0XHRcdFx0JGFuaW1hdGUuZW50ZXIoJGNsb25lLCAkYm9keSwgJGJvZHkuY2hpbGRyZW4oKS5sYXN0KCkpO1xyXG5cdFx0XHRcdFx0XHRcdHNjb3BlLiRldmFsQXN5bmMoKCkgPT4gaW5zdGFuY2UucG9zaXRpb24oKSk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRkaXNtaXNzOiAoKSA9PiB7XHJcblx0XHRcdFx0XHQkYW5pbWF0ZS5sZWF2ZShpbnN0YW5jZS5lbGVtZW50KS50aGVuKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0aW5zdGFuY2UudGFyZ2V0LnJlbW92ZUNsYXNzKCd1ZXgtcG9wLW9wZW4nKTtcclxuXHRcdFx0XHRcdFx0JGJvZHkucmVtb3ZlQ2xhc3MoJ3VleC1wb3AtYWN0aXZlJyk7XHJcblx0XHRcdFx0XHRcdGRlc3Ryb3lBbmRDbGVhbihpbnN0YW5jZSk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHBvc2l0aW9uOiBzdHViID0+IHtcclxuXHRcdFx0XHRcdHZhciB0YXJnZXQgPSBpbnN0YW5jZS50YXJnZXQsXHJcblx0XHRcdFx0XHRcdHBvcCA9IGluc3RhbmNlLnBvcDtcclxuXHJcblx0XHRcdFx0XHR2YXIgbyA9IGFuZ3VsYXIuZXh0ZW5kKG9wdGlvbnMsIHtcclxuXHRcdFx0XHRcdFx0dGFyZ2V0OiB0YXJnZXQsXHJcblx0XHRcdFx0XHRcdGVsZW1lbnQ6IHBvcCxcclxuXHRcdFx0XHRcdFx0bWFyZ2luOiA1XHJcblx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHRpZiAoc3R1Yikge1xyXG5cdFx0XHRcdFx0XHRvLnN0dWIgPSB0cnVlO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0dmFyIGNvbnRleHQgPSB1ZXhQb3NpdGlvbmVyKG8pO1xyXG5cdFx0XHRcdFx0aWYgKG9wdGlvbnMub25Qb3NpdGlvbikge1xyXG5cdFx0XHRcdFx0XHRvcHRpb25zLm9uUG9zaXRpb24oY29udGV4dCk7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0dWV4UG9zaXRpb25lci5hcHBseShjb250ZXh0KTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uRGlzbWlzczogYWN0aW9uID0+IHtcclxuXHRcdFx0XHRcdGluc3RhbmNlLl9kZWxlZ2F0ZXMucHVzaChhY3Rpb24pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGlmICghb3B0aW9ucy5sYXp5KSB7XHJcblx0XHRcdFx0aW5zdGFuY2Uub3BlbigpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gaW5zdGFuY2U7XHJcblx0XHR9O1xyXG5cclxuXHRcdHJldHVybiBmdW5jO1xyXG5cclxuXHRcdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG5cdFx0ZnVuY3Rpb24gdmFsaWRhdGUob3B0aW9ucykge1xyXG5cdFx0XHRpZiAoIW9wdGlvbnMudGVtcGxhdGUgJiYgIW9wdGlvbnMudGVtcGxhdGVVcmwpIHtcclxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ3RlbXBsYXRlIG9yIHRlbXBsYXRlVXJsIG11c3QgYmUgcHJvdmlkZWQuJyk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBkaXNtaXNzKGUpIHtcclxuXHRcdFx0aWYgKF9pbnN0YW5jZSkge1xyXG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0XHRfaW5zdGFuY2UuZGlzbWlzcygpO1xyXG5cdFx0XHRcdCRyb290U2NvcGUuJGFwcGx5QXN5bmMoKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGRlc3Ryb3lBbmRDbGVhbihpbnN0YW5jZSkge1xyXG5cdFx0XHRpbnN0YW5jZS5zY29wZS4kZGVzdHJveSgpO1xyXG5cdFx0XHR2YXIgZGVsZWdhdGVzID0gaW5zdGFuY2UuX2RlbGVnYXRlcztcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBkZWxlZ2F0ZXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRkZWxlZ2F0ZXNbaV0oKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKGluc3RhbmNlID09PSBfaW5zdGFuY2UpIF9pbnN0YW5jZSA9IG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2V0Q2xhc3Nlc09wdGlvbihvcHRpb25zKSB7XHJcblx0XHRcdHJldHVybiBvcHRpb25zLmNsYXNzZXMgfHwgb3B0aW9uc1snY2xhc3MnXTtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBnZXRXcmFwcGVyQ2xhc3NlcyhvcHRpb25zKSB7XHJcblx0XHRcdHZhciBjbGFzc2VzID0gZ2V0Q2xhc3Nlc09wdGlvbihvcHRpb25zKTtcclxuXHRcdFx0cmV0dXJuIGNsYXNzZXMgPyAnICcgKyBjbGFzc2VzIDogJyc7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2V0VGVtcGxhdGVQb3Aob3B0aW9ucykge1xyXG5cdFx0XHRyZXR1cm4gJ1xcXHJcbjxkaXYgY2xhc3M9XCJ1ZXgtcG9wJyArIGdldFdyYXBwZXJDbGFzc2VzKG9wdGlvbnMpICsgJ1wiPlxcXHJcblx0PGRpdiBjbGFzcz1cInVleC1wb3AtYmRcIiBuZy1jbGljaz1cIiRwb3AuZGlzbWlzcygpXCI+PC9kaXY+XFxcclxuXHQ8ZGl2IGNsYXNzPVwidWV4LXBvcC1jb250ZW50XCI+XFxcclxuXHQ8L2Rpdj5cXFxyXG48L2Rpdj4nO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGdldFRlbXBsYXRlUHJvbWlzZShvcHRpb25zKSB7XHJcblx0XHRcdHJldHVybiBvcHRpb25zLnRlbXBsYXRlID8gJHEud2hlbihvcHRpb25zLnRlbXBsYXRlKSA6XHJcblx0XHRcdFx0JHRlbXBsYXRlUmVxdWVzdChhbmd1bGFyLmlzRnVuY3Rpb24ob3B0aW9ucy50ZW1wbGF0ZVVybCkgP1xyXG5cdFx0XHRcdFx0b3B0aW9ucy50ZW1wbGF0ZVVybCgpIDogb3B0aW9ucy50ZW1wbGF0ZVVybCk7XHJcblx0XHR9XHJcblx0fVxyXG59KSgpO1xyXG4iLCIoZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0YW5ndWxhclxyXG5cdFx0Lm1vZHVsZSgnbXIudWV4JylcclxuXHRcdC5kaXJlY3RpdmUoJ3VleFBvcENvbnRhaW5lcicsIHBvcENvbnRhaW5lcilcclxuXHRcdC5kaXJlY3RpdmUoJ3VleFBvcFRhcmdldCcsIHBvcFRhcmdldClcclxuXHRcdC5kaXJlY3RpdmUoJ3VleFBvcCcsIHBvcCk7XHJcblxyXG5cdGZ1bmN0aW9uIHBvcENvbnRhaW5lcigpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHJlc3RyaWN0OiAnQScsXHJcblx0XHRcdHNjb3BlOiBmYWxzZSxcclxuXHRcdFx0Y29udHJvbGxlcjogZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdHZhciBfdGFyZ2V0RWxlbWVudDtcclxuXHJcblx0XHRcdFx0dGhpcy5yZWdpc3RlclRhcmdldCA9IHRhcmdldEVsZW1lbnQgPT4ge1xyXG5cdFx0XHRcdFx0X3RhcmdldEVsZW1lbnQgPSB0YXJnZXRFbGVtZW50O1xyXG5cdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdHRoaXMuZ2V0VGFyZ2V0ID0gKCkgPT4gX3RhcmdldEVsZW1lbnQ7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBwb3BUYXJnZXQoKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRyZXN0cmljdDogJ0EnLFxyXG5cdFx0XHRzY29wZTogZmFsc2UsXHJcblx0XHRcdHJlcXVpcmU6IHtcclxuXHRcdFx0XHRwb3BDb250YWluZXI6ICdedWV4UG9wQ29udGFpbmVyJ1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRiaW5kVG9Db250cm9sbGVyOiB0cnVlLFxyXG5cdFx0XHRjb250cm9sbGVyQXM6ICckdWV4UG9wVGFyZ2V0Q3RybCcsXHJcblx0XHRcdGNvbnRyb2xsZXI6IGZ1bmN0aW9uICgkZWxlbWVudCkge1xyXG5cdFx0XHRcdHRoaXMuJG9uSW5pdCA9ICgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMucG9wQ29udGFpbmVyLnJlZ2lzdGVyVGFyZ2V0KCRlbGVtZW50KTtcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gcG9wKHVleFBvcCkge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0cmVzdHJpY3Q6ICdFJyxcclxuXHRcdFx0dGVybWluYWw6IHRydWUsXHJcblx0XHRcdHNjb3BlOiB0cnVlLFxyXG5cdFx0XHRyZXF1aXJlOiB7XHJcblx0XHRcdFx0cG9wQ29udGFpbmVyOiAnXnVleFBvcENvbnRhaW5lcidcclxuXHRcdFx0fSxcclxuXHRcdFx0YmluZFRvQ29udHJvbGxlcjoge1xyXG5cdFx0XHRcdGRlbGVnYXRlOiAnPT8nXHJcblx0XHRcdH0sXHJcblx0XHRcdGNvbnRyb2xsZXJBczogJyR1ZXhQb3BDdHJsJyxcclxuXHRcdFx0Y29udHJvbGxlcjogZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQsICRhdHRycykge1xyXG5cdFx0XHRcdHZhciB0YXJnZXQsXHJcblx0XHRcdFx0XHRjbGFzc2VzID0gJGF0dHJzWydjbGFzcyddLFxyXG5cdFx0XHRcdFx0dGVtcGxhdGUgPSAkZWxlbWVudC5odG1sKCksXHJcblx0XHRcdFx0XHRvbiA9ICRhdHRycy5vbiB8fCAnY2xpY2snO1xyXG5cclxuXHRcdFx0XHR2YXIgc2hvd1BvcCA9ICgpID0+IHtcclxuXHRcdFx0XHRcdHVleFBvcCh7XHJcblx0XHRcdFx0XHRcdHNjb3BlOiAkc2NvcGUsXHJcblx0XHRcdFx0XHRcdHRhcmdldDogdGFyZ2V0LFxyXG5cdFx0XHRcdFx0XHRwbGFjZW1lbnQ6ICRhdHRycy5wbGFjZW1lbnQsXHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IGNsYXNzZXMsXHJcblx0XHRcdFx0XHRcdHRlbXBsYXRlOiB0ZW1wbGF0ZVxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0dGhpcy4kb25Jbml0ID0gKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGFyZ2V0ID0gdGhpcy5wb3BDb250YWluZXIuZ2V0VGFyZ2V0KCk7XHJcblxyXG5cdFx0XHRcdFx0aWYgKG9uID09PSAnY2xpY2snKSB7XHJcblx0XHRcdFx0XHRcdHRhcmdldC5vbignY2xpY2snLCAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0c2hvd1BvcCgpO1xyXG5cdFx0XHRcdFx0XHRcdCRzY29wZS4kYXBwbHlBc3luYygpO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH0gZWxzZSBpZiAob24gPT09ICdob3ZlcicpIHtcclxuXHRcdFx0XHRcdFx0dGFyZ2V0Lm9uKCdtb3VzZWVudGVyJywgKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdHNob3dQb3AoKTtcclxuXHRcdFx0XHRcdFx0XHQkc2NvcGUuJGFwcGx5QXN5bmMoKTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0dGhpcy5kZWxlZ2F0ZSA9IHtcclxuXHRcdFx0XHRcdG9wZW46ICgpID0+IHtcclxuXHRcdFx0XHRcdFx0c2hvd1BvcCgpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdHRoaXMuJHBvc3RMaW5rID0gKCkgPT4ge1xyXG5cdFx0XHRcdFx0JGVsZW1lbnQucmVtb3ZlQ2xhc3MoKTtcclxuXHRcdFx0XHRcdCRlbGVtZW50LmVtcHR5KCk7XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcbn0pKCk7XHJcbiIsIihmdW5jdGlvbiAoKSB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cclxuXHRhbmd1bGFyXHJcblx0XHQubW9kdWxlKCdtci51ZXgnKVxyXG5cdFx0LmZhY3RvcnkoJ3VleFBvcHRpcCcsIHBvcHRpcCk7XHJcblxyXG5cdGZ1bmN0aW9uIHBvcHRpcCgkcm9vdFNjb3BlLCAkYW5pbWF0ZSwgJGNvbXBpbGUsIHVleFBvc2l0aW9uZXIpIHtcclxuXHRcdHZhciAkYm9keSA9ICQoZG9jdW1lbnQuYm9keSk7XHJcblxyXG5cdFx0Ly8gb3B0aW9uczpcclxuXHRcdC8vICAgc2NvcGVcclxuXHRcdC8vICAgcGxhY2VtZW50OiBbdG9wLCByaWdodCwgYm90dG9tLCBsZWZ0XSBbc3RhcnQsIGNlbnRlciwgZW5kXVxyXG5cdFx0Ly8gICBvZmZzZXRcclxuXHRcdC8vICAgdGFyZ2V0XHJcblx0XHQvLyAgIHRlbXBsYXRlXHJcblx0XHQvLyAgIGNsYXNzZXNcclxuXHRcdC8vICAgbG9jYWxzXHJcblx0XHQvLyAgIGRlbGF5XHJcblx0XHQvL1xyXG5cdFx0dmFyIGZ1bmMgPSBvcHRpb25zID0+IHtcclxuXHRcdFx0b3B0aW9ucy5wbGFjZW1lbnQgPSBvcHRpb25zLnBsYWNlbWVudCB8fCAnYm90dG9tIGNlbnRlcic7XHJcblx0XHRcdG9wdGlvbnMuZGVsYXkgPSBvcHRpb25zLmRlbGF5IHx8IDA7XHJcblx0XHRcdG9wdGlvbnMudHJpZ2dlciA9IG9wdGlvbnMudHJpZ2dlciB8fCAnaG92ZXInO1xyXG5cclxuXHRcdFx0dmFyIHNjb3BlID0gb3B0aW9ucy5zY29wZSB8fCAkcm9vdFNjb3BlLFxyXG5cdFx0XHRcdHRhcmdldCA9IG9wdGlvbnMudGFyZ2V0LFxyXG5cdFx0XHRcdGVsZW1lbnQgPSAkKGdldFRlbXBsYXRlUG9wdGlwKG9wdGlvbnMpKSxcclxuXHRcdFx0XHRhbmltYXRlRW50ZXIsXHJcblx0XHRcdFx0YW5pbWF0ZUxlYXZlLFxyXG5cdFx0XHRcdCRhcnJvdyA9IGVsZW1lbnQuZmluZCgnLnVleC1wb3B0aXAtYXJyb3cnKSxcclxuXHRcdFx0XHRldmVudEluICA9IG9wdGlvbnMudHJpZ2dlciA9PT0gJ2hvdmVyJyA/ICdtb3VzZWVudGVyJyA6ICdmb2N1c2luJyxcclxuXHRcdFx0XHRldmVudE91dCA9IG9wdGlvbnMudHJpZ2dlciA9PT0gJ2hvdmVyJyA/ICdtb3VzZWxlYXZlJyA6ICdmb2N1c291dCc7XHJcblxyXG5cdFx0XHR2YXIgcG9zaXRpb24gPSAoKSA9PiB7XHJcblx0XHRcdFx0dmFyIG8gPSBhbmd1bGFyLmV4dGVuZChvcHRpb25zLCB7XHJcblx0XHRcdFx0XHR0YXJnZXQ6IHRhcmdldCxcclxuXHRcdFx0XHRcdGVsZW1lbnQ6IGVsZW1lbnQsXHJcblx0XHRcdFx0XHRtYXJnaW46IDUsXHJcblx0XHRcdFx0XHRzdHViOiB0cnVlXHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdHZhciBjb250ZXh0ID0gdWV4UG9zaXRpb25lcihvKTtcclxuXHRcdFx0XHR1ZXhQb3NpdGlvbmVyLmFwcGx5KGNvbnRleHQpO1xyXG5cclxuXHRcdFx0XHR2YXIgdixcclxuXHRcdFx0XHRcdGVwID0gY29udGV4dC5lcCxcclxuXHRcdFx0XHRcdHRwID0gY29udGV4dC50cCxcclxuXHRcdFx0XHRcdHAgPSB1ZXhQb3NpdGlvbmVyLnBhcnNlUGxhY2VtZW50KG9wdGlvbnMucGxhY2VtZW50KTtcclxuXHRcdFx0XHRzd2l0Y2ggKHAucGxhY2UpIHtcclxuXHRcdFx0XHRcdGNhc2UgJ3RvcCc6XHJcblx0XHRcdFx0XHRjYXNlICdib3R0b20nOlxyXG5cdFx0XHRcdFx0XHR2ID0gdHAubGVmdCAtIGVwLmxlZnQgKyAodHAud2lkdGggLyAyKSAtIDU7XHJcblx0XHRcdFx0XHRcdGlmICh2IDwgNSkgdiA9IDU7XHJcblx0XHRcdFx0XHRcdGlmICh2ID4gZXAud2lkdGggLSAxNSkgdiA9IGVwLndpZHRoIC0gMTU7XHJcblx0XHRcdFx0XHRcdCRhcnJvdy5jc3MoJ2xlZnQnLCB2ICsgJ3B4Jyk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdGNhc2UgJ3JpZ2h0JzpcclxuXHRcdFx0XHRcdGNhc2UgJ2xlZnQnOlxyXG5cdFx0XHRcdFx0XHR2ID0gdHAudG9wIC0gZXAudG9wICsgKHRwLmhlaWdodCAvIDIpIC0gNTtcclxuXHRcdFx0XHRcdFx0aWYgKHYgPCA1KSB2ID0gNTtcclxuXHRcdFx0XHRcdFx0aWYgKHYgPiBlcC5oZWlnaHQgLSAxNSkgdiA9IGVwLmhlaWdodCAtIDE1O1xyXG5cdFx0XHRcdFx0XHQkYXJyb3cuY3NzKCd0b3AnLCB2ICsgJ3B4Jyk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0YW5pbWF0ZUVudGVyID0gJGFuaW1hdGUuZW50ZXIoZWxlbWVudCwgJGJvZHksICRib2R5LmNoaWxkcmVuKCkubGFzdCgpKTtcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdCRjb21waWxlKGVsZW1lbnQpKGFuZ3VsYXIuZXh0ZW5kKHNjb3BlLCBvcHRpb25zLmxvY2FscyB8fCB7fSkpO1xyXG5cclxuXHRcdFx0dmFyIGFkZFRvRE9NID0gKCkgPT4ge1xyXG5cdFx0XHRcdGlmIChhbmltYXRlTGVhdmUpICRhbmltYXRlLmNhbmNlbChhbmltYXRlTGVhdmUpO1xyXG5cdFx0XHRcdHBvc2l0aW9uKCk7XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHR2YXIgcmVtb3ZlRnJvbURPTSA9ICgpID0+IHtcclxuXHRcdFx0XHRpZiAoYW5pbWF0ZUVudGVyKSAkYW5pbWF0ZS5jYW5jZWwoYW5pbWF0ZUVudGVyKTtcclxuXHRcdFx0XHRhbmltYXRlTGVhdmUgPSAkYW5pbWF0ZS5sZWF2ZShlbGVtZW50KTtcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHNjb3BlLiRvbignJGRlc3Ryb3knLCAoKSA9PiB7XHJcblx0XHRcdFx0cmVtb3ZlRnJvbURPTSgpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHRhcmdldC5vbihldmVudEluLCAoKSA9PiB7XHJcblx0XHRcdFx0c2NvcGUuJGFwcGx5KCgpID0+IHtcclxuXHRcdFx0XHRcdGFkZFRvRE9NKCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0dGFyZ2V0Lm9uKGV2ZW50T3V0LCAoKSA9PiB7XHJcblx0XHRcdFx0c2NvcGUuJGFwcGx5KCgpID0+IHtcclxuXHRcdFx0XHRcdHJlbW92ZUZyb21ET00oKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHJldHVybiBmdW5jO1xyXG5cclxuXHRcdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2V0Q2xhc3Nlc09wdGlvbihvcHRpb25zKSB7XHJcblx0XHRcdHJldHVybiBvcHRpb25zLmNsYXNzZXMgfHwgb3B0aW9uc1snY2xhc3MnXTtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBnZXRXcmFwcGVyQ2xhc3NlcyhvcHRpb25zKSB7XHJcblx0XHRcdHZhciBjbGFzc2VzID0gZ2V0Q2xhc3Nlc09wdGlvbihvcHRpb25zKTtcclxuXHRcdFx0cmV0dXJuIGNsYXNzZXMgPyAnICcgKyBjbGFzc2VzIDogJyc7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2V0VGVtcGxhdGVQb3B0aXAob3B0aW9ucykge1xyXG5cdFx0XHRyZXR1cm4gICdcXFxyXG48ZGl2IGNsYXNzPVwidWV4LXBvcHRpcCB1ZXgtcG9wdGlwLXAtJyArIG9wdGlvbnMucGxhY2VtZW50ICsgZ2V0V3JhcHBlckNsYXNzZXMob3B0aW9ucykgKyAnXCI+XFxcclxuXHQ8ZGl2IGNsYXNzPVwidWV4LXBvcHRpcC1hcnJvd1wiPjwvZGl2PlxcXHJcblx0PGRpdiBjbGFzcz1cInVleC1wb3B0aXAtY29udGVudFwiPicgKyBvcHRpb25zLnRlbXBsYXRlICsgJzwvZGl2PlxcXHJcbjwvZGl2Pic7XHJcblx0XHR9XHJcblx0fVxyXG59KSgpO1xyXG4iLCIoZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0YW5ndWxhclxyXG5cdFx0Lm1vZHVsZSgnbXIudWV4JylcclxuXHRcdC5kaXJlY3RpdmUoJ3VleFBvcHRpcENvbnRhaW5lcicsIHBvcHRpcENvbnRhaW5lcilcclxuXHRcdC5kaXJlY3RpdmUoJ3VleFBvcHRpcFRhcmdldCcsIHBvcHRpcFRhcmdldClcclxuXHRcdC5kaXJlY3RpdmUoJ3VleFBvcHRpcCcsIHBvcHRpcCk7XHJcblxyXG5cdGZ1bmN0aW9uIHBvcHRpcENvbnRhaW5lcigpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHJlc3RyaWN0OiAnQScsXHJcblx0XHRcdHNjb3BlOiBmYWxzZSxcclxuXHRcdFx0Y29udHJvbGxlcjogZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdHZhciBfdGFyZ2V0RWxlbWVudDtcclxuXHJcblx0XHRcdFx0dGhpcy5yZWdpc3RlclRhcmdldCA9IHRhcmdldEVsZW1lbnQgPT4ge1xyXG5cdFx0XHRcdFx0X3RhcmdldEVsZW1lbnQgPSB0YXJnZXRFbGVtZW50O1xyXG5cdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdHRoaXMuZ2V0VGFyZ2V0ID0gKCkgPT4gX3RhcmdldEVsZW1lbnQ7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBwb3B0aXBUYXJnZXQoKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRyZXN0cmljdDogJ0EnLFxyXG5cdFx0XHRzY29wZTogZmFsc2UsXHJcblx0XHRcdHJlcXVpcmU6IHtcclxuXHRcdFx0XHRwb3B0aXBDb250YWluZXI6ICdedWV4UG9wdGlwQ29udGFpbmVyJ1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRiaW5kVG9Db250cm9sbGVyOiB0cnVlLFxyXG5cdFx0XHRjb250cm9sbGVyQXM6ICckdWV4UG9wdGlwVGFyZ2V0Q3RybCcsXHJcblx0XHRcdGNvbnRyb2xsZXI6IGZ1bmN0aW9uICgkZWxlbWVudCkge1xyXG5cdFx0XHRcdHRoaXMuJG9uSW5pdCA9ICgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMucG9wdGlwQ29udGFpbmVyLnJlZ2lzdGVyVGFyZ2V0KCRlbGVtZW50KTtcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gcG9wdGlwKHVleFBvcHRpcCkge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0cmVzdHJpY3Q6ICdFJyxcclxuXHRcdFx0dGVybWluYWw6IHRydWUsXHJcblx0XHRcdHNjb3BlOiBmYWxzZSxcclxuXHRcdFx0dGVtcGxhdGU6ICgkZWxlbWVudCwgJGF0dHJzKSA9PiB7XHJcblx0XHRcdFx0JGF0dHJzLiRodG1sID0gJGVsZW1lbnQuaHRtbCgpO1xyXG5cdFx0XHRcdCRlbGVtZW50LmVtcHR5KCk7XHJcblx0XHRcdH0sXHJcblx0XHRcdGJpbmRUb0NvbnRyb2xsZXI6IHRydWUsXHJcblx0XHRcdHJlcXVpcmU6IHtcclxuXHRcdFx0XHRwb3B0aXBDb250YWluZXI6ICdedWV4UG9wdGlwQ29udGFpbmVyJ1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRjb250cm9sbGVyQXM6ICckdWV4UG9wdGlwQ3RybCcsXHJcblx0XHRcdGNvbnRyb2xsZXI6IGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMpIHtcclxuXHRcdFx0XHR2YXIgdGVtcGxhdGUgPSAkYXR0cnMuJGh0bWw7XHJcblxyXG5cdFx0XHRcdHRoaXMuJG9uSW5pdCA9ICgpID0+IHtcclxuXHRcdFx0XHRcdHZhciB0YXJnZXQgPSB0aGlzLnBvcHRpcENvbnRhaW5lci5nZXRUYXJnZXQoKTtcclxuXHJcblx0XHRcdFx0XHR1ZXhQb3B0aXAoe1xyXG5cdFx0XHRcdFx0XHRzY29wZTogJHNjb3BlLFxyXG5cdFx0XHRcdFx0XHR0YXJnZXQ6IHRhcmdldCxcclxuXHRcdFx0XHRcdFx0cGxhY2VtZW50OiAkYXR0cnMucGxhY2VtZW50LFxyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiAkYXR0cnNbJ2NsYXNzJ10sXHJcblx0XHRcdFx0XHRcdHRyaWdnZXI6ICRhdHRycy50cmlnZ2VyLFxyXG5cdFx0XHRcdFx0XHR0ZW1wbGF0ZTogdGVtcGxhdGVcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG59KSgpO1xyXG4iLCIoZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0YW5ndWxhci5tb2R1bGUoJ21yLnVleCcpLmNvbXBvbmVudCgndWV4UmFkaW8nLCB7XHJcblx0XHR0ZW1wbGF0ZTogJ1xcXHJcblx0XHRcdDxkaXYgY2xhc3M9XCJfdWV4LWljb25cIj5cXFxyXG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJfdWV4LW9uXCI+PC9kaXY+XFxcclxuXHRcdFx0PC9kaXY+XFxcclxuXHRcdFx0PG5nLXRyYW5zY2x1ZGUgY2xhc3M9XCJfdWV4LWxhYmVsXCI+PC9uZy10cmFuc2NsdWRlPicsXHJcblx0XHR0cmFuc2NsdWRlOiB0cnVlLFxyXG5cdFx0Y29udHJvbGxlcjogJGN0cmwsXHJcblx0XHRyZXF1aXJlOiB7XHJcblx0XHRcdHVleFJhZGlvR3JvdXBDdHJsOiAnXnVleFJhZGlvR3JvdXAnXHJcblx0XHR9LFxyXG5cdFx0YmluZGluZ3M6IHtcclxuXHRcdFx0dmFsdWU6ICc8J1xyXG5cdFx0fVxyXG5cdH0pO1xyXG5cclxuXHRmdW5jdGlvbiAkY3RybCgkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMpIHtcclxuXHRcdHZhciBsYXN0Q2hlY2tlZDtcclxuXHJcblx0XHR2YXIgcmVuZGVyID0gKCkgPT4ge1xyXG5cdFx0XHR2YXIgYXR0clZhbHVlID0gJGF0dHJzLnZhbHVlO1xyXG5cdFx0XHR2YXIgY2hlY2tlZCA9IGF0dHJWYWx1ZSA9PT0gdGhpcy51ZXhSYWRpb0dyb3VwQ3RybC5tb2RlbDtcclxuXHRcdFx0aWYgKGNoZWNrZWQgPT09IGxhc3RDaGVja2VkKSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRsYXN0Q2hlY2tlZCA9IGNoZWNrZWQ7XHJcblx0XHRcdGlmIChjaGVja2VkKSB7XHJcblx0XHRcdFx0JGVsZW1lbnQuYWRkQ2xhc3MoJ2NoZWNrZWQnKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQkZWxlbWVudC5yZW1vdmVDbGFzcygnY2hlY2tlZCcpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdCRhdHRycy4kb2JzZXJ2ZSgndmFsdWUnLCByZW5kZXIpO1xyXG5cdFx0JHNjb3BlLiR3YXRjaCgoKSA9PiB0aGlzLnVleFJhZGlvR3JvdXBDdHJsLm1vZGVsLCByZW5kZXIpO1xyXG5cclxuXHRcdHZhciBjbGlja0xpc3RlbmVyID0gZSA9PiB7XHJcblx0XHRcdGlmIChlLmlzRGVmYXVsdFByZXZlbnRlZCgpIHx8ICRlbGVtZW50LmF0dHIoJ2Rpc2FibGVkJykpIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdCRzY29wZS4kYXBwbHkoKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMudWV4UmFkaW9Hcm91cEN0cmwuc2VsZWN0KCRhdHRycy52YWx1ZSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuJHBvc3RMaW5rID0gKCkgPT4ge1xyXG5cdFx0XHQkZWxlbWVudC5vbignY2xpY2snLCBjbGlja0xpc3RlbmVyKTtcclxuXHRcdH07XHJcblx0fVxyXG59KSgpO1xyXG4iLCIoZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0YW5ndWxhci5tb2R1bGUoJ21yLnVleCcpLmNvbXBvbmVudCgndWV4UmFkaW9Hcm91cCcsIHtcclxuXHRcdGNvbnRyb2xsZXI6ICRjdHJsLFxyXG5cdFx0cmVxdWlyZToge1xyXG5cdFx0XHRuZ01vZGVsQ3RybDogJ15uZ01vZGVsJ1xyXG5cdFx0fSxcclxuXHRcdGJpbmRpbmdzOiB7XHJcblx0XHRcdG1vZGVsOiAnPW5nTW9kZWwnXHJcblx0XHR9XHJcblx0fSk7XHJcblxyXG5cdGZ1bmN0aW9uICRjdHJsKCRzY29wZSkge1xyXG5cdFx0dGhpcy5zZWxlY3QgPSB2YWx1ZSA9PiB7XHJcblx0XHRcdHRoaXMubmdNb2RlbEN0cmwuJHNldFZpZXdWYWx1ZSh2YWx1ZSk7XHJcblx0XHR9O1xyXG5cdH1cclxufSkoKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdGFuZ3VsYXJcclxuXHRcdC5tb2R1bGUoJ21yLnVleCcpXHJcblx0XHQuY29tcG9uZW50KCd1ZXhTZWxlY3QnLCB7XHJcblx0XHRcdHRlbXBsYXRlOiAoJGVsZW1lbnQsICRhdHRycykgPT4ge1xyXG5cdFx0XHRcdCduZ0luamVjdCc7XHJcblxyXG5cdFx0XHRcdCRhdHRycy4kaHRtbCA9ICRlbGVtZW50Lmh0bWwoKTtcclxuXHRcdFx0XHQkZWxlbWVudC5lbXB0eSgpO1xyXG5cclxuXHRcdFx0XHRyZXR1cm4gJ1xcXHJcbjxkaXYgY2xhc3M9XCJ1ZXgtc2VsZWN0XCIgbmctY2xhc3M9XCJ7b3BlbjogJGN0cmwub3BlbmVkfVwiPlxcXHJcblx0PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJidXR0b24gaGFzLWNhcmV0XCIgbmctY2xpY2s9XCIkY3RybC5vcGVuKClcIj5cXFxyXG5cdFx0e3skY3RybC50ZXh0fX1cXFxyXG5cdDwvYnV0dG9uPlxcXHJcblx0PHVleC1pY29uIGljb249XCJjbG9zZVwiIGNsYXNzPVwiYnRuLXBsYWluIGJ0bi1kaW1cIiBuZy1pZj1cIiRjdHJsLmNsZWFyYWJsZSAmJiAkY3RybC5zZWxlY3RlZFwiIG5nLWNsaWNrPVwiJGN0cmwuY2xlYXIoKVwiPjwvdWV4LWljb24+XFxcclxuPC9kaXY+JztcclxuXHRcdFx0fSxcclxuXHRcdFx0Y29udHJvbGxlcjogdWV4U2VsZWN0Q3RybCxcclxuXHRcdFx0cmVxdWlyZToge1xyXG5cdFx0XHRcdG5nTW9kZWxDdHJsOiAnbmdNb2RlbCdcclxuXHRcdFx0fSxcclxuXHRcdFx0YmluZGluZ3M6IHtcclxuXHRcdFx0XHRleHA6ICdAJyxcclxuXHRcdFx0XHRvcmlnaW5hbFRleHQ6ICdAdGV4dCcsXHJcblx0XHRcdFx0aGVhZGVyOiAnQD8nLFxyXG5cdFx0XHRcdGNsYXNzZXM6ICdAPycsXHJcblx0XHRcdFx0Y2xlYXJhYmxlOiAnPD8nXHJcblx0XHRcdH1cclxuXHRcdH0pXHJcblx0XHQuZGlyZWN0aXZlKCd1ZXhTZWxlY3RUcmFuc2NsdWRlJywgdWV4U2VsZWN0VHJhbnNjbHVkZSlcclxuXHRcdC5kaXJlY3RpdmUoJ3VleFNlbGVjdFNpbXBsZScsIHVleFNlbGVjdFNpbXBsZSk7XHJcblxyXG5cdGZ1bmN0aW9uIHVleFNlbGVjdFRyYW5zY2x1ZGUoKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRyZXN0cmljdDogJ0EnLFxyXG5cdFx0XHRsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzKSB7XHJcblx0XHRcdFx0dmFyIGN0cmwgPSAkc2NvcGUuJGN0cmw7XHJcblx0XHRcdFx0Y3RybC5fcG9wdWxhdGVTY29wZSgkc2NvcGUpO1xyXG5cclxuXHRcdFx0XHQkc2NvcGUuJGV2YWxBc3luYygoKSA9PiBjdHJsLnBvcCgpLnBvc2l0aW9uKCkpO1xyXG5cclxuXHRcdFx0XHQkc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdGN0cmwuX3JlbW92ZVNjb3BlKCRzY29wZSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiB1ZXhTZWxlY3RDdHJsKCRzY29wZSwgJGVsZW1lbnQsICRhdHRycywgJHBhcnNlLCB1ZXhQb3ApIHtcclxuXHRcdHZhbGlkYXRlKCRhdHRycyk7XHJcblxyXG5cdFx0dmFyIHNjb3BlcyA9IFtdLFxyXG5cdFx0XHRvcmlnaW5hbFRleHQgPSB0aGlzLm9yaWdpbmFsVGV4dCxcclxuXHRcdFx0b3B0aW9ucyA9IHBhcnNlKHRoaXMuZXhwKSxcclxuXHRcdFx0a2V5TmFtZSA9IG9wdGlvbnMua2V5TmFtZSxcclxuXHRcdFx0Y2xhc3NlcyA9IHRoaXMuY2xhc3NlcyxcclxuXHRcdFx0cG9wSW5zdGFuY2U7XHJcblxyXG5cdFx0dmFyIGNvbnRlbnQgPSAkYXR0cnMuJGh0bWwsXHJcblx0XHRcdCRidXR0b247XHJcblxyXG5cdFx0dmFyIGRpc3BsYXkgPSBpdGVtID0+IHtcclxuXHRcdFx0aWYgKG9wdGlvbnMuYXNGbiA9PT0gYW5ndWxhci5ub29wKSByZXR1cm4gaXRlbTtcclxuXHRcdFx0dmFyIGxvY2FscyA9IHt9O1xyXG5cdFx0XHRsb2NhbHNba2V5TmFtZV0gPSBpdGVtO1xyXG5cdFx0XHRyZXR1cm4gb3B0aW9ucy5hc0ZuKCRzY29wZSwgbG9jYWxzKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dmFyIHRyYWNrID0gaXRlbSA9PiB7XHJcblx0XHRcdGlmIChvcHRpb25zLnRyYWNrRm4gPT09IGFuZ3VsYXIubm9vcCkgcmV0dXJuIGl0ZW07XHJcblx0XHRcdHZhciBsb2NhbHMgPSB7fTtcclxuXHRcdFx0bG9jYWxzW2tleU5hbWVdID0gaXRlbTtcclxuXHRcdFx0cmV0dXJuIG9wdGlvbnMudHJhY2tGbigkc2NvcGUsIGxvY2Fscyk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHZhciBnZXRJdGVtcyA9ICgpID0+IHtcclxuXHRcdFx0cmV0dXJuIG9wdGlvbnMuaW5Gbigkc2NvcGUuJHBhcmVudCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHZhciBzZXRUZXh0ID0gdCA9PiB7XHJcblx0XHRcdHRoaXMudGV4dCA9IHQ7XHJcblx0XHR9O1xyXG5cclxuXHRcdHZhciByZXNldFRleHQgPSAoKSA9PiB7XHJcblx0XHRcdHRoaXMudGV4dCA9IG9yaWdpbmFsVGV4dDtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy4kcG9zdExpbmsgPSAoKSA9PiB7XHJcblx0XHRcdCRidXR0b24gPSAkZWxlbWVudC5maW5kKCcuYnV0dG9uJyk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuJG9uSW5pdCA9ICgpID0+IHtcclxuXHRcdFx0dGhpcy5uZ01vZGVsQ3RybC4kcmVuZGVyID0gKCkgPT4ge1xyXG5cdFx0XHRcdHZhciB2YWx1ZSA9IHRoaXMubmdNb2RlbEN0cmwuJHZpZXdWYWx1ZTtcclxuXHRcdFx0XHR0aGlzLnNlbGVjdCh2YWx1ZSA/IHZhbHVlIDogbnVsbCk7XHJcblx0XHRcdH07XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuX3BvcHVsYXRlU2NvcGUgPSBzY29wZSA9PiB7XHJcblx0XHRcdHZhciBpdGVtID0gc2NvcGUuaXRlbTtcclxuXHRcdFx0c2NvcGVzLnB1c2goc2NvcGUpO1xyXG5cdFx0XHRpZiAoaXRlbSAmJiB0cmFjayhpdGVtKSA9PT0gdHJhY2sodGhpcy5zZWxlY3RlZCkpIHtcclxuXHRcdFx0XHRzY29wZS4kc2VsZWN0ZWQgPSB0cnVlO1xyXG5cdFx0XHR9IGVsc2UgaWYgKGl0ZW0pIHtcclxuXHRcdFx0XHRzY29wZS4kc2VsZWN0ZWQgPSBmYWxzZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoaXRlbSkge1xyXG5cdFx0XHRcdHNjb3BlW2tleU5hbWVdID0gaXRlbTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLl9yZW1vdmVTY29wZSA9IHNjb3BlID0+IHtcclxuXHRcdFx0dmFyIGluZGV4ID0gc2NvcGVzLmluZGV4T2Yoc2NvcGUpO1xyXG5cdFx0XHRpZiAoaW5kZXggPj0gMCkge1xyXG5cdFx0XHRcdHNjb3Blcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuX2ZpbmRTY29wZSA9IChpdGVtLCByZXNvbHZlLCByZWplY3QpID0+IHtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzY29wZXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHR2YXIgc2NvcGUgPSBzY29wZXNbaV07XHJcblx0XHRcdFx0aWYgKGl0ZW0gPT09IHNjb3BlLml0ZW0pIHtcclxuXHRcdFx0XHRcdGlmIChyZXNvbHZlKVxyXG5cdFx0XHRcdFx0XHRyZXNvbHZlKHNjb3BlKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0aWYgKHJlamVjdClcclxuXHRcdFx0XHRcdFx0cmVqZWN0KHNjb3BlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5vcGVuID0gKCkgPT4ge1xyXG5cdFx0XHR0aGlzLm9wZW5lZCA9IHRydWU7XHJcblx0XHRcdGlmICghcG9wSW5zdGFuY2UpIHtcclxuXHRcdFx0XHRwb3BJbnN0YW5jZSA9IHVleFBvcCh7XHJcblx0XHRcdFx0XHRzY29wZTogJHNjb3BlLFxyXG5cdFx0XHRcdFx0dGFyZ2V0OiAkYnV0dG9uLFxyXG5cdFx0XHRcdFx0cGxhY2VtZW50OiAnYm90dG9tIHN0YXJ0JyxcclxuXHRcdFx0XHRcdGNsYXNzZXM6ICd1ZXgtc2VsZWN0LXBvcCAnICsgY2xhc3NlcyxcclxuXHRcdFx0XHRcdHRlbXBsYXRlOiBnZXRUZW1wbGF0ZVBvcChjb250ZW50KVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdHBvcEluc3RhbmNlLm9uRGlzbWlzcygoKSA9PiB0aGlzLm9wZW5lZCA9IGZhbHNlKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRwb3BJbnN0YW5jZS5vcGVuKCk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5jbG9zZSA9ICgpID0+IHtcclxuXHRcdFx0aWYgKHBvcEluc3RhbmNlKSBwb3BJbnN0YW5jZS5kaXNtaXNzKCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuY2xlYXIgPSAoKSA9PiB0aGlzLnNlbGVjdChudWxsKTtcclxuXHJcblx0XHR0aGlzLnNlbGVjdCA9IGl0ZW0gPT4ge1xyXG5cdFx0XHRpZiAoIWl0ZW0gJiYgIXRoaXMuc2VsZWN0ZWQpIHJldHVybjtcclxuXHJcblx0XHRcdHRoaXMuc2VsZWN0ZWQgPSBpdGVtO1xyXG5cclxuXHRcdFx0aWYgKGl0ZW0pIHtcclxuXHRcdFx0XHR0aGlzLl9maW5kU2NvcGUoaXRlbSwgc2NvcGUgPT4ge1xyXG5cdFx0XHRcdFx0c2NvcGUuJHNlbGVjdGVkID0gdHJ1ZTtcclxuXHRcdFx0XHR9LCBzY29wZSA9PiB7XHJcblx0XHRcdFx0XHRzY29wZS4kc2VsZWN0ZWQgPSBmYWxzZTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHR0aGlzLm5nTW9kZWxDdHJsLiRzZXRWaWV3VmFsdWUoaXRlbSk7XHJcblx0XHRcdFx0c2V0VGV4dChkaXNwbGF5KGl0ZW0pKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0aGlzLl9maW5kU2NvcGUobnVsbCwgbnVsbCwgc2NvcGUgPT4ge1xyXG5cdFx0XHRcdFx0c2NvcGUuJHNlbGVjdGVkID0gZmFsc2U7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0dGhpcy5uZ01vZGVsQ3RybC4kc2V0Vmlld1ZhbHVlKG51bGwpO1xyXG5cdFx0XHRcdHJlc2V0VGV4dCgpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR0aGlzLmNsb3NlKCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuaXRlbXMgPSAoKSA9PiBnZXRJdGVtcygpO1xyXG5cclxuXHRcdHRoaXMucG9wID0gKCkgPT4gcG9wSW5zdGFuY2U7XHJcblxyXG5cdFx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcblx0XHRpZiAodGhpcy5jbGVhcmFibGUgPT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHR0aGlzLmNsZWFyYWJsZSA9IHRydWU7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKCF0aGlzLmhlYWRlcikge1xyXG5cdFx0XHR0aGlzLmhlYWRlciA9IG9yaWdpbmFsVGV4dDtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLm9wZW5lZCA9IGZhbHNlO1xyXG5cdFx0dGhpcy5zZWxlY3RlZCA9IG51bGw7XHJcblx0XHR0aGlzLnRleHQgPSBvcmlnaW5hbFRleHQ7XHJcblxyXG5cdFx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcblx0XHRmdW5jdGlvbiBwYXJzZShleHApIHtcclxuXHRcdFx0dmFyIG1hdGNoID0gZXhwLm1hdGNoKFxyXG5cdFx0XHRcdC9eXFxzKihbXFxzXFxTXSs/KVxccytpblxccysoW1xcc1xcU10rPykoPzpcXHMrYXNcXHMrKFtcXHNcXFNdKz8pKT8oPzpcXHMrdHJhY2tcXHMrYnlcXHMrKFtcXHNcXFNdKz8pKT9cXHMqJC8pO1xyXG5cclxuXHRcdFx0dmFyIHBhcnNlZCA9IHtcclxuXHRcdFx0XHRrZXlOYW1lOiBtYXRjaFsxXSxcclxuXHRcdFx0XHRpbkZuOiAkcGFyc2UobWF0Y2hbMl0pLFxyXG5cdFx0XHRcdGFzRm46ICRwYXJzZShtYXRjaFszXSksXHJcblx0XHRcdFx0dHJhY2tGbjogJHBhcnNlKG1hdGNoWzRdKVxyXG5cdFx0XHR9O1xyXG5cdFx0XHRwYXJzZWQuYXN5bmNNb2RlID0gIXBhcnNlZC5pbkZuLmFzc2lnbiAmJiAhcGFyc2VkLmluRm4ubGl0ZXJhbDtcclxuXHRcdFx0cmV0dXJuIHBhcnNlZDtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiB2YWxpZGF0ZSgkYXR0cnMpIHtcclxuXHRcdFx0aWYgKCEkYXR0cnMuZXhwKSB7XHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdcXCd1ZXhTZWxlY3RcXCc6IEF0dHJpYnV0ZSBcXCdleHBcXCcgaXMgcmVxdWlyZWQuJyk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBnZXRUZW1wbGF0ZVBvcChjb250ZW50KSB7XHJcblx0XHRcdHJldHVybiAnXFxcclxuPGhlYWRlcj5cXFxyXG5cdDx1ZXgtaWNvbiBpY29uPVwiY2xvc2VcIiBjbGFzcz1cImNsb3NlLWJ0biBidG4tcGxhaW4gYnRuLWRpbVwiIG5nLWNsaWNrPVwiJHBvcC5kaXNtaXNzKClcIj48L3VleC1pY29uPlxcXHJcblx0PGRpdiBjbGFzcz1cImhlYWRlci10ZXh0XCI+e3s6OiRjdHJsLmhlYWRlcn19PC9kaXY+XFxcclxuPC9oZWFkZXI+XFxcclxuPGRpdiBjbGFzcz1cIl91ZXgtY29udGVudFwiPlxcXHJcblx0PHVsIGNsYXNzPVwib3B0aW9ucyBuby1tYXJnaW5cIj5cXFxyXG5cdFx0PGxpIG5nLXJlcGVhdD1cIml0ZW0gaW4gJGN0cmwuaXRlbXMoKVwiIG5nLWNsaWNrPVwiJGN0cmwuc2VsZWN0KGl0ZW0pXCIgdWV4LXNlbGVjdC10cmFuc2NsdWRlPicgKyBjb250ZW50ICsgJzwvbGk+XFxcclxuXHQ8L3VsPlxcXHJcbjwvZGl2Pic7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiB1ZXhTZWxlY3RTaW1wbGUoKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRyZXN0cmljdDogJ0UnLFxyXG5cdFx0XHR0cmFuc2NsdWRlOiB0cnVlLFxyXG5cdFx0XHR0ZW1wbGF0ZTogJ1xcXHJcblx0XHRcdFx0PGRpdiBjbGFzcz1cInVleC1zZWxlY3Qtc2ltcGxlLWNvbnRlbnRcIiBuZy10cmFuc2NsdWRlPjwvZGl2PlxcXHJcblx0XHRcdFx0PHVleC1pY29uIGljb249XCJjaGVja1wiIG5nLWlmPVwiJHNlbGVjdGVkXCI+PC91ZXgtaWNvbj4nXHJcblx0XHR9O1xyXG5cdH1cclxufSkoKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdGFuZ3VsYXJcclxuXHRcdC5tb2R1bGUoJ21yLnVleCcpXHJcblx0XHQuZGlyZWN0aXZlKCd1ZXhUb29sdGlwJywgdWV4VG9vbHRpcCk7XHJcblxyXG5cdGZ1bmN0aW9uIHVleFRvb2x0aXAoKSB7XHJcblx0XHRmdW5jdGlvbiBleHRyYWN0UGxhY2VtZW50KHYpIHtcclxuXHRcdFx0dmFyIGluZGV4ID0gdi5pbmRleE9mKCcsJyk7XHJcblx0XHRcdHJldHVybiB2LnNsaWNlKDAsIGluZGV4KS50cmltKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gZXh0cmFjdFRleHQodikge1xyXG5cdFx0XHR2YXIgaW5kZXggPSB2LmluZGV4T2YoJywnKTtcclxuXHRcdFx0cmV0dXJuIHYuc2xpY2UoaW5kZXggKyAxKS50cmltKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0cmVzdHJpY3Q6ICdBJyxcclxuXHRcdFx0c2NvcGU6IGZhbHNlLFxyXG5cdFx0XHRsaW5rOiBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzKSB7XHJcblx0XHRcdFx0dmFyIHBsYWNlbWVudCA9IGV4dHJhY3RQbGFjZW1lbnQoJGF0dHJzLnVleFRvb2x0aXApO1xyXG5cdFx0XHRcdCRlbGVtZW50LmFkZENsYXNzKCd0b29sdGlwcGVkIHRvb2x0aXBwZWQtJyArIHBsYWNlbWVudCk7XHJcblxyXG5cdFx0XHRcdCRhdHRycy4kb2JzZXJ2ZSgndWV4VG9vbHRpcCcsIGZ1bmN0aW9uICh2KSB7XHJcblx0XHRcdFx0XHR2YXIgdGV4dCA9IGV4dHJhY3RUZXh0KHYpO1xyXG5cdFx0XHRcdFx0JGVsZW1lbnQuYXR0cignYXJpYS1sYWJlbCcsIHRleHQpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxufSkoKTtcclxuIl0sInNvdXJjZVJvb3QiOiIvY29tcG9uZW50cyJ9
