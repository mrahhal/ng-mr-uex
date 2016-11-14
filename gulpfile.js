var gulp = require('gulp');
var Server = require('karma').Server;
var concat = require('gulp-concat');
var insert = require('gulp-insert');
var cssmin = require('gulp-cssmin');
var sass = require('gulp-sass');
var sassGlob = require('gulp-sass-glob');
var babel = require("gulp-babel");
var ngAnnotate = require('gulp-ng-annotate');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var watch = require('gulp-watch');
var ejs = require("gulp-ejs");
var webserver = require('gulp-webserver');
var sourcemaps = require('gulp-sourcemaps');
var autoprefixer = require('gulp-autoprefixer');

var jsSrc = ['src/core/**/*.js', 'src/components/*/*.js', '!src/components/*/*.spec.js'],
	sassSrc = ['src/core/core.scss', 'src/core/sass/**/*.scss', 'src/components/*/*.scss'];

function compileJs(dir) {
	return gulp
		.src(jsSrc)
		.pipe(sourcemaps.init())
		.pipe(concat('ng-mr-uex.js'))
		.pipe(sourcemaps.write({ sourceRoot: '/components' }))
		.pipe(gulp.dest(dir))
		.pipe(babel())
		.pipe(ngAnnotate())
		.pipe(uglify())
		.pipe(rename({ suffix: '.min' }))
		.pipe(gulp.dest(dir));
}

function compileCss(dir) {
	return gulp
		.src('src/core/core.scss')
		.pipe(sourcemaps.init())
		.pipe(sass())
		.pipe(concat('ng-mr-uex.css'))
		.pipe(autoprefixer())
		.pipe(sourcemaps.write({ sourceRoot: '/components' }))
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

gulp.task('build:demo', function () {
	var components = [];

	gulp.src(['src/demo/layout.scss'])
		.pipe(sassGlob())
		.pipe(sourcemaps.init())
		.pipe(concat('demo.css'))
		.pipe(sass())
		.pipe(sourcemaps.write({ sourceRoot: '/components' }))
		.pipe(gulp.dest('demo/'));

	gulp.src(['src/demo/app.js', 'src/components/*/demo/**/*.js'])
		.pipe(sourcemaps.init())
		.pipe(concat('demo.js'))
		.pipe(babel())
		.pipe(sourcemaps.write({ sourceRoot: '/components' }))
		.pipe(gulp.dest('demo/'));

	gulp.src('src/components/*/demo/demo.html')
		.pipe(insert.transform(function (contents, file) {
			return escapeContent(contents);
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

gulp.task('watch:js', function () {
	watch(jsSrc, () => gulp.start('build:js'));
});

gulp.task('watch:css', function () {
	watch(sassSrc, () => gulp.start('build:css'));
});

gulp.task('watch', ['watch:js', 'watch:css']);

gulp.task('watch:demo', function () {
	var srcFiles = [
		'src/demo/*',
		'src/components/*/demo/**/*'
	];
	srcFiles = srcFiles.concat(sassSrc);
	watch(srcFiles, () => gulp.start('build:demo'));
});

gulp.task('webserver', function () {
	gulp.start('watch:js'); // css will be built when building the demo
	gulp.start('watch:demo');

	gulp.src('.')
		.pipe(webserver({
			livereload: true,
			fallback: 'demo/demo.html',
			port: '64123',
			open: true
		}));
});

//------------------------------------------------------------------------------

function escapeContent(content) {
	return content
		.replace(/[\r\n]/g, ' ') // Collapse newlines
		.replace(/[ \t]+/g, ' ') // Collapse whitespace
		.replace(/[\\']/g, '\\$&'); // Escape
}
