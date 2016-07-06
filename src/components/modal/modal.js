(function () {
	'use strict';

	angular
		.module('mr.uex')
		.factory('modal', modal);

	function modal($rootScope, $compile, $controller, $animate) {
		var instances = [],
			$body,
			$bd;

		function listenToEvents() {
			$rootScope.$on('uex-modal-bd.clicked', handleBdClicked);
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

		var func = options => {
			var scope = options.scope || $rootScope.$new();
			var $element = $(getModalContainerTemplate());
			$element.find('.uex-modal-content').html(options.template);

			var instance = {
				element: $element,
				dismiss: () => {
					var i = instances.indexOf(instance);
					instances.splice(i, 1);
					var leaving = $animate.leave($element);

					if (instances.length === 0) {
							leaving.then(() => {
								$body.removeClass('uex-modal-active');
							});
					} else {
						instances[instances.length - 1].active(true);
					}
				},
				active: value => {
					if (value) instance.element.removeClass('inactive');
					else instance.element.addClass('inactive');
				}
			};

			$compile($element)(angular.extend(scope, {
				title: options.title || 'Modal',
				$modal: instance
			}, options.locals || {}));

			instances.push(instance);
			if (instances.length !== 1) {
				for (var i = 0; i < instances.length - 1; i++) {
					instances[i].active(false);
				}
			}

			$body.addClass('uex-modal-active');
			$animate.enter($element, $body, $body.children().last());
		};

		return func;
	}
})();
