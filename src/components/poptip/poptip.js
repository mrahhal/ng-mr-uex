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

			$compile(element)(angular.extend(scope, options.locals || {}));

			var removeFromDOM = () => {
				if (animateEnter)
					$animate.cancel(animateEnter);
				animateLeave = $animate.leave(element);
			};

			scope.$on('$destroy', () => {
				removeFromDOM();
			});

			target.on('mouseenter', () => {
				if (animateLeave)
					$animate.cancel(animateLeave);
				position();
				scope.$applyAsync();
			});
			target.on('mouseleave', () => {
				removeFromDOM();
				scope.$applyAsync();
			});
		};

		return func;
	}
})();
