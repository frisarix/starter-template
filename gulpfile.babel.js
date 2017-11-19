import gulp    from 'gulp';
import plugins from 'gulp-load-plugins';
import browser from 'browser-sync';
import yargs   from 'yargs';
import rimraf  from 'rimraf';

browser.create();

const $ = plugins({
	pattern: '*'
});



// Look for the --production flag
const PRODUCTION = !!(yargs.argv.production);

// Build the "dist" folder by running all of the below tasks
gulp.task('build', 
	gulp.series(clean, gulp.parallel(pages, sass, js, images, spritePng, libs)));

// Build, run the server, and watch for file changes
gulp.task('default',
	gulp.series('build', gulp.parallel(server, watch)));

// Delete the "dist" folder
export function clean(done) {
	rimraf('dist', done);
}

// Copy HTML files
function pages() {
	return gulp.src('app/pages/**/*.html')
		.pipe($.if(PRODUCTION, $.htmlReplace({
			css: '/css/common.min.css',
			js:  '/js/common.min.js'
		})))
		.pipe(gulp.dest('dist'));
}

// Compile Sass into CSS
function sass() {
	return gulp.src('app/**/*.scss')
		.pipe($.plumber())
		.pipe($.if(!PRODUCTION, $.sourcemaps.init()))
		.pipe($.sass()).on('error', $.sass.logError)
		.pipe($.autoprefixer())
		.pipe($.if(!PRODUCTION, $.sourcemaps.write()))
		.pipe(gulp.dest('dist/css'))
		.pipe($.if(!PRODUCTION, browser.stream()))
		.pipe($.if(PRODUCTION, $.cleanCss()))
		.pipe($.if(PRODUCTION, $.rename({ suffix: '.min' })))
		.pipe($.if(PRODUCTION, gulp.dest('dist/css')));
}

// Compile and transpile JS
export function js() {
	return gulp.src('app/**/*.js')
		.pipe($.plumber())
		.pipe($.if(!PRODUCTION, $.sourcemaps.init()))
		.pipe($.rollup({
			input: 'app/common.js',
			format: 'iife'
		}))
		.pipe($.babel({
			presets: ['es2015']
		}))
		.pipe($.if(!PRODUCTION, $.sourcemaps.write()))
		.pipe(gulp.dest('dist/js'))
		.pipe($.if(PRODUCTION, $.uglify()))
		.pipe($.if(PRODUCTION, $.rename({ suffix: '.min' })))
		.pipe($.if(PRODUCTION, gulp.dest('dist/js')));
}

// Copy and compress images
export function images() {
	return gulp.src(['app/**/*.{jpg,png,svg}', '!app/**/*-s.png'])
		.pipe($.rename({ dirname: '' }))
		.pipe($.newer('dist/img'))
		.pipe($.imagemin([
	        $.imagemin.gifsicle({interlaced: true}),
	        $.imageminJpegRecompress({
	            progressive: true,
	            max: 80,
	            min: 70
	        }),
	        $.imageminPngquant({quality: '75-85'}),
	        $.imagemin.svgo({plugins: [{removeViewBox: false}]})
	    ]))
		.pipe(gulp.dest('dist/img'));
}

// Create PNG sprite
export function spritePng() {
	return gulp.src('app/**/*-s.png')
		.pipe($.spritesmith({
			imgName: 'sprite.png',
			cssName: '_sprite.scss'
		}))
		.pipe(gulp.dest('app/common.blocks/icon'));
}

// Copy libs
export function libs() {
	const f = {
		css: $.filter('**/*.css', { restore: true }),
		js:  $.filter('**/*.js', { restore: true })
	}

	return gulp.src($.mainBowerFiles())
		.pipe(f.css)
		.pipe($.concat('libs.min.css'))
		.pipe($.cleanCss({
			level: {
				1: {
					specialComments: false
				}
			}
		}))
		.pipe(gulp.dest('dist/css'))
		.pipe(f.css.restore)
		.pipe(f.js)
		.pipe($.concat('libs.min.js'))
		.pipe($.uglify())
		.pipe(gulp.dest('dist/js'));
}

// Start a server with LiveReload 
function server() {
	browser.init({
		server: 'dist'
	});
}

// Watch for file changes
function watch() {
	gulp.watch('app/pages/**/*.html').on('all', gulp.series(pages, browser.reload));
	gulp.watch('app/**/*.scss', gulp.series(sass));
	gulp.watch('bower.json').on('all', gulp.series(libs, browser.reload));
	gulp.watch('app/**/*.js').on('all', gulp.series(js, browser.reload));
	gulp.watch(['app/**/*.{jpg,png,svg}', '!app/**/*-s.png'], gulp.series(images));
	gulp.watch('app/**/*-s.png', gulp.series(spritePng, images));
}