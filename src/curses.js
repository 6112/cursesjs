"use strict()";

// functions, variables, etc. that should be exported, will be exported in the
// `exports` object (by default, the global namespace)
var exports = window;

/**
 * Standard 'screen' object, used as a default for most operations.
 */
exports.stdscr = null;

// milliseconds between cursor blinks
var BLINK_DELAY = 200;

// default value for the character on 'empty' space
var EMPTY_CHAR = ' ';

// default window: will be used as a default object for all curses functions,
// such as print(), addch(), move(), etc., if called directly instead of using
// scr.print(), scr.addch(), scr.move(), etc. (same as stdscr, but internal)
// TODO: replace default_screen with exports.stdscr in code
var default_screen = null;

// curses window
var window_t = function(parent_screen) {
  // cursor position
  this.y = 0;
  this.x = 0;
  // cursor position at last refresh() call
  this.previous_y = 0;
  this.previous_x = 0;
  // window position
  this.win_y = 0;
  this.win_x = 0;
  // true iff vertical scrolling is enabled
  this._scroll_ok = false;
  // width and height, in characters
  this.width = 0;
  this.height = 0;
  // parent window, if any
  this.parent = null;
  // parent screen, or this if this is a screen
  this.parent_screen = parent_screen;
  // 2-D array for tiles (see tile_t)
  this.tiles = [];
  // character used for filling empty tiles
  // TODO: implement empty characters
  this.empty_char = EMPTY_CHAR;
  this.empty_attrs = A_NORMAL | COLOR_PAIR(0);
  // current attributes (bold, italics, color, etc.) being used for text that
  // is being added
  this.attrs = A_NORMAL | COLOR_PAIR(0);
  // list of subwindows that exist
  this.subwindows = [];
};

// curses screen display; can contain subwindows
var screen_t = function() {
  // "soft" inherit window_t
  window_t.call(this, this);
  // font used for rendering
  // TODO: support a default font
  this.font = {
    type: 'ttf',
    name: 'monospace',
    size: 12,
    char_width: -1,
    char_height: -1,
    line_spacing: 0,
    use_bold: true,
    use_char_cache: true
  };
  // default values for some input flags
  this._echo = false;   // do not print all keyboard input
  this._raw = false;    // allow Ctl+<char> to be used for normal things, like
                        // copy/paste, select all, etc., and allow browser
                        // keyboard shortcuts
  this._blink = true;   // make the cursor blink
  this._blink_timeout = 0;
  this._cursor_visibility = 2;
  // wrapper element
  this.container = null;
  // canvas and its rendering context
  this.canvas = null;
  this.context = null;
  // actual characters currently displayed on-screen, taking into account any
  // possible overlapping windows.
  this.display = [];
  // maps a character (and its attributes) to an already-drawn character
  // on a small canvas. this allows very fast rendering, but makes the
  // application use more memory to save all the characters
  this.char_cache = {};
  this.canvas_pool = {
    normal: {
      x: 0,
      canvases: []
    },
    bold: {
      x: 0,
      canvases: []
    }
  };
  // event listeners
  this.listeners = {
    keydown: []
  };
  // true iff the mouse is currently held down
  this._mouse_down = false;
  // current mouse coordinates, as characters
  this._mouse_y = 0;
  this._mouse_x = 0;
  // queue for mouse events
  this._mevents = [];
  // mask for enabled mouse events
  this._mousemask = 0;
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
};
