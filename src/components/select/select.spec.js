/*jshint -W043 */

describe('uexSelect', function () {
	beforeEach(module('mr.uex'));

	function compile(str, scope) {
		var container;
		inject(function ($compile) {
			container = $compile(str)(scope);
			scope.$apply();
		});
		return container;
	}

	function createScope() {
		var scope;
		inject(function ($rootScope) {
			scope = $rootScope.$new();
			angular.extend(scope, {
				vm: {},
				items: [{
					id: 0,
					name: 'item1'
				}, {
					id: 1,
					name: 'item2'
				}]
			});
		});
		return scope;
	}

	describe('throw behavior', function () {
		it('should throw if no exp is provided', inject(function () {
			var scope = createScope();
			var template = '<uex-select ng-model="vm.model"></uex-select>';

			(function () {
				compile(template, scope);
			}).should.throw('\'uexSelect\': Attribute \'exp\' is required.');
		}));
	});

	describe('start', function () {
		it('should not be selected', function () {
			var scope = createScope();
			var template = '<uex-select ng-model="vm.model" exp="item as item.name for item in items"></uex-select>';
			compile(template, scope);

			should.not.exist(scope.vm.model);
		});

		it('should select item if model is selected', inject(function ($rootScope) {
			var scope = createScope();
			scope.vm.model = scope.items[0];
			var template = '<uex-select ng-model="vm.model" exp="item as item.name for item in items"></uex-select>';
			compile(template, scope);

			should.exist(scope.vm.model);
		}));
	});

	describe('general', function () {
		it('should select item when clicked', function () {
			var scope = createScope();
			var template = '<uex-select ng-model="vm.model" exp="item as item.name for item in items"></uex-select>';
			var $element = compile(template, scope);
			$element.find('ul > li').first().click();

			should.exist(scope.vm.model);
			scope.vm.model.should.be.exactly(scope.items[0]);
		});

		it('should correctly transclude selected item', function () {
			var scope = createScope();
			var template = '<uex-select ng-model="vm.model" exp="item as item.name for item in items"><div class="inner" data-id="{{item.id}}">{{item.name}}</div></uex-select>';
			var $element = compile(template, scope);
			$element.find('ul > li').first().click();

			var $inner = $element.find('ul > li').first().find('.inner');
			$inner.data('id').should.be.exactly(scope.items[0].id);
			$inner.html().should.be.exactly(scope.items[0].name);
		});

		it('should correctly set serviced properties on selected item\'s scope', function () {
			var scope = createScope();
			var template =
				'<uex-select ng-model="vm.model" exp="item as item.name for item in items">\
					<div class="inner" ng-class="{selected: $selected}" data-id="{{item.id}}">{{item.name}}</div>\
				</uex-select>';
			var $element = compile(template, scope);
			$element.find('ul > li').first().click();

			var $inner = $element.find('ul > li').first().find('.inner');
			$inner.hasClass('selected').should.be.true();
		});
	});

	describe('sync', function () {
	});

	describe('async', function () {
	});
});
