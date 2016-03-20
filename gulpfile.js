var gulp = require('gulp');
var Server = require('karma').Server;
var concat = require('gulp-concat');
var insert = require('gulp-insert');
var cssmin = require('gulp-cssmin');
var sass = require('gulp-sass');
var sassGlob = require('gulp-sass-glob');
var ngAnnotate = require('gulp-ng-annotate');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var watch = require('gulp-watch');
var ejs = require("gulp-ejs");
var webserver = require('gulp-webserver');

var jsSrc = ['src/core/**/*.js', 'src/components/*/*.js', '!src/components/*/*.spec.js'],
	sassSrc = ['src/core/core.scss', 'src/components/*/*.scss'];

function compileJs(dir) {
	return gulp
		.src(jsSrc)
		.pipe(concat('ng-mr-uex.js'))
		.pipe(insert.wrap('(function (window, angular, $, undefined) {\n', '\n})(window, window.angular, window.jQuery);'))
		.pipe(gulp.dest(dir))
		.pipe(ngAnnotate())
		.pipe(uglify())
		.pipe(rename({
			suffix: '.min'
		}))
		.pipe(gulp.dest(dir));
}

function compileCss(dir) {
	return gulp
		.src('src/core/core.scss')
		.pipe(sassGlob())
		.pipe(sass())
		.pipe(concat('ng-mr-uex.css'))
		.pipe(gulp.dest(dir))
		.pipe(cssmin())
		.pipe(concat('ng-mr-uex.min.css'))
		.pipe(gulp.dest(dir));
}

gulp.task('build:js', function () {
	return compileJs('dist-temp');
});

gulp.task('build:css', function () {
	return compileCss('dist-temp');
});

gulp.task('build', ['build:js', 'build:css']);

gulp.task('dist:js', function () {
	return compileJs('dist');
});

gulp.task('dist:css', function () {
	return compileCss('dist');
});

gulp.task('dist', ['dist:js', 'dist:css']);

gulp.task('test', ['build'], function () {
	var server = new Server({
		configFile: __dirname + '/karma.conf.js',
		singleRun: true
	});
	server.start();
});

gulp.task('default', ['build', 'test']);

gulp.task('webserver', function () {
	watch(['src/demo/*', 'src/components/*/demo/*'], function () {
		gulp.start('build:demo');
	});
	gulp.src('.')
		.pipe(webserver({
			livereload: true,
			fallback: 'demo/demo.html',
			port: '64123',
			open: true
		}));
});

gulp.task('build:demo', function () {
	var components = [];

	gulp.src(['src/demo/layout.scss', 'src/components/*/demo/demo.scss'])
		.pipe(sassGlob())
		.pipe(sass())
		.pipe(concat('demo.css'))
		.pipe(gulp.dest('demo/'));

	gulp.src(['src/demo/app.js', 'src/components/*/demo/demo.js'])
		.pipe(concat('demo.js'))
		.pipe(insert.wrap('(function (window, angular, $, undefined) {\n', '\n})(window, window.angular, window.jQuery);'))
		.pipe(gulp.dest('demo/'));

	gulp.src('src/components/*/demo/demo.html')
		.pipe(insert.transform(function (contents, file) {
			contents = contents.replace(/\r?\n|\r/g, ""); // Remove newlines.
			contents = contents.replace(/[\\$'"]/g, "\\$&"); // Escape quotes.
			//contents = contents.replace(/<\/script>/g, '<\\/script>');
			return contents;
		}))
		.on('data', function (data) {
			var path = data.path.replace(/\\/g, '/');
			var name = /src\/components\/(.+)\/demo\/demo.html/.exec(path)[1];
			components.push({
				name: name,
				html: data.contents
			});
		})
		.on('end', function () {
			console.log('demo components being built: ' + components.length);
			gulp.src("src/demo/layout.html")
				.pipe(ejs({
					components: components
				}))
				.pipe(rename('demo.html'))
				.pipe(gulp.dest("demo/"));
		});
});

gulp.task('watch', function () {
	var src = jsSrc.concat(sassSrc);
	watch(src, function () {
		gulp.start('build');
	});
});
