window.get = function (name, element) {
	element = element || '*[ng-app]';
	return angular.element(element).injector().get(name);
};

angular.module('app', ['ui.router', 'mr.uex']);
