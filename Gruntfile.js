/*
 * Use for automating compilation tasks. You need to install the package
 * `grunt-cli` using npm in order to use this Gruntfile.
 *
 *     # npm install -g grunt-cli
 *
 * You can then recompile and run JSHint (a tool for checking for common
 * programming mistakes) on the code by simply running:
 *
 *     $ grunt
 *
 * You can also recompile & JSHint automatically everytime a file changes by
 * doing:
 *
 *     $ grunt watch
 */
module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      options: {
        // wrap the ouptut with (function(){...})(); so that package-local
        // functions/variables are actually local to the package
	banner: '(function() {\n',
	separator: '\n\n', // for better human-readability
	footer: '\n})();'
      },
      dist: {
        // files to compile into a single JavaScript file located in dist/.
        // order is important, because some functions are defined in a file,
        // but used in another
	src: [
	  'src/curses.js',
	  'src/decorators.js',
	  'src/color.js',
	  'src/attrs.js',
          'src/keyboard.js',
	  'src/screen.js',
	  'src/functions.js',
	  'src/draw.js',
          'src/window.js',
	  'src/event.js'
	],
	dest: 'dist/js-curses.js'
      }
    },
    jshint: {
      // files to check for common programming errors
      files: ['Gruntfile.js', 'src/**/*.js', 'dist/**/*.js'],
      options: {
        // global variables that do not yield warnings for being used without
        // being defined
	globals: {
	  '$': true,
          jQuery: true,
	  console: true,
	  window: true,
	  document: true
	}
      }
    },
    watch: {
      // run a command everytime one of the source files in src/ changes
      files: ['src/**/*.js'],
      // what to do: concatenate into dist/, and run JSHint
      tasks: ['concat', 'jshint']
    }
  });

  // grunt concat
  grunt.loadNpmTasks('grunt-contrib-concat');

  // grunt jshint
  grunt.loadNpmTasks('grunt-contrib-jshint');

  // grunt watch
  grunt.loadNpmTasks('grunt-contrib-watch');

  // default task: concatenate into dist/, and run JSHint
  grunt.registerTask('default', ['concat', 'jshint']);
};
