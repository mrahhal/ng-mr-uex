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
