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
