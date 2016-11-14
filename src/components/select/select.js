(function () {
	'use strict';

	angular
		.module('mr.uex')
		.component('uexSelect', {
			template: ($element, $attrs) => {
				$attrs.$html = $element.html();
				$element.empty();

				return '\
<div class="uex-select" ng-class="{open: $ctrl.opened}">\
	<button type="button" class="button has-caret" ng-click="$ctrl.open()">\
		{{$ctrl.text}}\
	</button>\
	<uex-icon icon="close" class="btn-plain btn-dim" ng-if="$ctrl.clearable && $ctrl.selected" ng-click="$ctrl.clear()"></uex-icon>\
</div>';
			},
			controller: uexSelectCtrl,
			require: {
				ngModelCtrl: 'ngModel'
			},
			bindings: {
				exp: '@',
				originalText: '@text',
				header: '@?',
				classes: '@?',
				clearable: '<?'
			}
		})
		.directive('uexSelectTransclude', uexSelectTransclude)
		.directive('uexSelectSimple', uexSelectSimple);

	function uexSelectTransclude() {
		return {
			restrict: 'A',
			link: function ($scope, $element, $attrs) {
				var ctrl = $scope.$ctrl;
				ctrl._populateScope($scope);
				$scope.$on('$destroy', function () {
					ctrl._removeScope($scope);
				});
			}
		};
	}

	function uexSelectCtrl($scope, $element, $attrs, $parse, uexPop) {
		validate($attrs);

		var scopes = [],
			originalText = this.originalText,
			options = parse(this.exp),
			keyName = options.keyName,
			classes = this.classes,
			popInstance;

		var content = $attrs.$html,
			$button;

		var display = item => {
			if (options.asFn === angular.noop) return item;
			var locals = {};
			locals[keyName] = item;
			return options.asFn($scope, locals);
		};

		var track = item => {
			if (options.trackFn === angular.noop) return item;
			var locals = {};
			locals[keyName] = item;
			return options.trackFn($scope, locals);
		};

		var getItems = () => {
			return options.inFn($scope.$parent);
		};

		var setText = t => {
			this.text = t;
		};

		var resetText = () => {
			this.text = originalText;
		};

		this.$postLink = () => {
			$button = $element.find('.button');
		};

		this.$onInit = () => {
			this.ngModelCtrl.$render = () => {
				var value = this.ngModelCtrl.$viewValue;
				this.select(value ? value : null);
			};
		};

		this._populateScope = scope => {
			var item = scope.item;
			scopes.push(scope);
			if (item && track(item) === track(this.selected)) {
				scope.$selected = true;
			} else if (item) {
				scope.$selected = false;
			}
			if (item) {
				scope[keyName] = item;
			}
		};

		this._removeScope = scope => {
			var index = scopes.indexOf(scope);
			if (index >= 0) {
				scopes.splice(index, 1);
			}
		};

		this._findScope = (item, resolve, reject) => {
			for (var i = 0; i < scopes.length; i++) {
				var scope = scopes[i];
				if (item === scope.item) {
					if (resolve)
						resolve(scope);
				} else {
					if (reject)
						reject(scope);
				}
			}
		};

		this.open = () => {
			this.opened = true;
			if (!popInstance) {
				popInstance = uexPop({
					scope: $scope,
					target: $button,
					placement: 'bottom start',
					classes: 'uex-select-pop ' + classes,
					template: getTemplatePop(content)
				});
				popInstance.onDismiss(() => this.opened = false);
			} else {
				popInstance.open();
			}
		};

		this.close = () => {
			if (popInstance) popInstance.dismiss();
		};

		this.clear = () => this.select(null);

		this.select = item => {
			if (!item && !this.selected) return;

			this.selected = item;

			if (item) {
				this._findScope(item, scope => {
					scope.$selected = true;
				}, scope => {
					scope.$selected = false;
				});
				this.ngModelCtrl.$setViewValue(item);
				setText(display(item));
			} else {
				this._findScope(null, null, scope => {
					scope.$selected = false;
				});
				this.ngModelCtrl.$setViewValue(null);
				resetText();
			}

			this.close();
		};

		this.items = () => getItems();

		//------------------------------------------------------------------------------

		if (this.clearable === undefined) {
			this.clearable = true;
		}

		if (!this.header) {
			this.header = originalText;
		}

		this.opened = false;
		this.selected = null;
		this.text = originalText;

		//------------------------------------------------------------------------------

		function parse(exp) {
			var match = exp.match(
				/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+track\s+by\s+([\s\S]+?))?\s*$/);

			var parsed = {
				keyName: match[1],
				inFn: $parse(match[2]),
				asFn: $parse(match[3]),
				trackFn: $parse(match[4])
			};
			parsed.asyncMode = !parsed.inFn.assign && !parsed.inFn.literal;
			return parsed;
		}

		function validate($attrs) {
			if (!$attrs.exp) {
				throw new Error('\'uexSelect\': Attribute \'exp\' is required.');
			}
		}

		function getTemplatePop(content) {
			return '\
<header>\
	<uex-icon icon="close" class="close-btn btn-plain btn-dim" ng-click="$pop.dismiss()"></uex-icon>\
	<div class="header-text">{{::$ctrl.header}}</div>\
</header>\
<div class="_uex-content">\
	<ul class="options no-margin">\
		<li ng-repeat="item in $ctrl.items()" ng-click="$ctrl.select(item)" uex-select-transclude>' + content + '</li>\
	</ul>\
</div>';
		}
	}

	function uexSelectSimple() {
		return {
			restrict: 'E',
			transclude: true,
			template: '\
				<div class="uex-select-simple-content" ng-transclude></div>\
				<uex-icon icon="check" ng-if="$selected"></uex-icon>'
		};
	}
})();
