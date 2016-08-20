(function () {
	'use strict';

	angular
		.module('mr.uex')
		.factory('uexModal', modal);

	function modal($rootScope, $compile, $controller, $animate, $templateRequest, $q, uexUtil) {
		var instances = [],
			$body;

		function listenToEvents() {
			$body.on('keydown', e => {
				if (!e.isDefaultPrevented() && e.which === 27) {
					$rootScope.$apply(() => {
						dismissTopModal(e);
					});
				}
			});
		}

		function ensure() {
			if ($body) return;

			$body = $(document.body);
			listenToEvents();
		}

		function dismissTopModal(e) {
			if (instances.length === 0) {
				return;
			}

			e.preventDefault();
			var top = instances[instances.length - 1];
			top.dismiss();
		}

		ensure();

		var getWrapperClasses = options =>
			options.class ? ' ' + options.class : '';

		var getModalContainerTemplate = options =>
			'<div class="uex-modal' + getWrapperClasses(options) +'" ng-click="_tryDismiss($event)">\
				<div class="uex-modal-container">\
					<div class="uex-modal-header">\
						<button type="button" class="uex-modal-close" ng-click="$modal.dismiss()">\
							<uex-icon icon="close"></uex-icon>\
						</button>\
						<h2>{{::$title}}</h2>\
					</div>\
					<div class="uex-modal-content"></div>\
				</div>\
			</div>';

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

			return options.template ? $q.when(options.template) :
				$templateRequest(angular.isFunction(options.templateUrl) ?
					options.templateUrl() : options.templateUrl);
		}

		// options:
		//   scope
		//   template - templateUrl
		//   component
		//   title
		//   class
		//   locals
		//
		var func = options => {
			options = angular.isString(options) ? { component: options } : options;
			var scope = (options.scope || $rootScope).$new();
			var $element = $(getModalContainerTemplate(options));

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
				resolve: v => {
					deferred.resolve(v);
					instance.dismiss();
				},
				dismiss: () => {
					var i = instances.indexOf(instance);
					instances.splice(i, 1);
					var leaving = $animate.leave($element);

					if (instances.length === 0) {
						leaving.then(() => {
							$body.removeClass('uex-modal-active');
							destroyAndClean(instance);
						});
					} else {
						instances[instances.length - 1]._active(true);
						destroyAndClean(instance);
					}

					deferred.reject();
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
				$animate.enter($element, $body, $body.children().last());
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
					var scope = (parentScope || $rootScope).$new();
					var instance = func({
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
	}
})();
