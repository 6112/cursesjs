/**
 * Named constants for colors: COLOR_WHITE, COLOR_RED, COLOR_GREEN, etc.
 **/
var colors = {
  // COLOR_NAME: [NORMAL_COLOR, BOLD_COLOR]
  WHITE: [0xA8A8A8, 0xFCFCFC],
  RED: [0xA80000, 0xFC5454],
  GREEN: [0x00A800, 0x54FC54],
  YELLOW: [0xA8A800, 0xFCFC54],
  BLUE: [0x0000A8, 0x5454FC],
  MAGENTA: [0xA800A8, 0xFC54FC],
  CYAN: [0x00A8A8, 0x54FCFC],
  BLACK: [0x000000, 0x545454]
};

var construct_color_table = function() {
  for (var k in colors) {
    exports['COLOR_' + k] = colors[k];
  }
};
construct_color_table();

/**
 * Use this as a flag for attron(), attroff(), and attrset().
 *
 * Returns a bit mask that corresponds to the attribute for a given color pair.
 * Color pairs are defined as a (foreground,background) pair of colors using
 * the init_pair() function.
 *
 * Color pair 0 is always the default colors.
 *
 * @param {Integer} n The index of the color pair to use.
 * @return {Attrlist} Attribute that corresponds to color pair n.
 **/
var COLOR_PAIR = exports.COLOR_PAIR = function(n) {
  return n * 0x100;
};

// used for only getting the 'color pair' part of an attrlist
var COLOR_MASK = 0xFFFF;

// used for getting the number (n the 0 to COLOR_PAIRS range) of a color
// pair, from an attrlist
var pair_number = function(n) {
  return (n & COLOR_MASK) >> 8;
};

// table of color pairs used for the application
// TODO: have a separate one for each screen_t instance
var color_pairs = {
  0: { // default color pair
    fg: exports.COLOR_WHITE,
    bg: exports.COLOR_BLACK
  }
};

/**
 * Initialize a color pair so it can be used with COLOR_PAIR to describe a
 * given (foreground,background) pair of colours.
 *
 * Color pair 0 is always the default colors.
 *
 * Example:
 *     // define these colors for the rest of the program
 *     init_pair(1, COLOR_RED, COLOR_GREEN);
 *     init_pair(2, COLOR_GREEN, COLOR_RED);
 *     // red foreground, green background
 *     addstr(10, 10, "it's a christmas", COLOR_PAIR(1));
 *     // green foreground, red background
 *     addstr(11, 10, "miracle!", COLOR_PAIR(2));
 *
 * @param {Integer} pair_index Index for the pair to be created.
 * @param {String} foreground Foreground color to be used; must be supported by
 *   the canvas element.
 * @param {String} background Background color to be used; must be supported by
 *   the canvas element.
 **/
var init_pair = exports.init_pair = function(pair_index,
                                            foreground, background) {
  color_pairs[pair_index] = {
    fg: foreground,
    bg: background
  };
};

/**
 * Define a color for use with init_pair(). Use this function at the beginning
 * of your program to replace the default colors in js-curses, or define new
 * colors.
 *
 * Example:
 *     initscr(...);
 *     // COLOR_BLUE now means red (not bold) or pink (bold)
 *     define_color(COLOR_BLUE, 0xFF0000, 0xFF8888);
 *     init_pair(1, COLOR_BLUE, COLOR_BLACK);
 *     // write something in pink
 *     addstr(10, 10, "hello pink!", COLOR_PAIR(1) | A_BOLD);
 *     // define a new color, and call it COLOR_OCHRE
 *     var COLOR_OCHRE = define_color(null, 0xCC7722);
 *     init_pair(2, COLOR_OCHRE, COLOR_BLACK);
 *     // write something in ochre
 *     addstr(11, 10, "hello ochre!", COLOR_PAIR(2));
 *
 * @param {Color|Array[Integer]} [color_name=[]] Color to be modified. This can be a
 * built-in color (COLOR_RED, COLOR_BLUE, etc.) or any array, that will be
 * modified in-place to be a pair that describes the color. If unspecified, a
 * new array will be created to represent the pair.
 * @param {Integer} normal_color Hex color for the color that non-bold text
 * should have if affected by this color.
 * @param {Integer} [bold_color=normal_color] Hex color for the color that bold
 * text should have if affected by this color.
 * @return {Array} An array describing the normal color, and the bold color, for
 * the defined color.
 **/
var define_color = exports.define_color = function(color, normal_color,
						   bold_color) {
  if (! color) {
    color = [];
  }
  if (! bold_color) {
    bold_color = normal_color;
  }
  color[0] = normal_color;
  color[1] = bold_color;
  return color;
};
