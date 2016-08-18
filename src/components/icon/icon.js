(function () {
	'use strict';

	angular
		.module('mr.uex')
		.provider('uexIcons', uexIconsProvider)
		.directive('uexIcon', uexIcon);

	function uexIconsProvider() {
		var icons = [{
			id: 'add,plus',
			svg: '<path d="M192 224v-128h-64v128h-128v64h128v128h64v-128h128v-64h-128z"/>',
			viewBox: '0 0 320 512'
		}, {
			id: 'close',
			svg: '<path d="M7.48 8l3.75 3.75-1.48 1.48L6 9.48l-3.75 3.75-1.48-1.48L4.52 8 .77 4.25l1.48-1.48L6 6.52l3.75-3.75 1.48 1.48z"/>',
			viewBox: '0 0 12 16'
		}, {
			id: 'arrow-top',
			svg: '<path d="M5 3L0 9h3v4h4V9h3z"/>',
			viewBox: '0 0 10 16'
		}, {
			id: 'arrow-right',
			svg: '<path d="M10 8L4 3v3H0v4h4v3z"/>',
			viewBox: '0 0 10 16'
		}, {
			id: 'arrow-bottom',
			svg: '<path d="M7 7V3H3v4H0l5 6 5-6z"/>',
			viewBox: '0 0 10 16'
		}, {
			id: 'arrow-left',
			svg: '<path d="M6 3L0 8l6 5v-3h4V6H6z"/>',
			viewBox: '0 0 10 16'
		}, {
			id: 'chevron-top',
			svg: '<path d="M160 128l-160 160 64 64 96-96 96 96 64-64-160-160z"/>',
			viewBox: '0 0 320 512'
		}, {
			id: 'chevron-right',
			svg: '<path d="M64 96l-64 64 96 96-96 96 64 64 160-160-160-160z"/>',
			viewBox: '0 0 224 512'
		}, {
			id: 'chevron-bottom',
			svg: '<path d="M256 160l-96 96-96-96-64 64 160 160 160-160-64-64z"/>',
			viewBox: '0 0 320 512'
		}, {
			id: 'chevron-left',
			svg: '<path d="M224 160l-64-64-160 160 160 160 64-64-96-96 96-96z"/>',
			viewBox: '0 0 224 512'
		}, {
			id: 'done,check',
			svg: '<path d="M320 96l-192 192-64-64-64 64 128 128 256-256-64-64z"/>',
			viewBox: '0 0 384 512'
		}, {
			id: 'edit,pencil',
			svg: '<path d="M352 32l-64 64 96 96 64-64-96-96zM0 384l0.344 96.281 95.656-0.281 256-256-96-96-256 256zM96 448h-64v-64h32v32h32v32z"/>',
			viewBox: '0 0 448 512'
		}, {
			id: 'trash',
			svg: '<path d="M11 2H9c0-.55-.45-1-1-1H5c-.55 0-1 .45-1 1H2c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1v9c0 .55.45 1 1 1h7c.55 0 1-.45 1-1V5c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1zm-1 12H3V5h1v8h1V5h1v8h1V5h1v8h1V5h1v9zm1-10H2V3h9v1z"/>',
			viewBox: '0 0 12 16'
		}, {
			id: 'menu',
			svg: '<path d="M8 4v1H0V4h8zM0 8h8V7H0v1zm0 3h8v-1H0v1z"/>',
			viewBox: '0 0 8 16'
		}, {
			id: 'comment',
			svg: '<path d="M14 1H2c-.55 0-1 .45-1 1v8c0 .55.45 1 1 1h2v3.5L7.5 11H14c.55 0 1-.45 1-1V2c0-.55-.45-1-1-1zm0 9H7l-2 2v-2H2V2h12v8z"/>',
			viewBox: '0 0 16 16'
		}, {
			id: 'file',
			svg: '<path d="M6 5H2V4h4v1zM2 8h7V7H2v1zm0 2h7V9H2v1zm0 2h7v-1H2v1zm10-7.5V14c0 .55-.45 1-1 1H1c-.55 0-1-.45-1-1V2c0-.55.45-1 1-1h7.5L12 4.5zM11 5L8 2H1v12h10V5z"/>',
			viewBox: '0 0 12 16'
		}, {
			id: 'cog,gear',
			svg: '<path d="M14 8.77v-1.6l-1.94-.64-.45-1.09.88-1.84-1.13-1.13-1.81.91-1.09-.45-.69-1.92h-1.6l-.63 1.94-1.11.45-1.84-.88-1.13 1.13.91 1.81-.45 1.09L0 7.23v1.59l1.94.64.45 1.09-.88 1.84 1.13 1.13 1.81-.91 1.09.45.69 1.92h1.59l.63-1.94 1.11-.45 1.84.88 1.13-1.13-.92-1.81.47-1.09L14 8.75v.02zM7 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>',
			viewBox: '0 0 14 16'
		}, {
			id: 'link',
			svg: '<path d="M4 9h1v1H4c-1.5 0-3-1.69-3-3.5S2.55 3 4 3h4c1.45 0 3 1.69 3 3.5 0 1.41-.91 2.72-2 3.25V8.59c.58-.45 1-1.27 1-2.09C10 5.22 8.98 4 8 4H4c-.98 0-2 1.22-2 2.5S3 9 4 9zm9-3h-1v1h1c1 0 2 1.22 2 2.5S13.98 12 13 12H9c-.98 0-2-1.22-2-2.5 0-.83.42-1.64 1-2.09V6.25c-1.09.53-2 1.84-2 3.25C6 11.31 7.55 13 9 13h4c1.45 0 3-1.69 3-3.5S14.5 6 13 6z"/>',
			viewBox: '0 0 16 16'
		}, {
			id: 'link-external',
			svg: '<path d="M11 10h1v3c0 .55-.45 1-1 1H1c-.55 0-1-.45-1-1V3c0-.55.45-1 1-1h3v1H1v10h10v-3zM6 2l2.25 2.25L5 7.5 6.5 9l3.25-3.25L12 8V2H6z"/>',
			viewBox: '0 0 12 16'
		}, {
			id: 'mail',
			svg: '<path d="M0 4v8c0 .55.45 1 1 1h12c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1H1c-.55 0-1 .45-1 1zm13 0L7 9 1 4h12zM1 5.5l4 3-4 3v-6zM2 12l3.5-3L7 10.5 8.5 9l3.5 3H2zm11-.5l-4-3 4-3v6z"/>',
			viewBox: '0 0 14 16'
		}, {
			id: 'search',
			svg: '<path d="M15.7 13.3l-3.81-3.83A5.93 5.93 0 0 0 13 6c0-3.31-2.69-6-6-6S1 2.69 1 6s2.69 6 6 6c1.3 0 2.48-.41 3.47-1.11l3.83 3.81c.19.2.45.3.7.3.25 0 .52-.09.7-.3a.996.996 0 0 0 0-1.41v.01zM7 10.7c-2.59 0-4.7-2.11-4.7-4.7 0-2.59 2.11-4.7 4.7-4.7 2.59 0 4.7 2.11 4.7 4.7 0 2.59-2.11 4.7-4.7 4.7z"/>',
			viewBox: '0 0 16 16'
		}, {
			id: 'zap',
			svg: '<path d="M10 7H6l3-7-9 9h4l-3 7z"/>',
			viewBox: '0 0 10 16'
		}];

		this.add = icon => {
			icons.unshift(icon);
			return this;
		};

		this.$get = () => icons;
	}

	function uexIcon(uexIcons) {
		var icons = uexIcons;

		function idExists(ids, id) {
			var all = ids.split(',');
			for (var i = 0; i < all.length; i++) {
				if (all[i].trim() === id)
					return true;
			}
			return false;
		}

		function findIconById(id) {
			for (var i = 0; i < icons.length; i++) {
				var icon = icons[i];

				if (idExists(icon.id, id)) {
					return icon;
				}
			}
			throw new Error('uexIcon: "' + id + '" has not been found.');
		}

		function wrap(content, viewBox) {
			viewBox = viewBox || '0 0 512 512';
			return '<svg version="1.1" x="0px" y="0px" viewBox="' + viewBox + '">' + content + '</svg>';
		}

		return {
			restrict: 'EA',
			link: function ($scope, $element, $attrs) {
				var id, icon;
				if ($attrs.uexIcon) {
					id = $attrs.uexIcon;
				} else {
					id = $attrs.icon;
				}

				icon = findIconById(id);
				if (!icon.svg) {
					icon = findIconById(icon.ref);
				}

				var content = wrap(icon.svg, icon.viewBox || icon.viewbox);
				$element.empty();
				$element.append(content);
			}
		};
	}
})();
