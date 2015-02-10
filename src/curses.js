"use strict()";

// functions, variables, etc. that should be exported, will be exported in the
// `exports` object (by default, the global namespace)
var exports = window;

// milliseconds between cursor blinks
var BLINK_DELAY = 500;

// default value for the character on 'empty' space
var EMPTY_CHAR = ' ';

/**
 * Named constants for colors: COLOR_WHITE, COLOR_RED, COLOR_GREEN, etc.
 **/
var colors = {
  WHITE: '#CCCCCC',
  RED: '#CC4444',
  GREEN: '#44CC44',
  YELLOW: '#CCCC44',
  BLUE: '#4444CC',
  MAGENTA: '#CC44CC',
  CYAN: '#44CCCC',
  BLACK: '#222222'
};

var construct_color_table = function() {
  for (var k in colors) {
    exports['COLOR_' + k] = colors[k];
  }
};
construct_color_table();

// default window: will be used as a default object for all curses functions,
// such as print(), addch(), move(), etc., if called directly instead of using
// scr.print(), scr.addch(), scr.move(), etc.
var default_screen = null;

// curses window
// TODO: implement creating other windows, sub-wdinows (not just the global 
// 'stdscr' window)
var window_t = function() {
  // cursor position
  this.y = 0;
  this.x = 0;
  // window position
  this.win_y = 0;
  this.win_x = 0;
  // width and height, in characters
  this.width = 0;
  this.height = 0;
  // parent window, if any
  this.parent = null;
  // 2-D array for tiles (see tile_t)
  this.tiles = [];
  // character used for filling empty tiles
  // TODO: implement empty characters
  this.empty_char = EMPTY_CHAR;
  // current attributes (bold, italics, color, etc.) being used for text that
  // is being added
  this.current_attrs = A_NORMAL | COLOR_PAIR(0);
  // map of changes since last refresh: maps a [y,x] pair to a 'change' object
  // that describes what new 'value' a character should have
  this.changes = {};
  // list of subwindows that exist
  this.subwindows = [];
};

// curses screen display; can contain subwindows
var screen_t = function() {
  window_t.call(this);
  // font used for rendering
  this.font = {
    name: 'monospace',
    size: 12,
    char_width: -1,
    char_height: -1
  };
  // default values for some input flags
  this._echo = false;   // do not print all keyboard input
  this._raw = false; // allow Ctl+<char> to be used for normal things, like
                        // copy/paste, select all, etc., and allow browser
                        // keyboard shortcuts
  this._blink = true;   // make the cursor blink
  this._blinkTimeout = 0;
  // wrapper element
  this.container = null;
  // canvas and its rendering context
  this.canvas = null;
  this.context = null;
  // maps a character (and its attributes) to an already-drawn character
  // on a small canvas. this allows very fast rendering, but makes the
  // application use more memory to save all the characters
  this.char_cache = {};
  this.offscreen_canvases = [];
  this.offscreen_canvas_index = 0;
  // event listeners
  this.listeners = {
    keydown: []
  };
};

// tile on a window, used for keeping track of each character's state on the
// screen
var tile_t = function() {
  // true iff this tile has no content
  this.empty = true;
  // content character
  this.content = EMPTY_CHAR;
  // attributes (bold, italics, color, etc.)
  this.attrs = A_NORMAL | COLOR_PAIR(0);
  // true iff this tile is not hidden by a subwindow that is "over" it
  this.exposed = true;
};
