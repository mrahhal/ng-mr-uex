(function () {
	'use strict';

	angular
		.module('mr.uex')
		.factory('pop', pop);

	function pop($rootScope, $compile, $animate, $templateRequest, $q, $timeout, browserSizeChangedHandler) {
		var _instance,
			$window,
			$body;

		function listenToEvents() {
			$body.on('keydown', e => {
				if (!e.isDefaultPrevented() && e.which === 27) {
					e.preventDefault();
					dismiss();
				}
			});
			browserSizeChangedHandler.subscribe(context => {
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

			$window = $(window);
			$body = $(document.body); //jshint ignore: line
			listenToEvents();
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

		var getWrapperClasses = options =>
			options.classes ? ' ' + options.classes : '';

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

		function computeLeftForVertical(tp, pp, offset, align) {
			switch (align) {
				case 'start':
					offset.left = tp.left;
					break;

				case 'center':
					offset.left = tp.left + (tp.width / 2) - (pp.width / 2);
					break;

				case 'end':
					offset.left = tp.left + tp.width - pp.width;
					break;
			}
		}

		function computeTopForHorizontal(tp, pp, offset, align) {
			switch (align) {
				case 'start':
					offset.top = tp.top;
					break;

				case 'center':
					offset.top = tp.top + (tp.height / 2) - (pp.height / 2);
					break;

				case 'end':
					offset.top = tp.top + tp.height - pp.height;
					break;
			}
		}

		function computeOffset(context, options) {
			var placement = options.placement,
				align = options.align,
				o = options.offset,
				pp = context.pp,
				tp = context.tp;

			var offset = {
				top: 0,
				left: 0
			};

			switch (placement) {
				case 'top':
					offset.top = tp.top - pp.height - o;
					computeLeftForVertical(tp, pp, offset, align);
					break;

				case 'right':
					offset.left = tp.left + tp.width + o;
					computeTopForHorizontal(tp, pp, offset, align);
					break;

				case 'bottom':
					offset.top = tp.top + tp.height + o;
					computeLeftForVertical(tp, pp, offset, align);
					break;

				case 'left':
					offset.left = tp.left - pp.width - o;
					computeTopForHorizontal(tp, pp, offset, align);
					break;
			}

			return offset;
		}

		function coarseOffset(offset, context, options) {
			var gp = {
				top: $window.scrollTop(),
				width: $window.width(),
				height: $window.height()
			};

			// Coarse left
			if (offset.left + context.pp.width > gp.width) {
				offset.left -= offset.left + context.pp.width - gp.width;
			}

			// Coarse top
			if (offset.top + context.pp.height > gp.height) {
				offset.top -= offset.top + context.pp.height - gp.height;
			}

			// Coarse negatives
			if (offset.left < 0) offset.left = 0;
			if (offset.top < 0) offset.top = 0;

			// Set maxWidth
			offset.maxWidth = gp.width;

			// Set maxHeight
			offset.maxHeight = gp.height;
		}

		// options:
		//   scope
		//   placement: top, right, bottom, left
		//   align: start, center, end
		//   offset
		//   target
		//   template - templateUrl
		//   classes
		//   locals
		//   onPosition
		//
		var func = options => {
			var scope = (options.scope || $rootScope).$new();
			var $element = $(getPopTemplate(options));

			options.placement = options.placement || 'bottom';
			options.align = options.align || 'start';
			options.offset = options.offset || 5;

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
				position: (el) => {
					if (instance._disposed) return;

					var target = instance.target,
						pop = instance.pop,
						stub = el || pop,
						targetOffset = target.offset();

					var tp = {
						top: targetOffset.top,
						left: targetOffset.left,
						width: target.outerWidth(),
						height: target.outerHeight()
					};
					var pp = {
						width: stub.outerWidth(),
						height: stub.outerHeight()
					};
					var context = {
						target: target,
						pop: stub,
						tp: tp,
						pp: pp
					};
					var offset = computeOffset(context, options);
					coarseOffset(offset, context, options);
					context.pp.left = offset.left;
					context.pp.top = offset.top;

					if (options.onPosition) {
						options.onPosition(context, offset);
					}

					pop.css('top', offset.top);
					pop.css('left', offset.left);
					if (offset.maxWidth) {
						pop.css('max-width', offset.maxWidth);
					}
					if (offset.maxHeight) {
						pop.css('max-height', offset.maxHeight);
					}
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
				measure($element, (e) => {
					instance.position(e);
					$animate.enter($element, $body, $body.children().last());
				});
				// $timeout(() => {
				// 	instance.position();
				// });
			}, () => {
				destroyAndClean(instance);
			});

			return instance;
		};

		return func;
	}
})();
