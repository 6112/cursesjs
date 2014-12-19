(function() {
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

// when called with a function, return that function, wrapped so that
// it can be used directly by being applied on `default_window'.
//
// i.e., the call:
//   default_window.addstr('hello world');
//
// can be shortened to:
//   addstr('hello world');
//
// if you define:
//   addstr = simplify(window_t.prototype.addstr);
// when called with function name `function_name' that is defined in
// window_t.prototype, will create a function with the same name in `exports'
// that calls this function using `default_window'
var simplify = function(f) {
  return function() {
    return f.apply(default_window, arguments);
  };
};

// similar to simplify, but convert the call so it can be done as in C with
// ncurses.
//
// for instance, the call:
//   win.addstr('hello world');
//
// can be rewritten:
//   waddstr(win, 'hello world');
//
// if you define:
//   waddstr = generalize(f);
var generalize = function(f) {
  return function() {
    return f.apply(arguments, [].slice.call(arguments, 1));
  };
};

// similar to simplify, but instead of allowing to call without supplying a
// `window_t' object, allows calling by supplying a position for inserting
// text.
//
// for instance, the function call:
//   win.addstr(10, 10, 'hello world');
//
// will expand to:
//   win.move(10, 10);
//   win.addstr('hello world');
//
// if you define:
//   window_t.prototype.addstr = shortcut_move(window_t.prototype.addstr);
var shortcut_move = function(f) {
  return function(y, x) {
    var args = arguments;
    if (typeof y === "number" && typeof x === "number") {
      this.move(y, x);
      args = [].slice.call(arguments, 2);
    }
    return f.apply(this, args);
  };
};

// similar to simplify, but allows the caller to specify text attributes
// (as per attron() and attroff()) as the last argument to the call.
// 
// for instance, the function call:
//   win.addstr('hello world', A_BOLD | COLOR_PAIR(3));
//
// will expand to:
//   win.attron(A_BOLD | COLOR_PAIR(3));
//   win.addstr('hello world');
//   win.attroff(A_BOLD | COLOR_PAIR(3));
//
// if you define:
//   window_t.prototype.addstr = attributify(window_t.prototype.addstr);
var attributify = function(f) {
  return function() {
    var args = arguments;
    var attrs = null;
    if (arguments.length !== 0) {
      attrs = arguments[arguments.length - 1];
      if (typeof attrs === "number") {
        args = [].slice.call(arguments, 0, arguments.length - 1);
        this.attron(attrs);
      }
    }
    var return_value = f.apply(this, args);
    if (typeof attrs === "number") {
      this.attroff(attrs);
    }
    return return_value;
  };
};


// flags used for attron(), attroff(), and attrset()
//
// these correspond to CSS classes: .a-standout for A_STANDOUT,
// .a-underline for A_UNDERLINE, etc.
//
// A_NORMAL has no associated CSS class (it is the default style)
var A_NORMAL = exports.A_NORMAL = 0;
var A_STANDOUT = exports.A_STANDOUT = 0x10000;
var A_UNDERLINE = exports.A_UNDERLINE = A_STANDOUT << 1;
var A_REVERSE = exports.A_REVERSE = A_STANDOUT << 2;
var A_BLINK = exports.A_BLINK = A_STANDOUT << 3;
var A_DIM = exports.A_DIM = A_STANDOUT << 4;
var A_BOLD = exports.A_BOLD = A_STANDOUT << 5;

// used as a flag for attron(), attroff(), and attrset()
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
var color_pairs = {
  0: {
    fg: exports.COLOR_WHITE,
    bg: exports.COLOR_BLACK
  }
};

// initialize a color pair so it can be used with COLOR_PAIR(n) to describe
// a given (fg,bg) pair of colors.
var init_pair = exports.init_pair = function(pair_index,
                                            foreground, background) {
  color_pairs[pair_index] = {
    fg: foreground,
    bg: background
  };
};


// force the text attributes to a new value, resetting any previous values
window_t.prototype.attrset = function(attrs) {
  this.attrs = attrs;
};
exports.attrset = simplify(window_t.prototype.attrset);

// turn an attribute (or multiple attributes, using a binary OR) on.
//
// e.g.:
//   attron(A_BOLD | A_REVERSE | COLOR_PAIR(3));
window_t.prototype.attron = function(attrs) {
  var color_pair = attrs & COLOR_MASK;
  if (color_pair === 0) {
    color_pair = this.attrs & COLOR_MASK;
  }
  var other_attrs = ((attrs >> 16) << 16);
  other_attrs = other_attrs | ((this.attrs >> 16) << 16);
  var new_attrs = other_attrs | color_pair;
  this.attrset(new_attrs);
};
exports.attron = simplify(window_t.prototype.attron);

// turn an attribute (or multiple attributes, using a binary OR) off.
//
// e.g.:
//   attroff(A_BOLD | A_REVERSE);
window_t.prototype.attroff = function(attrs) {
  var color_pair = this.attrs & COLOR_MASK;
  var new_attrs = ((attrs >> 16) << 16);
  new_attrs = ~new_attrs & this.attrs;
  if (attrs & COLOR_MASK) {
    new_attrs = new_attrs & ~COLOR_MASK;
  }
  this.attrset(new_attrs);
};
exports.attroff = simplify(window_t.prototype.attroff);


// creates a new window, sets it as the default window, and returns it
//
// if `require_focus' is true, don't grab keyboard events for the whole page:
// only when the element is focused will it actually register keyboard events.
var initscr = exports.initscr = function(container, height, width,
                                         font_name, font_size,
                                         require_focus) {
  if (typeof height !== "number") {
    throw new TypeError("height is not a number");
  }
  if (height < 0) {
    throw new RangeError("height is negative");
  }
  if (typeof width !== "number") {
    throw new TypeError("width is not a number");
  }
  if (width < 0) {
    throw new RangeError("width is negative");
  }
  // `container' can either be a DOM element, or an ID for a DOM element
  if (container !== undefined) {
    container = $(container);
  }
  else {
    container = $('<pre></pre>');
  }
  // clear the container
  container.html('');
  // create a new window_t object
  var win = new window_t();
  win.container = container;
  // set the height, in characters
  win.height = height;
  win.width = width;
  // create the canvas
  win.canvas = $('<canvas></canvas>');
  win.container.append(win.canvas);
  win.context = win.canvas[0].getContext('2d');
  // load the font
  win.loadfont(font_name, font_size);
  // initialize the character tiles to default values
  var y, x;
  for (y = 0; y < height; y++) {
    win.tiles[y] = [];
    for (x = 0; x < width; x++) {
      win.tiles[y][x] = new tile_t();
    }
  }
  // set the created window as the default window for most operations
  // (so you can call functions like addstr(), getch(), etc. directly)
  default_window = win;
  // draw a background
  win.clear();
  // grab keyboard events for the whole page, or the container, depending
  // on the require_focus argument
  var keyboard_target = require_focus ? container : $('body');
  if (require_focus) {
    // apply tabindex="0" so this element can actually receive focus
    container.attr('tabindex', 0);
  }
  keyboard_target.keydown(function(event) {
    if (is_key_press(event)) {
      win.trigger('keydown', event.which, event, win);
    }
    // disable most browser shortcuts if the _raw flag is on for the window
    return ! win._raw;
  });
  // make a blinking cursor
  // TODO: reimplement blinking
  // startBlink(win);
  // return the created window
  return win;
};

// disable most browser shortcuts, allowing your application to use things
// like Ctrl+C and Ctrl+A as keybindings within the application
window_t.prototype.raw = function() {
  this._raw = true;
};
exports.raw = simplify(window_t.prototype.raw);

// enable most browser shortcuts, see raw()
window_t.prototype.noraw = function() {
  this._raw = false;
};
exports.noraw = simplify(window_t.prototype.nowraw);

// make the cursor blink, and show it
// TODO
window_t.prototype.blink = function() {
  if (! this._blink) {
    startBlink(this);
  }
  this._blink = true;
};
exports.blink = simplify(window_t.prototype.blink);

// stop the cursor from blinking
// TODO
window_t.prototype.noblink = function() {
  if (this._blink) {
    this.tiles[this.y][this.x].element.addClass('a-reverse');
    clearTimeout(this._blinkTimeout);
    this._blinkTimeout = 0;
  }
  this._blink = false;
};
exports.noblink = simplify(window_t.prototype.noblink);

// make everything typed by the user be printed inside the console
var echo = exports.echo = function() {
  // TODO: implement echo behavior
  this._echo = true;
};

// make everything typed by the user *not* be printed inside the console
var noecho = exports.noecho = function() {
  this._echo = false;
};

// dummy call for old-school curses programming
var keypad = exports.keypad = function() {};

// stop running js-curses. 
//
// TODO: implement this function.
window_t.prototype.endwin = function() {
};
exports.endwin = simplify(window_t.prototype.endwin);

// keys that are to be ignored for the purposes of events
// TODO
var ignoreKeys = {
  Control: true,
  Shift: true,
  Alt: true,
  AltGraph: true,
  Unidentified: true
};

// return true iff the KeyboardEvent `event' is an actual keypress of a
// printable character, not just a modifier key (like Ctrl, Shift, or Alt)
var is_key_press = function(event) {
  // TODO
  return ! ignoreKeys[event.key];
};

// used for making a blinking cursor
// TODO: rewrite for canvas
var startBlink = function(win) {
  var do_blink = function() {
    win.tiles[win.y][win.x].element.addClass('a-reverse');
    win._blinkTimeout = setTimeout(do_unblink, BLINK_DELAY);
  };
  var do_unblink = function() {
    win.tiles[win.y][win.x].element.removeClass('a-reverse');
    win._blinkTimeout = setTimeout(do_blink, BLINK_DELAY);
  };
  win._blinkTimeout = setTimeout(do_blink, BLINK_DELAY);
};

// move the cursor to a given position on the screen.
window_t.prototype.move = function(y, x) {
  if (y < 0 || y >= this.height || x < 0 || x >= this.width) {
    throw new RangeError("coordinates out of range");
  }
  // var tile = this.tiles[this.y][this.x];
  // TODO: handle blinking/unblinking on move
  this.y = y;
  this.x = x;
};
exports.move = simplify(window_t.prototype.move);


// load a font with given attributes font_name and font_size
window_t.prototype.loadfont = function(font_name, font_size) {
  this.context.font = font_size + 'px ' + font_name;
  this.context.textAlign = 'left';
  var c = 'm';
  var metrics = this.context.measureText(c);
  var height = font_size;
  var width = metrics.width;
  // check that it's (probably) a monospace font
  var i;
  for (i = 'a'.charCodeAt(0); i <= 'z'.charCodeAt(0); i++) {
    c = String.fromCharCode(i);
    metrics = this.context.measureText(c);
    if (metrics.width !== width) {
      console.warn(font_name + ' does not seem to be a monospace font');
    }
    c = c.toUpperCase();
    metrics = this.context.measureText(c);
    if (metrics.width !== width) {
      console.warn(font_name + ' does not seem to be a monospace font');
    }
  }
  // resize the canvas
  this.canvas.attr({
    height: this.height * height,
    width: this.width * width
  });
  // save the currently used font
  this.font.name = font_name;
  this.font.size = font_size;
  this.font.char_height = height;
  this.font.char_width = width;
  // create an offscreen canvas for rendering
  var offscreen = make_offscreen_canvas(this.font);
  this.offscreen_canvases = [offscreen];
};
exports.loadfont = simplify(window_t.prototype.loadfont);

// clear the whole window
window_t.prototype.clear = function() {
  // window height and width
  var height = this.height * this.font.char_height;
  var width = this.width * this.font.char_width;
  // clear the window
  this.context.fillStyle = color_pairs[0].bg;
  this.context.fillRect(0, 0, width, height);
  // reset all the character tiles
  var y, x;
  for (y = 0; y < this.height; y++) {
    for (x = 0; x < this.width; x++) {
      var tile = this.tiles[y][x];
      tile.content = this.empty_char;
      tile.empty = true;
      tile.attrs = A_NORMAL;
    }
  }
};
exports.clear = simplify(window_t.prototype.clear);

// update the canvas, pushing the actual changes made with drawing functions
// (such as addstr() and addch()) and refreshing the screen.
//
// in other words, addstr() and addch() do nothing until refresh() is called.
window_t.prototype.refresh = function() {
  // for each changed character
  var k;
  for (k in this.changes) {
    var change = this.changes[k];
    this.context.clearRect(change.at.x, change.at.y, 
                           this.font.char_width, this.font.char_height);
    var attrs = change.attrs;
    var c = change.value;
    var char_cache = this.char_cache;
    draw_char(this, change.at.y, change.at.x, c, char_cache, attrs);
  }
  this.changes = {};
};
exports.refresh = simplify(window_t.prototype.refresh);

// draw a character at pixel-pos (x,y) on window `win'
//
// the character drawn is `c', with attrlist `attrs', and may be pulled
// from the canvas cache ̀`char_cache'
var draw_char = function(win, y, x, c, char_cache, attrs) {
  var color_pair = pair_number(attrs);
  // foreground and background colors
  var bg = color_pairs[color_pair].bg;
  var fg = color_pairs[color_pair].fg;
  // source y, source x, and source canvas for drawing
  var sy = 0;
  var sx;
  var canvas;
  if (char_cache[c] && char_cache[c][attrs]) {
    // graphics saved, just use the cache
    canvas = char_cache[c][attrs].canvas;
    sx = char_cache[c][attrs].sx;
  }
  else {
    // if canvas is full, use another canvas
    if (win.offscreen_canvas_index === CHARS_PER_CANVAS) {
      win.offscreen_canvas_index = 0;
      canvas = make_offscreen_canvas(win.font);
      win.offscreen_canvases.push(canvas);
    }
    canvas = win.offscreen_canvases[win.offscreen_canvases.length - 1];
    var ctx = canvas.ctx;
    sx = win.offscreen_canvas_index * win.font.char_width;
    // populat the `char_cache' with wher to find this character
    if (! char_cache[c]) {
      char_cache[c] = {};
    }
    win.char_cache[c][attrs] = {
      canvas: canvas,
      sx: sx
    };
    // draw a background
    ctx.fillStyle = (attrs & A_REVERSE) ? fg : bg;
    ctx.fillRect(sx, 0, win.font.char_width + 1, win.font.char_height);
    // choose a font
    var font = (attrs & A_BOLD) ? 'Bold ' : '';
    font += win.font.size + 'px ' + win.font.name;
    ctx.font = font;
    ctx.textBaseline = 'top';
    // draw the character
    ctx.fillStyle = (attrs & A_REVERSE) ? bg : fg;
    ctx.fillText(c, sx, 0);
    win.offscreen_canvas_index++;
  }
  // apply the drawing onto the visible canvas
  win.context.drawImage(canvas[0], 
                        sx, sy, win.font.char_width, win.font.char_height,
                        x, y, win.font.char_width, win.font.char_height);
};

// output a single character to the console at current position (or move to
// the given position, and then output the given character).
//
// the cursor is moved one position to the right.
//
// all current attributes (as in attron(), attroff() and attrset()) are
// applied to the output.
window_t.prototype.addch = function(c) {
  if (typeof c !== "string") {
    throw new TypeError("c is not a string");
  }
  if (c.length !== 1) {
    throw new RangeError("c is not a character");
  }
  if (this.x >= this.width || this.x < 0) {
    throw new RangeError("invalid coordinates");
  }
  // treat all whitespace as a single space character
  if (c === '\t' || c === '\n' || c === '\r') {
    c = ' ';
  }
  var tile = this.tiles[this.y][this.x];
  // only do this if the content (or attrlist) changed
  if (c !== tile.content || this.attrs !== tile.attrs) {
    // update the tile
    tile.content = c;
    tile.empty = false;
    tile.attrs = this.attrs;
    // pixel-pos for drawing
    var draw_x = this.font.char_width * this.x;
    var draw_y = this.font.char_height * this.y;
    // add an instruction to the 'changes queue'
    this.changes[this.y + ','  + this.x] = {
      at: {
        x: draw_x,
        y: draw_y
      },
      value: c,
      attrs: this.attrs
    };
  }
  // move to the right
  if (this.x < this.width - 1) {
    this.move(this.y, this.x + 1);
  }
}; 
// allow calling as addch(y, x, c);
window_t.prototype.addch = shortcut_move(window_t.prototype.addch);
window_t.prototype.addch = attributify(window_t.prototype.addch);
exports.addch = simplify(window_t.prototype.addch);

// output a string to the console at current position (or move to the given
// position, and then output the string).
//
// the cursor is moved to the right end of the text.
//
// all current attributes (as in attron(), attroff() and attrset()) are
// applied to the output.
window_t.prototype.addstr = function(str) {
  var i;
  for (i = 0; i < str.length && this.x < this.width; i++) {
    this.addch(str[i]);
  }
  if (i !== str.length) {
    throw new RangeError("not enough room to add the whole string");
  }
}; 
// allow calling as addstr(y, x, str);
window_t.prototype.addstr = shortcut_move(window_t.prototype.addstr);
window_t.prototype.addstr = attributify(window_t.prototype.addstr);
exports.addstr = simplify(window_t.prototype.addstr);

// used for creating an off-screen canvas for pre-rendering characters
var make_offscreen_canvas = function(font) {
  var canvas = $('<canvas></canvas>');
  canvas.attr({
    height: font.char_height,
    width: CHARS_PER_CANVAS * font.char_width
  });
  canvas.ctx = canvas[0].getContext('2d');
  return canvas;
};

// trigger an event on the window, with name event_name.
//
// call all the event handlers bound to that event, and pass any other
// arguments given to trigger() to each event handler.
window_t.prototype.trigger = function(event_name) {
  if (this.listeners[event_name]) {
    var args = [].slice.call(arguments, 1);
    var i;
    for (i = 0; i < this.listeners[event_name].length; i++) {
      this.listeners[event_name][i].apply(this, args);
    }
  }
};

// add an event handler for the event with name event_name.
window_t.prototype.on = function(event_name, callback) {
  if (! this.listeners[event_name]) {
    this.listeners[event_name] = [];
  }
  this.listeners[event_name].push(callback);
};

// remove an event handler for the event with name event_name.
window_t.prototype.off = function(event_name, callback) {
  if (! this.listeners[event_name]) {
    this.listeners[event_name] = [];
  }
  var i;
  for (i = 0; i < this.listeners[event_name].length; i++) {
    if (this.listeners[event_name][i] == callback) {
      break;
    }
  }
  if (i !== this.listeners[event_name].length) {
    this.listeners[event_name].splice(i, 1);
  }
};

// add an event handler for the event with name event_name, which is removed
// after executing once.
window_t.prototype.one = function(event_name, callback) {
  var win = this;
  var f = function() {
    callback.apply(this, arguments);
    win.off(event_name, f);
  };
  this.on(event_name, f);
};

// call function `callback' only once, when a key is entered by the user.
//
// the first argument to `callback' will be the event object.
window_t.prototype.getch = function(callback) {
  this.one('keydown', callback);
};
exports.getch = simplify(window_t.prototype.getch);

// call function `callback' everytime a key is entered by the user.
//
// the first argument to `callback' will be the event objet.
window_t.prototype.ongetch = function(callback) {
  this.on('keydown', callback);
};
exports.ongetch = simplify(window_t.prototype.ongetch);

// stop listening for keyboard events
window_t.prototype.ungetch = function(callback) {
  this.off('keydown', callback);
};
exports.ungetch = simplify(window_t.prototype.ungetch);

})();