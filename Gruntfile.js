module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		concat: {
			options: {
				banner: '(function() {\n',
				separator: '\n\n',
				footer: '\n})();'
			},
			dist: {
				src: [
					'src/curses.js',
					'src/decorators.js',
					'src/attrs.js',
					'src/screen.js',
					'src/functions.js',
					'src/draw.js',
					'src/event.js'
				],
				dest: 'dist/js-curses.js'
			}
		},
		jshint: {
			files: ['Gruntfile.js', 'src/**/*.js', 'dist/**/*.js'],
			options: {
				globals: {
					'$': true,
					console: true,
					window: true,
					document: true
				}
			}
		},
		watch: {
			files: ['src/**/*.js'],
		 	tasks: ['concat', 'jshint']
		}
	});

	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-watch');

	grunt.registerTask('default', ['concat', 'jshint']);
};
