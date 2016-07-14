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

		function coarseOffset(context, options) {
			var offset = context.offset,
				margin = options.margin || 0,
				gp = {
					left: margin,
					top: $window.scrollTop() + margin,
					width: $window.width() - margin * 2,
					height: $window.height() - margin * 2
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
			if (offset.left < gp.left) offset.left = gp.left;
			if (offset.top < gp.top) offset.top = gp.top;

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

		var func = options => {
			var target = options.target,
				element = options.element,
				targetOffset = target.offset();

			var tp = {
				top: targetOffset.top,
				left: targetOffset.left,
				width: target.outerWidth(),
				height: target.outerHeight()
			};
			var pp = {};
			measuring(options, el => {
				pp.width = el.outerWidth();
				pp.height = el.outerHeight();
			});
			var context = {
				target: target,
				element: element,
				tp: tp,
				pp: pp
			};
			var offset = computeOffset(context, options);
			context.offset = offset;
			coarseOffset(context, options);
			context.pp.left = offset.left;
			context.pp.top = offset.top;

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
