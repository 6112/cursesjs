"use strict()";

// functions, variables, etc. that should be exported
var exports = window;

// milliseconds between cursor blinks
var BLINK_DELAY = 500;

// default value for the character on 'empty' space
var EMPTY_CHAR = ' ';

// named constants for keys:
// 
// populates the 'exports' namespace with constants for commonly-used keycodes
//
// includes all the keys in the following table, with names prefixed with
// 'KEY_' (e.g. KEY_LEFT, KEY_ESC, etc.)
//
// also, there is an entry for each letter of the alphabet (e.g. KEY_A,
// KEY_B, KEY_C, etc.)
var keys = {
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  ESC: 27,
  TAB: 9,
  BACKSPACE: 8,
  HOME: 36,
  END: 35,
  ENTER: 13,
  PAGE_UP: 33,
  PAGE_DOWN: 34
};
var k;
for (k in keys) {
  exports['KEY_' + k] = keys[k];
}
for (k = 'A'.charCodeAt(0); k <= 'Z'.charCodeAt(0); k++) {
  var c = String.fromCharCode(k);
  exports['KEY_' + c] = k;
}

// named constants for colors (COLOR_WHITE, COLOR_RED, etc.)
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
for (k in colors) {
  exports['COLOR_' + k] = colors[k];
}

// default window: will be used as a default object for all curses functions,
// such as print(), addch(), move(), etc., if called directly instead of using
// win.print(), win.addch(), win.move(), etc.
var default_window = null;

// number of chars saved per off-screen canvas
var CHARS_PER_CANVAS = 256;

// curses window
// TODO: implement creating other windows, sub-wdinows (not just the global 
// 'stdscr' window)
var window_t = function() {
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
  // cursor position
  this.y = 0;
  this.x = 0;
  // width and height, in characters
  this.width = 0;
  this.height = 0;
  // 2-D array for tiles (see tile_t)
  this.tiles = [];
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
  // map of changes since last refresh: maps a [y,x] pair to a 'change' object
  // that describes what new 'value' a character should have
  this.changes = {};
  // event listeners
  this.listeners = {
    keydown: []
  };
  // character used for filling empty tiles
  // TODO: implement empty characters
  this.empty_char = EMPTY_CHAR;
  // current attributes (bold, italics, color, etc.) being used for text that
  // is being added
  this.current_attrs = A_NORMAL | COLOR_PAIR(0);
};

// tile on a window, used for keeping track of each character's state on the
// screen
var tile_t = function() {
  // true iff this tile has no content
  this.empty = true;
  // JQuery element associated to this tile
  this.element = null;
  // content character
  this.content = ' ';
  // attributes (bold, italics, color, etc.)
  this.attrs = A_NORMAL | COLOR_PAIR(0);
};