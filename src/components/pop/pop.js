(function () {
	'use strict';

	angular
		.module('mr.uex')
		.factory('uexPop', pop);

	function pop($rootScope, $compile, $animate, $templateRequest, $q, uexPositioningThrottler, uexPositioner) {
		var _instance,
			$body;

		function listenToEvents() {
			$body.on('keydown', e => {
				if (!e.isDefaultPrevented() && e.which === 27) {
					dismiss(e);
				}
			});
			uexPositioningThrottler.subscribe(context => {
				if (_instance) _instance.position();
			});
		}

		function dismiss(e) {
			if (_instance) {
				e.preventDefault();
				_instance.dismiss();
				$rootScope.$applyAsync();
			}
		}

		function ensure() {
			if ($body) return;

			$body = $(document.body);
			listenToEvents();
		}

		ensure();

		function getClassesOption(options) {
			return options.classes || options['class'];
		}

		var getWrapperClasses = options => {
			var classes = getClassesOption(options);
			return classes ? ' ' + classes : '';
		};

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

		function validate(options) {
			if (!options.template && !options.templateUrl) {
				throw new Error('template or templateUrl must be provided.');
			}
		}

		// options:
		//   scope
		//   placement: [top, right, bottom, left] [start, center, end]
		//   offset
		//   target
		//   template - templateUrl
		//   classes
		//   locals
		//   onPosition
		//
		var func = options => {
			validate(options);
			var scope = (options.scope || $rootScope).$new();
			var $element = $(getPopTemplate(options));

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
				position: stub => {
					if (instance._disposed) return;

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
			_instance = instance;

			var templatePromise = getTemplatePromise(options);
			templatePromise.then(template => {
				$element.find('.uex-pop-content').html(template);

				$compile($element)(angular.extend(scope, {
					$pop: instance,
				}, options.locals || {}));

				scope.$on('$destroy', () => {
					instance.dismiss();
				});

				instance.target.addClass('uex-pop-open');
				$body.addClass('uex-pop-active');
				instance.position(true);
				$animate.enter($element, $body, $body.children().last());
			}, () => {
				destroyAndClean(instance);
			});

			return instance;
		};

		return func;
	}
})();
