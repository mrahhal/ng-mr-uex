(function () {
	'use strict';

	angular
		.module('mr.uex')
		.factory('modal', modal);

	function modal($rootScope, $compile, $controller, $animate, $templateRequest, $q) {
		var instances = [],
			$body,
			$bd;

		function listenToEvents() {
			$rootScope.$on('uex-modal-bd.clicked', handleBdClicked);
			$body.on('keydown', e => {
				if (!e.isDefaultPrevented() && e.which === 27) {
					dismissTopModal(e);
				}
			});
		}

		function ensure() {
			if ($body) {
				return;
			}

			$body = $(document.body); //jshint ignore: line
			// The ng-click here might never fire
			$bd = $('<div class="uex-modal-bd" ng-click="$root.$broadcast(\'uex-modal-bd.clicked\')" />');
			$compile($bd)($rootScope);
			$body.append($bd);
			listenToEvents();
		}

		function handleBdClicked() {
			dismissTopModal();
		}

		function dismissTopModal(e) {
			if (instances.length === 0) {
				return;
			}

			e.preventDefault();
			var top = instances[instances.length - 1];
			top.dismiss();
			top.scope.$applyAsync();
		}

		ensure();

		var getWrapperClasses = options =>
			options.class ? ' ' + options.class : '';

		var getModalContainerTemplate = options =>
			'<div class="uex-modal' + getWrapperClasses(options) +'">\
				<div class="uex-modal-container">\
					<div class="uex-modal-header">\
						<button type="button" class="uex-modal-close" ng-click="$modal.dismiss()">\
							<uex-icon icon="close"></uex-icon>\
						</button>\
						<h2>{{::title}}</h2>\
					</div>\
					<div class="uex-modal-content"></div>\
				</div>\
			</div>';

		function getTemplatePromise(options) {
			return options.template ? $q.when(options.template) :
				$templateRequest(angular.isFunction(options.templateUrl) ?
					options.templateUrl() : options.templateUrl);
		}

		// options:
		//   scope
		//   template - templateUrl
		//   title
		//   class
		//   locals
		//
		var func = options => {
			var scope = (options.scope || $rootScope).$new();
			var $element = $(getModalContainerTemplate(options));

			var destroyAndClean = instance => {
				instance.scope.$destroy();
				var delegates = instance._delegates;
				for (var i = 0; i < delegates.length; i++) {
					delegates[i]();
				}
			};

			var instance = {
				_delegates: [],
				scope: scope,
				element: $element,
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
						instances[instances.length - 1].active(true);
						destroyAndClean(instance);
					}
				},
				active: value => {
					if (value) instance.element.removeClass('inactive');
					else instance.element.addClass('inactive');
				},
				onDismiss: action => {
					instance._delegates.push(action);
				}
			};
			instances.push(instance);

			// Support options.component?
			var templatePromise = getTemplatePromise(options);
			templatePromise.then(template => {
				$element.find('.uex-modal-content').html(template);

				$compile($element)(angular.extend(scope, {
					title: options.title || 'Modal',
					$modal: instance
				}, options.locals || {}));

				if (instances.length !== 1) {
					for (var i = 0; i < instances.length - 1; i++) {
						instances[i].active(false);
					}
				}

				$body.addClass('uex-modal-active');
				$animate.enter($element, $body, $body.children().last());
			}, () => {
				destroyAndClean(instance);
			});

			return instance;
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
				open: scope => {
					var deferred = $q.defer();
					var instance = func({
						title: options.title,
						scope: angular.extend(scope, {
							danger: options.danger,
							yesText: options.yesText,
							noText: options.noText,
							info: options.info,
							resolve: () => {
								deferred.resolve();
								instance.dismiss();
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
					instance.onDismiss(() => deferred.reject());
					return deferred.promise;
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
