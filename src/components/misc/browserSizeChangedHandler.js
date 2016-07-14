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
