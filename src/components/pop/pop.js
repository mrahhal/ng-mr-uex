(function () {
	'use strict';

	angular
		.module('mr.uex')
		.factory('uexPop', pop);

	function pop($rootScope, $compile, $animate, $templateRequest, $q, uexPositioningThrottler, uexPositioner) {
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
							scope.$applyAsync(() => instance.position(true));
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
