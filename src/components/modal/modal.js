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
					e.preventDefault();
					dismissTopModal();
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

		function dismissTopModal() {
			if (instances.length === 0) {
				return;
			}

			var top = instances[instances.length - 1];
			top.scope.$applyAsync();
			top.dismiss();
		}

		ensure();

		var getModalContainerTemplate = () =>
			'<div class="uex-modal-wrapper">\
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

		var func = options => {
			var scope = (options.scope || $rootScope).$new();
			var $element = $(getModalContainerTemplate());

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

		return func;
	}
})();
