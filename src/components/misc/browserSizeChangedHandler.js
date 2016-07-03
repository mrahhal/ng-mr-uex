(function () {
	'use strict';

	angular
		.module('mr.uex')
		.factory('browserSizeChangedHandler', browserSizeChangedHandler);

	function now() {
		return +new Date();
	}

	function remove(array, item) {
		var index = array.indexOf(item);
		array.splice(index, 1);
	}

	function browserSizeChangedHandler() {
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

		var processHandlers = () => {
			var context = getContext();
			for (var i = 0; i < handlers.length; i++) {
				var handler = handlers[i];
				handler(context);
			}
		};

		var tick = function () {
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
			processHandlers();
			lastDuration = now() - lastCall;
		};

		$(() => {
			processHandlers();
			['resize', 'scroll', 'touchmove'].forEach(event => {
				window.addEventListener(event, tick);
			});
		});

		return {
			subscribe: handler => {
				handlers.push(handler);
				processHandlers();
				return () => {
					remove(handlers, handler);
				};
			}
		};
	}
})();
