"use strict";
(function() {
"use strict()";

// functions, variables, etc. that should be exported, will be exported in the
// `exports` object (by default, the global namespace)
var exports = window;

/**
 * Standard 'screen' object, used as a default for most operations.
 */
var stdscr = exports.stdscr = null;

// milliseconds between cursor blinks
var BLINK_DELAY = 200;

// default value for the character on 'empty' space
var EMPTY_CHAR = ' ';

// many functions will return ERR when they are unable to perform an operation
var ERR = exports.ERR = -1;

// many functions will return OK when they are able to perform an operation
var OK = exports.OK = 0;

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
  // coordinates of the mouse when the mouse was pressed
  this._mouse_down_y = 0;
  this._mouse_down_x = 0;
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


// used to quickly add a function to the prototype of classes.
//
// used as defun(class1, class2, ..., function_name, function_body);
//
// e.g.:
//   defun(window_t, screen_t, 'move', function (y, x) {
//     // function body goes here
//   });
var defun = function() {
  var classes = [].slice.call(arguments, 0, -2);
  var function_name = arguments[arguments.length - 2];
  var function_body = arguments[arguments.length - 1];
  var i;
  for (i = 0; i < classes.length; i++) {
    classes[i].prototype[function_name] = function_body;
  }
};

// when called with a function, return that function, wrapped so that
// it can be used directly by being applied on `default_screen'.
//
// i.e., the call:
//   default_screen.addstr('hello world');
//
// can be shortened to:
//   addstr('hello world');
//
// if you define:
//   addstr = simplify(screen_t.prototype.addstr);
// when called with function name `function_name' that is defined in
// screen_t.prototype, will create a function with the same name in `exports'
// that calls this function using `default_screen'
var simplify = function(f) {
  return function() {
    return f.apply(default_screen, arguments);
  };
};

// similar to simplify, but convert the window call so it can be done as in C
// with ncurses. (waddch(win, 'c') vs. win.addch('c'))
//
// for instance, the call:
//   scr.addstr('hello world');
//
// can be rewritten:
//   waddstr(scr, 'hello world');
//
// if you define:
//   waddstr = windowify(f);
//
// TODO: *use* this, instead of just declaring it
var windowify = function(f) {
  return function() {
    var args = new Array(arguments.length - 1);
    var i = 1;
    for (; i < arguments.length; i++) {
      args[i - 1] = arguments[i];
    }
    return f.apply(arguments[0], args);
  };
};

// similar to simplify, but instead of allowing to call without supplying a
// `screen_t' object, allows calling by supplying a position for inserting
// text.
//
// for instance, the function call:
//   scr.addstr(10, 10, 'hello world');
//
// will expand to:
//   scr.move(10, 10);
//   scr.addstr('hello world');
//
// if you define:
//   screen_t.prototype.addstr = shortcut_move(screen_t.prototype.addstr);
//
// TODO: rename this decorator
var shortcut_move = function(f) {
  return function(y, x) {
    var args = new Array(arguments.length);
    var i = 0;
    for (; i < arguments.length; i++) {
      args[i] = arguments[i];
    }
    if (typeof y === "number" && typeof x === "number") {
      this.move(y, x);
      args = args.slice(2);
    }
    return f.apply(this, args);
  };
};

// similar to simplify, but allows the caller to specify text attributes
// (as per attron() and attroff()) as the last argument to the call.
// 
// for instance, the function call:
//   scr.addstr('hello world', A_BOLD | COLOR_PAIR(3));
//
// will expand to:
//   scr.attron(A_BOLD | COLOR_PAIR(3));
//   scr.addstr('hello world');
//   scr.attroff(A_BOLD | COLOR_PAIR(3));
//
// if you define:
//   screen_t.prototype.addstr = attributify(screen_t.prototype.addstr);
var attributify = function(f) {
  return function() {
    var args = new Array(arguments.length);
    var i = 0;
    for (; i < arguments.length; i++) {
      args[i] = arguments[i];
    }
    var attrs = null;
    var prev_attrs = this.attrs;
    if (arguments.length !== 0) {
      attrs = arguments[arguments.length - 1];
      if (typeof attrs === "number") {
        args.pop();
        this.attron(attrs);
      }
    }
    var return_value = f.apply(this, args);
    if (typeof attrs === "number") {
      this.attrset(prev_attrs);
    }
    return return_value;
  };
};


/**
 * Named constants for colors: COLOR_WHITE, COLOR_RED, COLOR_GREEN, etc.
 **/
var colors = {
  // COLOR_NAME: [NORMAL_COLOR, BOLD_COLOR]
  WHITE: ['#CCCCCC', '#FFFFFF'],
  RED: ['#CC4444', '#FF8888'],
  GREEN: ['#44CC44', '#88FF88'],
  YELLOW: ['#CCCC44', '#FFFF88'],
  BLUE: ['#4444CC', '#8888FF'],
  MAGENTA: ['#CC44CC', '#FF88FF'],
  CYAN: ['#44CCCC', '#88FFFF'],
  BLACK: ['#000000', '#222222']
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
var color_pairs = {
  0: {
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
 *     define_color(COLOR_BLUE, '#FF0000', '#FF8888');
 *     init_pair(1, COLOR_BLUE, COLOR_BLACK);
 *     // write something in pink
 *     addstr(10, 10, "hello pink!", COLOR_PAIR(1) | A_BOLD);
 *     // define a new color, and call it COLOR_OCHRE
 *     var COLOR_OCHRE = define_color(null, '#CC7722');
 *     init_pair(2, COLOR_OCHRE, COLOR_BLACK);
 *     // write something in ochre
 *     addstr(11, 10, "hello ochre!", COLOR_PAIR(2));
 *
 * @param {Color|Array[String]} [color_name=[]] Color to be modified. This can be a
 * built-in color (COLOR_RED, COLOR_BLUE, etc.) or any array, that will be
 * modified in-place to be a pair that describes the color. If unspecified, a
 * new array will be created to represent the pair.
 * @param {String} normal_color CSS color for the color that non-bold text
 * should have if affected by this color.
 * @param {String} [bold_color=normal_color] CSS color for the color that bold
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


/**
 * Some flags that can be used for attron(), attroff(), and attrset().
 **/
var A_NORMAL = exports.A_NORMAL = 0;
var A_STANDOUT = exports.A_STANDOUT = 0x10000; // TODO
var A_UNDERLINE = exports.A_UNDERLINE = A_STANDOUT << 1;
var A_REVERSE = exports.A_REVERSE = A_STANDOUT << 2;
var A_BLINK = exports.A_BLINK = A_STANDOUT << 3; // TODO
var A_DIM = exports.A_DIM = A_STANDOUT << 4; // TODO
var A_BOLD = exports.A_BOLD = A_STANDOUT << 5;

/**
 * Set the new attrlist for the screen to the specified attrlist. Any previous
 * attributes are overwrittent completely.
 *
 * @param {Attrlist} attrs New attributes' values.
 **/
defun(screen_t, window_t, 'attrset', function (attrs) {
  this.attrs = attrs | (this.empty_attrs & ~COLOR_MASK);
  if ((attrs & COLOR_MASK) === 0) {
    this.attrs |= this.empty_attrs & COLOR_MASK;
  }
});
exports.wattrset = windowify(window_t.prototype.attrset);
exports.attrset = simplify(screen_t.prototype.attrset);

/**
 * Turn on an attribute (or multiple attributes, if you use a binary OR).
 *
 * Example:
 *     // add these attributes
 *     attron(A_BOLD | A_REVERSE | COLOR_PAIR(3));
 *     // in bold, with color pair 3, and foreground/background swapped
 *     addstr("hello world");
 *
 * @param {Attrlist} attrs Attributes to be added.
 **/
defun(screen_t, window_t, 'attron', function (attrs) {
  var color_pair = attrs & COLOR_MASK;
  if (color_pair === 0) {
    color_pair = this.attrs & COLOR_MASK;
  }
  var other_attrs = ((attrs >> 16) << 16);
  other_attrs = other_attrs | ((this.attrs >> 16) << 16);
  var new_attrs = other_attrs | color_pair;
  this.attrset(new_attrs);
});
exports.wattron = windowify(window_t.prototype.attron);
exports.attron = simplify(screen_t.prototype.attron);

/**
 * Turn off an attribute (or multiple attributes, if you use a binary OR).
 *
 * Example:
 *     // add these attributes
 *     attron(A_BOLD | COLOR_PAIR(1));
 *     addstr("i am bold, and red);
 *     // remove only the color attribute
 *     attroff(COLOR_PAIR(1));
 *     addstr("i am not red, but I am still bold");
 *     // remove the bold attribute
 *     attroff(A_BOLD);
 *     addstr("i am neither red, nor bold");
 *
 * @param {Attrlist} attrs Attributes to be removed.
 **/
defun(screen_t, window_t, 'attroff', function (attrs) {
  var color_pair = this.attrs & COLOR_MASK;
  var new_attrs = ((attrs >> 16) << 16);
  new_attrs = ~new_attrs & this.attrs;
  if (attrs & COLOR_MASK) {
    new_attrs = new_attrs & ~COLOR_MASK;
  }
  this.attrset(new_attrs);
});
exports.wattroff = windowify(window_t.prototype.attroff);
exports.attroff = simplify(screen_t.prototype.attroff);


/**
 * Name constants for keys. Useful for commonly-used keycodes, especially the
 * non-alphanumeric keys. All of their names start with `KEY_`. For instance,
 * there are `KEY_LEFT`, `KEY_UP`, `KEY_ESC`, `KEY_ENTER`, etc.
 *
 * There is also a constant for each letter of the alphabet (`KEY_A`, `KEY_B`,
 * etc.)
 **/
exports.KEY_LEFT = 37;
exports.KEY_UP = 38;
exports.KEY_RIGHT = 39;
exports.KEY_DOWN = 40;
exports.KEY_ESC = 27;
exports.KEY_TAB = 9;
exports.KEY_BACKSPACE = 8;
exports.KEY_HOME = 36;
exports.KEY_END = 35;
exports.KEY_ENTER = 13;
exports.KEY_PAGE_UP = 33;
exports.KEY_PAGE_DOWN = 34;

var handled_keys = {
  33: 1,
  34: 1,
  35: 1,
  36: 1,
  37: 1,
  38: 1,
  39: 1,
  40: 1
};

// returns `true` iff the event `event` corresponds to a keyboard event that
// should be properly handled by the `keydown` handler, and not the
// `keypress` handler.
var is_handled_keydown = function(event) {
  return typeof handled_keys[event.which] !== "undefined";
};

var KEY_RESIZE = exports.KEY_RESIZE = '$RESIZE';
var KEY_MOUSE = exports.KEY_MOUSE = '$MOUSE';
var BUTTON1_PRESSED = exports.BUTTON1_PRESSED = 1 << 0;
var BUTTON1_RELEASED = exports.BUTTON1_RELEASED = 1 << 1;
var BUTTON1_CLICKED = exports.BUTTON1_CLICKED = 1 << 2;

// called by initscr() to add keyboard support
var handle_keyboard = function(scr, container, require_focus) {
  // grab keyboard events for the whole page, or the container, depending
  // on the require_focus argument
  var keyboard_target = require_focus ? container : $('body');
  if (require_focus) {
    // apply tabindex="0" so this element can actually receive focus
    container.attr('tabindex', 0);
  }
  grab_keyboard(scr, keyboard_target);
  if (scr.auto_height || scr.auto_width) {
    $(window).resize(function(event) {
      // calculate the new width/height of the screen, in characters
      var height = scr.height;
      var width = scr.width;
      if (scr.auto_height) {
	height = Math.floor(container.height() / scr.font.char_height);
	if (scr.min_height) {
	  height = Math.max(height, scr.min_height);
	}
      }
      if (scr.auto_width) {
	width = Math.floor(container.width() / scr.font.char_width);
	if (scr.min_width) {
	  width = Math.max(width, scr.min_width);
	}
      }
      if (height === scr.height && width === scr.width) {
	// exit if unchanged
	return;
      }
      // resize the canvas
      resize_canvas(scr, height, width);
      // change the 'official' width/height of the window
      scr.height = height;
      scr.width = width;
      // force redrawing of the whole window
      // scr.full_refresh();
      // fire an event for getch() and the like, with KEY_RESIZE as the keycode
      scr.trigger('keydown', KEY_RESIZE);
    });
  }
};

// helper function for resizing a canvas while trying to keep its current state
var resize_canvas = function(scr, height, width) {
  // create a new canvas to replace the current one (with the new size)
  // this is because resizing a canvas also clears it
  var h = height * scr.font.char_height;
  var w = width * scr.font.char_width;
  var new_canvas = $('<canvas></canvas>');
  new_canvas.attr({
    height: h,
    width: w
  });
  var ctx = new_canvas[0].getContext('2d');
  var prev_h = scr.height * scr.font.char_height;
  var prev_w = scr.width * scr.font.char_width;
  h = Math.min(prev_h, h);
  w = Math.min(prev_w, w);
  // copy the old canvas onto the new one
  ctx.drawImage(scr.canvas[0],
		0, 0, w, h,
		0, 0, w, h);
  // replace the old canvas with the new one
  scr.canvas.replaceWith(new_canvas);
  scr.canvas = new_canvas;
  scr.context = ctx;
  // add the necessary tiles to the tile-grid
  var y, x;
  for (y = 0; y < scr.height; y++) {
    for (x = scr.width; x < width; x++) {
      scr.tiles[y][x] = new tile_t();
      scr.tiles[y][x].content = ' ';
      scr.display[y][x] = new tile_t();
      scr.display[y][x].content = '';
    }
  }
  for (y = scr.height; y < height; y++) {
    scr.tiles[y] = [];
    scr.display[y] = [];
    for (x = 0; x < width; x++) {
      scr.tiles[y][x] = new tile_t();
      scr.tiles[y][x].content = ' ';
      scr.display[y][x] = new tile_t();
      scr.display[y][x].content = '';
    }
  }
};

var grab_keyboard = function(scr, keyboard_target) {
  var use_keypress = false;
  keyboard_target.keydown(function(event) {
    if (! is_handled_keydown(event)) {
      return true;
    }
    // true iff the event key event should not be sent to the browser
    var cancel = scr._raw;
    // trigger the event, and call event handlers as
    // handler(keycode, event, screen);
    var key = event.which;
    var returned = scr.trigger('keydown', key, event, scr);
    if (typeof returned === "boolean") {
      cancel = ! returned;
    }
    // disable most browser shortcuts if the _raw flag is on for the window, and
    // the handlers did not return true
    return ! cancel;
  });
  keyboard_target.keypress(function(event) {
    if (! event.which) {
      return true;
    }
    // TODO: handle control-key
    var cancel = scr._raw;
    var key = String.fromCharCode(event.which);
    if (event.which === 13) {
      key = "\n";
    }
    var returned = scr.trigger('keydown', key, event, scr);
    if (typeof returned === "boolean") {
      cancel = ! returned;
    }
    use_keypress = false;
    return ! cancel;
  });
};

/**
 * With one argument, set the enabled mouse events to those specified by
 * `newmask` (binary-or'd together, see BUTTON1_PRESSED, BUTTON1_RELEASED, etc.,
 * and return the previously active mouse mask.
 *
 * With no arguments, only return the currently active mouse mask.
 *
 * @param {Integer} [newmask] New mouse mask to set.
 * @return {Integer} Currently active mouse mask.
 */
defun(screen_t, 'mousemask', function(newmask) {
  if (arguments.length === 0) {
    return this._mousemask;
  }
  var oldmask = this._mousemask;
  this._mousemask = newmask;
  return oldmask;
});
exports.mousemask = simplify(screen_t.prototype.mousemask);

var handle_mouse = function(scr, mouse_target) {
  mouse_target.mousedown(function(event) {
    var pos = calculate_mouse_pos(scr, event);
    scr._mouse_down = true;
    scr._mouse_down_y = pos.y;
    scr._mouse_down_x = pos.x;
    if (scr._mousemask & BUTTON1_PRESSED) {
      var mevent = get_mevent(scr, event);
      mevent.id = BUTTON1_PRESSED;
      scr._mevents.push(mevent);
      scr.trigger('keydown', KEY_MOUSE, event);
    }
  });
  mouse_target.mouseup(function(event) {
    var pos = calculate_mouse_pos(scr, event);
    var mevent;
    if (scr._mousemask & BUTTON1_RELEASED) {
      mevent = get_mevent(scr, event);
      mevent.id = BUTTON1_RELEASED;
      scr._mevents.push(mevent);
      scr.trigger('keydown', KEY_MOUSE, event);
    }
    if (scr._mouse_down && scr._mousemask & BUTTON1_CLICKED &&
        scr._mouse_down_y === pos.y && scr._mouse_down_x === pos.x) {
      mevent = get_mevent(scr, event);
      mevent.id = BUTTON1_CLICKED;
      scr._mevents.push(mevent);
      scr.trigger('keydown', KEY_MOUSE, event);
    }
    scr._mouse_down = false;
  });
};

defun(screen_t, 'getmouse', function() {
  return this._mevents.pop();
});
exports.getmouse = simplify(screen_t.prototype.getmouse);

var calculate_mouse_pos = function(scr, event) {
  var canvas = scr.canvas;
  return {
    y: Math.floor((event.pageY - canvas.offset().top) / scr.font.char_height),
    x: Math.floor((event.pageX - canvas.offset().left) / scr.font.char_width)
  };
};

var get_mevent = function(scr, event) {
  var mevent = calculate_mouse_pos(scr, event);
  mevent.z = 0;
  mevent.bstate = 0;
  mevent.id = 0;
  return mevent;
};

/**
 * Disable most browser shortcuts, allowing your application to use things like
 * Ctrl+C and Ctrl+T as keybindings within the application. 
 *
 * You may want to use the `require_focus` option in initscr() if you use this
 * function.
 **/
defun(screen_t, 'raw', function () {
  this._raw = true;
});
exports.raw = simplify(screen_t.prototype.raw);

/**
 * Enables most browser shortcuts; undoes a previous call to raw(). This is
 * the default behaviour.
 **/
defun(screen_t, 'noraw', function () {
  this._raw = false;
});
exports.noraw = simplify(screen_t.prototype.noraw);

/**
 * All characters typed by the user are printed at the cursor's position.
 *
 * TODO
 **/
defun(screen_t, 'echo', function () {
  this._echo = true;
});
exports.echo = simplify(screen_t.prototype.echo);

/**
 * All characters not typed by the user are printed at the cursor's position.
 * Undoes a previous call to echo(). This is the default behaviour.
 **/
defun(screen_t, 'noecho', function () {
  this._echo = false;
});
exports.noecho = simplify(screen_t.prototype.noecho);

/**
 * Enables non-printable characters to also be grabbed as keyboard events
 * (especially arrow keys, among others).
 *
 * TODO
 **/
defun(screen_t, 'keypad', function () {
});
exports.keypad = simplify(screen_t.prototype.keypad);


/**
 * Create a new screen, set is at the default screen, and return it.
 *
 * A screen uses an HTML Canvas element as its display in order to render
 * characters on-screen; it needs to have a specified, fixed, height and width,
 * and a specified, fixed, font and font size.
 *
 * The created screen is set as the "default screen". This allows calling
 * all js-curses in a C-style way, without explicitly specifying the screen
 * most method calls apply to, assuming initscr() is called only once for the
 * webpage. For instance, the following are legal:
 *
 *     // creating the screen
 *     var screen = initscr({
 *       container: '#container',
 *       height: 30,
 *       width: 30,
 *       font: {
 *         type: 'ttf',
 *         name: 'Oxygen Mono',
 *         height: 14
 *       },
 *       require_focus: true
 *     });
 *     // explicitly calling screen.move() and screen.addstr()
 *     screen.move(10, 10);
 *     screen.addstr("hello world");
 *     // implicitly calling screen.move() and screen.addstr()
 *     move(11, 10);
 *     screen.addstr("bonjour world");
 *     // updating the display
 *     refresh(); // or screen.refresh()
 *
 * The created screen is contained within the DOM element `container`; if
 * `container` is a string, it is used as a CSS selector with jQuery; if it
 * is undefined, a DOM element is created to hold the screen.
 *
 * The dimensions of the screen, in columns and rows (character-wise), are
 * specified by the `height` and `width` arguments.
 *
 * The font to use must be specified by the `font_name` and `font_size`
 * arguments. See load_ttf_font() and load_bmp_font() for more information on
 * font loading.
 *
 * If `require_focus` is true, the screen will only grab keyboard events when
 * it receives focus; additionally, it will make sure that it has a way to
 * grab the keyboard focus, by setting the HTML "tabindex" attribute for its
 * container. If `require_focus` is false or unspecified, then the screen
 * will grab all keyboard events on the webpage, which may get in the way
 * of the web browser's shortcuts, and a lot of other things.
 *
 * Examples:
 *     // ttf font:
 *     initscr({
 *       container: '#container',
 *       height: 60,
 *       width: 80,
 *       font: {
 *         type: 'ttf',
 *         name: 'Source Code Pro',
 *         height: 12
 *       },
 *       require_focus: true
 *     });
 *     // bitmap font:
 *     var char_table = [
 *       'abcdefghijklmnopqrstuvwxyz', // each line corresponds to a line inside
 *       'ABCDEFGHIJKLMNOPQRSTUVWXYZ', // the image to be loaded
 *       ' ,.!@#$%?&*()[]{}'
 *     ];
 *     initscr({
 *       container: '#canvas',
 *       height: 30,
 *       width: 40,
 *       font: {
 *         type: 'bmp',
 *         name: 'my_image.png',
 *         height: 16,
 *         width: 8
 *       },
 *       require_focus: true
 *     });
 * 
 * @param {Object} opts Options object for the initscr() function.
 * @param {String|HTMLElement|jQuery} [opts.container=$('<pre></pre>')] HTML
 * element or CSS selector for the element that will wrap the <canvas> element
 * used for drawing.
 * @param {Integer} [opts.height=(auto)] Height of the screen, in characters. If
 * unspecified or 0, will be just enough characters to fill the `container`
 * element, rounded down.
 * @param {Integer} [opts.min_height=0] Minimum height of the screen, in
 * characters, for when `height` is unspecified.
 * @param {Integer} [opts.width=(auto)] Width of the screen, in chracters. If
 * unspecified or 0, will be just enough characters to fill the `container`
 * element, rounded down.
 * @param {Integer} [opts.min_width=0] Minimum width of the screen, in
 * characters, for when `width` is unspecified.
 * @param {Boolean} [opts.require_focus=false] Whether focus is required for
 * keyboard events to be registered; if `true`, forces `opts.container` to be
 * able to receive keyboard focus, by setting its `tabindex` HTML attribute.
 * @param {Object} opts.font Object describing the font to use.
 * @param {String} [opts.font.type="ttf"] Either "ttf" or "bmp"; says which type
 * of font should be loaded. "ttf" indicates that it is a font name, and "bmp"
 * indicates that the font should be loaded from an image.
 * @param {String} opts.font.name For a TTF, indicates the name of the font. The
 * filetype should not be added to the end for TTF fonts. For a BMP font,
 * indicates the path for downloading the .png image for the font. The image
 * should be composed of characters with set height and width, in a grid
 * disposition, and starting from pixel (0,0) in the image. In any case, the
 * font that you want to load should already have been preloaded by the browser
 * before `initscr()` is called.
 * @param {Integer} opts.font.height Height, in pixels, of a character from the
 * loaded font.
 * @param {Integer} opts.font.width Width, in pixels, of a character from the
 * loaded font. Only relevant if a BMP font is loaded, and must be supplied if a
 * BMP font is loaded.
 * @param {Boolean} [opts.font.use_char_cache=true] true iff a cache should be
 * used to store every drawn character, so that it can be redrawn much faster
 * next time. This improves performance a lot, but can increase memory usage by
 * a lot in some cases.
 * @param {Integer} [opts.font.line_spacing=0] Number of pixels between two
 * lines of text.
 * @param {Array[String]} [opts.font.chars=CODEPAGE_437] Each array element
 * describes a line in the image for the BMP font being loaded. Each element
 * should be a string that describes the contiguous characters on that line. See
 * the example code.
 * @param {Boolean} [opts.font.use_bold=true] `true` iff the bold font variant
 * should be used for bold text. `false` indicates that bold text will only be
 * drawn in a brighter color, without actually being bold. Only relevant for TTF
 * fonts.
 * @param {Integer} [opts.font.channel=CHANNEL_ALPHA] Use this to select the
 * channel to be used for a BMP font. It should be one of CHANNEL_ALPHA,
 * CHANNEL_RED, CHANNEL_GREEN, or CHANNEL_BLUE.
 **/
var initscr = exports.initscr = function(opts) {
  // check arg validity
  check_initscr_args.apply(this, arguments);
  // set some default values for arguments
  opts.require_focus |= false;
  opts.font.type = /^bmp$/i.test(opts.font.type) ? "bmp" : "ttf";
  opts.font.line_spacing |= 0;
  opts.font.chars = opts.font.chars || CODEPAGE_437;
  if (opts.font.use_bold === undefined) {
    opts.font.use_bold = true;
  }
  if (opts.font.use_char_cache === undefined) {
    opts.font.use_char_cache = true;
  }
  // `container` can either be a DOM element, or an ID for a DOM element
  if (opts.container !== undefined) {
    opts.container = $(opts.container);
  }
  else {
    opts.container = $('<pre></pre>');
  }
  // clear the container
  opts.container.html('');
  // create a new screen_t object
  var scr = new screen_t();
  scr.container = opts.container;
  // set the height, in characters
  scr.height = opts.height;
  scr.width = opts.width;
  // create the canvas
  scr.canvas = $('<canvas moz-opaque></canvas>');
  scr.container.append(scr.canvas);
  scr.context = scr.canvas[0].getContext('2d');
  // load the specified font
  // TODO: specify sane default values
  if (/^ttf$/i.test(opts.font.type)) {
    load_ttf_font(scr, opts.font);
  }
  else {
    load_bitmap_font(scr, opts.font);
  }
  // handle default, 'cover the whole container' size
  if (! opts.height) {
    scr.auto_height = true;
    scr.height = Math.floor(opts.container.height() / scr.font.char_height);
    if (opts.min_height) {
      scr.height = Math.max(scr.height, opts.min_height);
      scr.min_height = opts.min_height;
    }
  }
  if (! opts.width) {
    scr.auto_width = true;
    scr.width = Math.floor(opts.container.width() / scr.font.char_width);
    if (opts.min_width) {
      scr.width = Math.max(scr.width, opts.min_width);
      scr.min_width = opts.min_width;
    }
  }
  scr.canvas.attr({
    height: scr.height * scr.font.char_height,
    width: scr.width * scr.font.char_width
  });
  // initialize the character tiles to default values
  var y, x;
  for (y = 0; y < scr.height; y++) {
    scr.tiles[y] = [];
    scr.display[y] = [];
    for (x = 0; x < scr.width; x++) {
      scr.tiles[y][x] = new tile_t();
      scr.tiles[y][x].content = '';
      scr.display[y][x] = new tile_t();
      scr.display[y][x].content = '';
    }
  }
  // set the created window as the default window for most operations
  // (so you can call functions like addstr(), getch(), etc. directly)
  default_screen = scr;
  exports.stdscr = scr;
  // draw a background
  scr.clear();
  // add keyboard hooks
  handle_keyboard(scr, opts.container, opts.require_focus);
  // add mouse hooks
  handle_mouse(scr, opts.container);
  // make a blinking cursor
  start_blink(scr);
  // return the created window
  return scr;
};

// helper function for checking the type & validity of arguments to initscr()
var check_initscr_args = function(opts) {
  if (typeof opts !== "object") {
    throw new TypeError("opts is not an object");
  }
  if (opts.height) {
    if (typeof opts.height !== "number" ) {
      throw new TypeError("height is not a number");
    }
    if (opts.height < 0) {
      throw new RangeError("height is negative");
    }
  }
  if (opts.min_height && typeof opts.min_height !== "number") {
    throw new TypeError("min_height is not a number");
  }
  if (opts.width) {
    if (typeof opts.width !== "number") {
      throw new TypeError("width is not a number");
    }
    if (opts.width < 0) {
      throw new RangeError("width is negative");
    }
  }
  if (opts.min_width && typeof opts.min_width !== "number") {
    throw new TypeError("min_width is not a number");
  }
  if (typeof opts.font !== "object") {
    throw new TypeError("font is not an object");
  }
  if (typeof opts.font.name !== "string" ) {
    throw new TypeError("font.name is not a string");
  }
  if (typeof opts.font.height !== "number") {
    throw new TypeError("font.height is not a number");
  }
  if (/^bmp$/i.test(opts.font.type)) {
    if (typeof opts.font.width !== "number") {
      throw new TypeError("font.width is not a number, for a BMP font");
    }
    if (opts.font.chars && ! (opts.font.chars instanceof Array)) {
      throw new TypeError("font.chars is not an array");
    }
    if (typeof opts.font.channel !== "number") {
      opts.font.channel = CHANNEL_ALPHA;
    }
  }
  if (opts.font.line_spacing) {
    if (typeof opts.font.line_spacing !== "number") {
      throw new TypeError("font.line_spacing is not a number");
    }
    if (opts.font.line_spacing < 0) {
      throw new TypeError("font.line_spacing is negative");
    }
  }
};

/**
 * Return the maximum possible position the cursor can have in the window. This
 * corresponds to the position of the cursor in the bottom right corner. The
 * object is returned in the following format:
 *
 *     {
 *       y: (maximum y),
 *       x: (maximum x)
 *     }
 *
 * @return {Object} Object describing the bottom right corner of the screen.
 **/
defun(screen_t, window_t, 'getmaxyx', function () {
  return {
    y: this.height - 1,
    x: this.width - 1
  };
});
exports.getmaxyx = windowify(window_t.prototype.getmaxyx);
// TODO: implement getbegyx(), getyx()

/**
 * Make the cursor blink once every BLINK_DELAY milliseconds, if it is visible.
 **/
defun(screen_t, 'blink', function () {
  if (! this._blink) {
    start_blink(this);
  }
  this._blink = true;
});
exports.blink = simplify(screen_t.prototype.blink);

/**
 * Make the cursor stop blinking, if it is visible. See blink().
 **/
defun(screen_t, 'noblink', function () {
  if (this._blink) {
    clearTimeout(this._blink_timeout);
    do_blink(this);
    clearTimeout(this._blink_timeout);
    this._blink_timeout = 0;
  }
  this._blinking = false;
  this._blink = false;
});
exports.noblink = simplify(screen_t.prototype.noblink);

// used for making a blinking cursor
var start_blink = function(scr) {
  scr._blink_timeout = setTimeout(function() {
    do_blink(scr);
  }, BLINK_DELAY);
};

var do_blink = function(scr) {
  if (scr._cursor_visibility) {
    draw_cursor(scr);
  }
  scr._blinking = true;
  scr._blink_timeout = setTimeout(function() {
    do_unblink(scr);
  }, BLINK_DELAY);
};

var do_unblink = function(scr) {
  if (scr._cursor_visibility) {
    undraw_cursor(scr);
  }
  scr._blinking = false;
  scr._blink_timeout = setTimeout(function() {
    do_blink(scr);
  }, BLINK_DELAY);
};

/**
 * Set the visibility of the cursor, as a number from 0 to 2, 2 being the most
 * visible, and 0 being completely invisible.
 *
 * @param {Integer} visibility
 **/
defun(screen_t, 'curs_set', function (visibility) {
  this._cursor_visibility = visibility;
  if (visibility) {
    draw_cursor(this);
  }
  else {
    undraw_cursor(this);
  }
});
exports.curs_set = simplify(screen_t.prototype.curs_set);

/**
 * Quit js-curses.
 * 
 * TODO
 **/
defun(screen_t, 'endwin', function () {
});
exports.endwin = simplify(screen_t.prototype.endwin);


// number of chars saved per off-screen canvas
var CHARS_PER_CANVAS = 256;

/**
 * Used for selecting which channels to use to render a BMP font. Will default
 * to CHANNEL_ALPHA.
 */
var CHANNEL_RED = exports.CHANNEL_RED = 0;
var CHANNEL_GREEN = exports.CHANNEL_GREEN = 1;
var CHANNEL_BLUE = exports.CHANNEL_BLUE = 2;
var CHANNEL_ALPHA = exports.CHANNEL_ALPHA = 3;

/**
 * Drawing characters. Can be used as variables when a specific character is
 * needed in order to draw a shape.
 **/
// box drawing
exports.ACS_ULCORNER = '┌';
exports.ACS_LLCORNER = '└';
exports.ACS_URCORNER = '┐';
exports.ACS_LRCORNER = '┘';
exports.ACS_LTEE = '├';
exports.ACS_RTEE = '┤';
exports.ACS_BTEE = '┴';
exports.ACS_TTEE = '┬';
exports.ACS_HLINE = '─';
exports.ACS_VLINE = '│';
exports.ACS_PLUS = '┼';

// box drawing, with double borders
exports.ACS_ULCORNER_DOUBLE = '╔';
exports.ACS_LLCORNER_DOUBLE = '╚';
exports.ACS_URCORNER_DOUBLE = '╗';
exports.ACS_LRCORNER_DOUBLE = '╝';
exports.ACS_LTEE_DOUBLE = '╠';
exports.ACS_RTEE_DOUBLE = '╣';
exports.ACS_BTEE_DOUBLE = '╩';
exports.ACS_TTEE_DOUBLE = '╦';
exports.ACS_HLINE_DOUBLE = '═';
exports.ACS_VLINE_DOUBLE = '║';
exports.ACS_PLUS_DOUBLE = '╬';

// box drawing, with only one double border
exports.ACS_ULCORNER_DOUBLE_RIGHT = '╒';
exports.ACS_ULCORNER_DOUBLE_DOWN = '╓';
exports.ACS_LLCORNER_DOUBLE_RIGHT = '╘';
exports.ACS_LLCORNER_DOUBLE_UP = '╙';
exports.ACS_URCORNER_DOUBLE_LEFT = '╕';
exports.ACS_URCORNER_DOUBLE_DOWN = '╖';
exports.ACS_LRCORNER_DOUBLE_LEFT = '╛';
exports.ACS_LRCORNER_DOUBLE_UP = '╜';
exports.ACS_LTEE_DOUBLE_RIGHT = '╞';
exports.ACS_LTEE_DOUBLE_VERT = '╟';
exports.ACS_RTEE_DOUBLE_LEFT = '╡';
exports.ACS_RTEE_DOUBLE_VERT = '╢';
exports.ACS_TTEE_DOUBLE_HORIZ = '╤';
exports.ACS_TTEE_DOUBLE_DOWN = '╥';
exports.ACS_BTEE_DOUBLE_HORIZ = '╧';
exports.ACS_BTEE_DOUBLE_UP = '╨';
exports.ACS_PLUS_DOUBLE_HORIZ = '╪';
exports.ACS_PLUS_DOUBLE_VERT = '╫';

// blocks
exports.ACS_BLOCK = '█';
exports.ACS_LIGHT_BLOCK = '░';
exports.ACS_MEDIUM_BLOCK = exports.ACS_CKBOARD = '▒';
exports.ACS_DARK_BLOCK = '▓';

// misc symbols
exports.ACS_DIAMOND = '♦';
exports.ACS_PLMINUS = '±';
exports.ACS_DEGREE = '°';
exports.ACS_BULLET = '•';
exports.ACS_LARROW = '<';
exports.ACS_RARROW = '>';
exports.ACS_DARROW = 'v';
exports.ACS_UARROW = '^';
exports.ACS_BOARD = '#';
exports.ACS_LEQUAL = '≥';
exports.ACS_GEQUAL = '≤';
exports.ACS_PI = 'π';
exports.ACS_STERLING = '£';

// The following are not part of codepage 437, and as such, cannot be used if
// you use `CODEPAGE_437` directly.

// wide box drawing
exports.ACS_ULCORNER_HEAVY = '┏';
exports.ACS_LLCORNER_HEAVY = '┓';
exports.ACS_URCORNER_HEAVY = '┗';
exports.ACS_LRCORNER_HEAVY = '┛';
exports.ACS_LTEE_HEAVY = '┣';
exports.ACS_RTEE_HEAVY = '┫';
exports.ACS_BTEE_HEAVY = '┻';
exports.ACS_TTEE_HEAVY = '┳';
exports.ACS_HLINE_HEAVY = '━';
exports.ACS_VLINE_HEAVY = '┃';
exports.ACS_PLUS_HEAVY = '╋';

// misc symbols
exports.ACS_NEQUAL = '≠';

/**
 * Can be given to the initscr() function as the `font.chars` option, if you
 * know that your BMP font uses the standard code page 437 format.
 *
 * This is a 'fake' codepage-437, in that it allows you to enter many characters
 * as their actual Unicode equivalent, not as their 8-bit codepage-437 value.
 * This means that you can use some characters like 'é' and all the ACS_*
 * variables without having to worry about this codepage.
 *
 * If you need the *actual* codepage 437 (where the characters are just ordered
 * by ASCII value), you can generate it using two nested loops:
 *
 *     var my_code_page = [];
 *     var y, x;
 *     for (y = 0; y < 0x08; y++) {
 *       my_code_page[y] = '';
 *       for (x = 0; x < 0x20; x++) {
 *         exports.my_code_page[y] += String.fromCharCode(y * 0x20 + x);
 *       }
 *     }
 **/
exports.CODEPAGE_437 = [];

var init_codepage_437 = function() {
  // lines 2-4 are normal ASCII characters
  var y, x;
  for (y = 1; y < 0x04; y++) {
    exports.CODEPAGE_437[y] = '';
    for (x = 0; x < 0x20; x++) {
      exports.CODEPAGE_437[y] += String.fromCharCode(y * 0x20 + x);
    }
  }
  exports.CODEPAGE_437[0] = '\0☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼';
  var tmp = exports.CODEPAGE_437[3];
  exports.CODEPAGE_437[3] = tmp.substr(0, 31) + '⌂' + tmp.substr(32);
  exports.CODEPAGE_437[4] = 'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒ';
  exports.CODEPAGE_437[5] = 'áíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐';
  exports.CODEPAGE_437[6] = '└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀';
  exports.CODEPAGE_437[7] = 'αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ';
};
init_codepage_437();

// Load a TTF font. The font should already be preloaded before calling this
// function. Automatically called by initscr().
//
// Print warning messages to the web console when the font does not appear to
// be a monospace font.
//
// @param {Object} font Font to be loaded, as passed to initscr().
var load_ttf_font = function(scr, font) {
  scr.context.font = 'Bold ' + font.height + 'px ' + font.name;
  scr.context.textAlign = 'left';
  var c = 'm';
  // calculate the probable font metrics
  var metrics = scr.context.measureText(c);
  var height = Math.round(font.height + font.line_spacing);
  var width = Math.round(metrics.width);
  // check that it's (probably) a monospace font
  var testChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ" + 
    "_-+*@ ()[]{}/\\|~`,.0123456789";
  var i;
  for (i = 0; i < testChars.length; i++) {
    c = testChars[i];
    metrics = scr.context.measureText(c);
    if (Math.round(metrics.width) !== width) {
      console.warn(font.name + ' does not seem to be a monospace font');
    }
  }
  // save the currently used font
  scr.font = {
    type: "ttf",
    name: font.name,
    size: font.height,
    char_height: height,
    char_width: width,
    line_spacing: font.line_spacing,
    use_bold: font.use_bold,
    use_char_cache: font.use_char_cache
  };
  // create the canvas pool for drawing offscreen characters
  scr.canvas_pool = {
    normal: {
      x: 0,
      canvases: null
    }
  };
  if (font.use_bold) {
    scr.canvas_pool.bold = {
      x: 0,
      canvases: null
    };
  }
  var offscreen = make_offscreen_canvas(scr.font);
  offscreen.ctx.font = font.height + 'px ' + font.name;
  scr.canvas_pool.normal.canvases = [offscreen];
  if (font.use_bold) {
    offscreen = make_offscreen_canvas(scr.font);
    offscreen.ctx.font = 'Bold ' + font.height + 'px ' + font.name;
    scr.canvas_pool.bold.canvases = [offscreen];
  }
};

// Load a BMP font from an image. The image should already be preloaded before
// calling this function. This function is called automatically by initscr().
// 
// @param {Object} font Font description, as passed to initscr().
var load_bitmap_font = function(scr, font) {
  var bitmap = font.name;
  var char_height = font.height;
  var char_width = font.width;
  if (typeof bitmap === "string") {
    bitmap = $('<img src="' + bitmap + '" />')[0];
  }
  char_height += font.line_spacing;
  var char_map = {};
  var y, x;
  for (y = 0; y < font.chars.length; y++) {
    for (x = 0; x < font.chars[y].length; x++) {
      if (! char_map[font.chars[y][x]]) {
	char_map[font.chars[y][x]] = [y, x];
      }
    }
  }
  // save the currently used font
  scr.font = {
    type: "bmp",
    bitmap: bitmap,
    char_height: char_height,
    char_width: char_width,
    char_map: char_map,
    line_spacing: font.line_spacing,
    use_char_cache: font.use_char_cache,
    channel: font.channel
  };
  // create the canvas pool for drawing offscreen characters
  scr.canvas_pool = {
    normal: {
      x: 0,
      canvases: null
    }
  };
  var offscreen = make_offscreen_canvas(scr.font);
  scr.canvas_pool.normal.canvases = [offscreen];
  // a very small, very temporary, canvas, for drawing the characters before
  // changing their color
  var small_offscreen = $('<canvas></canvas>');
  small_offscreen.attr({
    height: char_height,
    width: char_width
  });
  scr.small_offscreen = small_offscreen[0];
};

/**
 * Clear the whole window immediately, without waiting for the next refresh. Use
 * this sparingly, as this can cause very bad performance if used too many
 * times per second.
 **/
defun(screen_t, window_t, 'clear', function () {
  // reset all the character tiles
  // TODO: support setting attributes for empty_char
  var y, x;
  for (y = 0; y < this.height; y++) {
    for (x = 0; x < this.width; x++) {
      var tile = this.tiles[y][x];
      tile.empty = true;
      tile.content = this.empty_char;
      tile.attrs = this.empty_attrs;
    }
  }
});
exports.wclear = windowify(window_t.prototype.clear);
exports.clear = simplify(screen_t.prototype.clear);

defun(screen_t, window_t, 'clrtoeol', function () {
  hline(this.empty_char, this.width - this.x, A_NORMAL);
});
exports.wclrtoeol = windowify(window_t.prototype.clrtoeol);
exports.clrtoeol = simplify(screen_t.prototype.clrtoeol);

/**
 * Push the changes made to the buffer, such as those made with addstr() and
 * addch(). The canvas is updated to reflect the new state of the window. Uses
 * differential display to optimally update only the parts of the screen that
 * have actually changed.
 *
 * Note that functions like addstr() and addch() will not do anything until
 * refresh() is called.
 **/
defun(screen_t, 'refresh', function () {
  window_t.prototype.refresh.call(this);
  // move the on-screen cursor if necessary
  if (this._cursor_visibility && (! this._blink || this._blinking)) {
    // undraw the cursor from the previous location
    undraw_cursor(this, this.previous_y, this.previous_x);
    // draw the cursor on the current location
    draw_cursor(this);
  }
  this.previous_y = this.y;
  this.previous_x = this.x;
});
exports.refresh = simplify(screen_t.prototype.refresh);

/**
 * Push the changes made to the buffer, such as those made with addstr() and
 * addch(). The canvas is updated to reflect the new state of the window. Uses
 * differential display.
 *
 * Note that if ̀win` is a subwindow of `screen`, and `screen` wants to draw in
 * the same place as `win`, win.refresh() should be called after
 * screen.refresh(). (as in the original ncurses)
 */
var rx = /([0-9]+),([0-9]+)/;
defun(window_t, 'refresh', function() {
  // TODO: move cursor on wrefresh();
  var scr = this.parent_screen;
  // for each changed character
  var y, x, _;
  for (y = 0; y < this.height; y++) {
    for (x = 0; x < this.width; x++) {
      var prev = scr.display[y + this.win_y][x + this.win_x];
      var next = this.tiles[y][x];
      // if it needs to be redrawn
      if (prev.content !== next.content || prev.attrs !== next.attrs) {
	// redraw the character on-screen
	draw_char(scr, y + this.win_y, x + this.win_x,
		  next.content, next.attrs);
	prev.content = next.content;
	prev.attrs = next.attrs;
      }
    }
  }
});
exports.wrefresh = windowify(window_t.prototype.refresh);

/**
 * Move the cursor to a given position on the screen. If the position is outside
 * of the screen's bound, a RangeError is thrown.
 *
 * All output from addch() and addstr() is done at the position of the cursor.
 *
 * @param {Integer} y y position of the new position.
 * @param {Integer} x x position of the new position.
 * @return {Integer} ERR or OK, indicating whether the cursor could be moved.
 **/
defun(screen_t, window_t, 'move', function (y, x) {
  if (y < 0 || y >= this.height || x < 0 || x >= this.width) {
    return ERR;
  }
  this.y = y;
  this.x = x;
});
exports.wmove = windowify(window_t.prototype.move);
exports.move = simplify(screen_t.prototype.move);

// TODO: remove expose/unexpose and related behavior
defun(screen_t, window_t, 'expose', function (y, x, height, width) {
  var j, i;
  for (j = y; j < y + height; j++) {
    for (i = x; i < x + width; i++) {
      var tile = this.tiles[y][x];
      tile.exposed = true;
      this.addch(y, x, tile.content, tile.attrs);
    }
  }
});

defun(screen_t, window_t, 'unexpose', function (y, x, height, width) {
  var j, i;
  for (j = y; j < y + height; j++) {
    for (i = x; i < x + width; i++) {
      this.tiles[j][i].exposed = false;
    }
  }
});

/**
 * Output a single character to the console, at the current position, as
 * specified by `move` (or move to the given position, and then output the
 * given character).
 *
 * The cursor is moved one position to the right. If the end of the line is
 * reached, the cursor moves to the next line and returns to column 0.
 *
 * All current attributes (see attron(), attroff(), and attrset()) are applied
 * to the output. You may also supply a temporary attrlist as a last argument
 * to this function.
 *
 * Note that the visual display (the canvas) is not updated until the
 * refresh() function is called.
 *
 * TODO: implement tab and newline characters
 *
 * @param {Integer} [y] y position for output.
 * @param {Integer} [x] x position for output.
 * @param {Character} c Character to be drawn.
 * @param {Attrlist} [attrs] Temporary attributes to be applied.
 **/
defun(screen_t, window_t, 'addch', function (c) {
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
  if (c === '\t' || c === '\r' || c === ' ') {
    // TODO: handle '\t' and '\r' differently
    c = this.empty_char;
  }
  // treat a newline as a special character
  if (c === '\n') {
    if (! this._scroll_ok || this.y !== this.height - 1) {
      var status = this.move(this.y + 1, 0);
      return status;
    }
    else {
      this.scroll();
      this.move(this.y, 0);
      return OK;
    }
  }
  // update the tile
  var tile = this.tiles[this.y][this.x];
  tile.content = c;
  tile.empty = false;
  tile.attrs = this.attrs;
  if (this._scroll_ok && this.x === this.width - 1 &&
      this.y === this.height - 1) {
    // end of screen or window reached, scroll window
    this.scroll();
    this.move(this.y, 0);
  }
  else if (this.x < this.width - 1) {
    // move to the right if possible
    if (this.y !== this.height - 1) {
      this.move(this.y, this.x + 1);
    }
    else if (this._scroll_ok) {
      this.move(this.y, this.x + 1);
    }
    else {
      this.move(this.y, this.x + 1);
    }
  }
  else if (this.y < this.height - 1) {
    // or continue to next line if the end of the line was reached
    this.move(this.y + 1, 0);
  }
  else {
    // reached end of window, and scrollok() is false: error
    return ERR;
  }
  return OK;
}); 
screen_t.prototype.addch = shortcut_move(screen_t.prototype.addch);
screen_t.prototype.addch = attributify(screen_t.prototype.addch);
window_t.prototype.addch = shortcut_move(window_t.prototype.addch);
window_t.prototype.addch = attributify(window_t.prototype.addch);
exports.waddch = windowify(window_t.prototype.addch);
exports.addch = simplify(screen_t.prototype.addch);

/**
 * Output a string to the console, at the current position, as specified by
 * `move` (or move to the given position, and then output the
 * given character).
 *
 * The cursor is moved to the end of the text. If the end of the line is
 * reached, the cursor moves to the next line, the cursor returns to column 0,
 * and text output continues on the next line.
 *
 * All current attributes (see attron(), attroff(), and attrset()) are applied
 * to the output. You may also supply a temporary attrlist as a last argument
 * to this function.
 *
 * Note that the visual display (the canvas) is not updated until the
 * refresh() function is called.
 *
 * TODO: implement tab and newline characters
 * TODO: correctly handle end of line errors
 *
 * @param {Integer} [y] y position for output.
 * @param {Integer} [x] x position for output.
 * @param {Character} str Character to be drawn.
 * @param {Attrlist} [attrs] Temporary attributes to be applied.
 * @return {Integer} OK on success, ERR if whole string cannot be printed.
 **/
defun(screen_t, window_t, 'addstr', function (str) {
  var i;
  for (i = 0; i < str.length; i++) {
    var status = this.addch(str[i]);
    if (status === ERR) {
      // spread the error
      return ERR;
    }
  }
  return OK;
}); 
screen_t.prototype.addstr = shortcut_move(screen_t.prototype.addstr);
screen_t.prototype.addstr = attributify(screen_t.prototype.addstr);
window_t.prototype.addstr = shortcut_move(window_t.prototype.addstr);
window_t.prototype.addstr = attributify(window_t.prototype.addstr);
exports.waddstr = windowify(window_t.prototype.addstr);
exports.addstr = simplify(screen_t.prototype.addstr);

/**
 * Draw a vertical line using `ch` at the current position. The cursor does not
 * move. The maximum length of the line is `n` characters. If the end of the
 * screen or window is reached, the line stops.
 * 
 * If called with two integers as the first arguments, move to those coordinates
 * first (as per move()), and stay there after the line is drawn.
 *
 * @param {Character} ch Character used to draw the line.
 * @param {Integer} n Length of the line, in characters.
 * @param {Attrlist} attrs Attributes to apply to `ch`.
 **/
defun(screen_t, window_t, 'vline', function (ch, n, attrs) {
  var start_y = this.y;
  var start_x = this.x;
  var y;
  for (y = 0; y < n && y + start_y < this.height; y++) {
    this.addch(y + start_y, start_x, ch, attrs);
  }
  this.move(start_y, start_x);
});
screen_t.prototype.vline = shortcut_move(screen_t.prototype.vline);
window_t.prototype.vline = shortcut_move(window_t.prototype.vline);
exports.wvline = windowify(window_t.prototype.vline);
exports.vline = simplify(screen_t.prototype.vline);

/**
 * Draw a horizontal line using `ch` at the current position. The cursor does
 * not move. The maximum length of the line is `n` characters. If the end of the
 * screen or window is reached, the line stops.
 *
 * If called with two integers as the first arguments, move to those coordinates
 * first (as per move()), and stay there after the line is drawn.
 *
 * @param {Character} ch Character used to draw the line.
 * @param {Integer} n Length of the line, in characters.
 * @param {Attrlist} attrs Attributes to apply to `ch`.
 **/
defun(screen_t, window_t, 'hline', function (ch, n, attrs) {
  var start_y = this.y;
  var start_x = this.x;
  var x;
  for (x = 0; x < n && x + start_x < this.width; x++) {
    this.addch(start_y, x + start_x, ch, attrs);
  }
  this.move(start_y, start_x);
});
screen_t.prototype.hline = shortcut_move(screen_t.prototype.hline);
window_t.prototype.hline = shortcut_move(window_t.prototype.hline);
exports.whline = windowify(window_t.prototype.hline);
exports.hline = simplify(screen_t.prototype.hline);

// used for creating an off-screen canvas for pre-rendering characters
var make_offscreen_canvas = function(font) {
  var canvas = $('<canvas></canvas>');
  canvas.attr({
    height: font.char_height,
    width: CHARS_PER_CANVAS * font.char_width
  });
  canvas.ctx = canvas[0].getContext('2d');
  canvas.ctx.textBaseline = 'hanging';
  return canvas;
};

// draw a character at pixel-pos (x,y) on window `scr`
//
// the character drawn is `c`, with attrlist `attrs`, and may be pulled
// from the canvas cache ̀`char_cache`
//
// draw_char() is used by refresh() to redraw characters where necessary
var is_firefox = /firefox/i.test(navigator.userAgent);
var draw_char = function(scr, y, x, c, attrs) {
  var offscreen = find_offscreen_char(scr, c, attrs);
  if (! offscreen) {
    // silently fail, and return false
    return false;
  }
  // apply the drawing onto the visible canvas
  y = Math.round(y * scr.font.char_height);
  x = Math.round(x * scr.font.char_width);
  // performance workaround: putImageData() is slower than drawImage() in
  // Firefox
  if (is_firefox)
    scr.context.drawImage(offscreen.src,
                          offscreen.sx, offscreen.sy,
                          scr.font.char_width, scr.font.char_height,
                          x, y,
     scr.font.char_width, scr.font.char_height);
  else
    scr.context.putImageData(offscreen.img_data, x, y);
  // return true for success
  return true;
};

// used by draw_char for finding (or creating) a canvas where the character
// `c` is drawn with attrlist `attrs`
//
// the return value is an object of the format:
// {
//   src: (canvas element),
//   sy: (Y position of the character on the canvas element),
//   sx: (X position of the character on the canvas element)
// }
var find_offscreen_char = function(scr, c, attrs) {
  // check if it's a (c,attrs) pair that's already been drawn before;
  // if it is, use the same character as before
  var found = find_in_cache(scr, c, attrs);
  if (found && scr.font.use_char_cache) {
    return found;
  }
  // not found, draw the character on an offscreen canvas, and add it
  // to the cache
  grow_canvas_pool(scr);
  if (scr.font.type === "ttf") {
    // TTF font
    return draw_offscreen_char_ttf(scr, c, attrs);
  }
  else if (scr.font.type === "bmp") {
    // bitmap font
    return draw_offscreen_char_bmp(scr, c, attrs);
  }
  else {
    // unrecognized font-type
    throw new Error("invalid font");
  }
};

// return an object describing where the character is if it can be
// found in the `char_cache`. if it cannot be found, return null.
var find_in_cache = function(scr, c, attrs) {
  var char_cache = scr.char_cache;
  if (char_cache[c] && char_cache[c][attrs]) {
    // found, return an object describing where the character is
    return char_cache[c][attrs];
  }
  // not found, return a value indicating that
  return null;
};

// add a canvas to the canvas pool if necessary, so that an offscreen
// character never ends up being drawn outside of its corresponding
// offscreen canvas (by being drawn too far to the right)
var grow_canvas_pool = function(scr) {
  var k;
  for (k in scr.canvas_pool) {
    var pool = scr.canvas_pool[k];
    if (pool.x >= CHARS_PER_CANVAS - 1) {
      pool.x = 0;
      var canvas = make_offscreen_canvas(scr.font);
      canvas.ctx.font = pool.canvases[pool.canvases.length - 1].ctx.font;
      pool.canvases.push(canvas);
    }
  }
};

// return an array [fg, bg] describing the foreground and background colors for
// the given attrlist.
var attr_colors = function(attrs) {
  var color_pair = pair_number(attrs);
  var bg = color_pairs[color_pair].bg;
  var fg = color_pairs[color_pair].fg;
  if (attrs & A_REVERSE) {
    // swap background and foreground
    var tmp = bg;
    bg = fg;
    fg = tmp;
  }
  // always use the first color as background color
  if (bg instanceof Array) {
    bg = bg[0];
  }
  // use a bright foreground if bold
  if (fg instanceof Array) {
    fg = (attrs & A_BOLD) ? fg[1] : fg[0];
  }
  return [fg, bg];
};

var draw_offscreen_char_bmp = function(scr, c, attrs) {
  // used for storing the drawn character in case it has to be redrawn
  // (for better performacne)
  var char_cache = scr.char_cache;
  // calculate the colours for everything
  var colors = attr_colors(attrs);
  var fg = colors[0];
  var bg = colors[1];
  // calculate where to draw the character
  var pool = scr.canvas_pool.normal;
  var canvas = pool.canvases[pool.canvases.length - 1];
  var ctx = canvas.ctx;
  var sy = 0;
  var sx = Math.round(pool.x * scr.font.char_width);
  // save info in the char cache
  if (! char_cache[c]) {
    char_cache[c] = {};
  }
  char_cache[c][attrs] = {
    src: canvas[0],
    sy: sy,
    sx: sx
  };
  if (! scr.font.char_map[c]) {
    // silently fail if we don't know where to find the character on
    // the original bitmap image
    return null;
  }
  // calculate coordinates from the source image
  var bitmap_y = scr.font.char_map[c][0] *
	(scr.font.char_height - scr.font.line_spacing);
  bitmap_y = Math.round(bitmap_y);
  var bitmap_x = scr.font.char_map[c][1] * scr.font.char_width;
  bitmap_x = Math.round(bitmap_x);
  // draw a background
  ctx.fillStyle = bg;
  ctx.fillRect(sx, sy, scr.font.char_width, scr.font.char_height);
  // draw the character on a separate, very small, offscreen canvas
  var small = scr.small_offscreen.getContext('2d');
  var height = scr.font.char_height;
  var width = scr.font.char_width;
  small.clearRect(0, 0, width, height);
  small.drawImage(scr.font.bitmap,
		  bitmap_x, bitmap_y,
		  width, height,
		  0, 0,
		  width, height);
  // for each non-transparent pixel on the small canvas, draw the pixel
  // at the same position onto the 'main' offscreen canvas
  ctx.fillStyle = fg;
  var pixels = small.getImageData(0, 0, width, height).data;
  var y, x;
  for (y = 0; y < height - scr.font.line_spacing; y++) {
    for (x = 0; x < width; x++) {
      var value = pixels[(y * width + x) * 4 + scr.font.channel];
      if (value !== 0) {
	// TODO: use putImageData() to improve performance in some
	// browsers
	var dst_x = Math.round(sx + x);
	var dst_y = Math.round(sy + y + scr.font.line_spacing / 2);
	ctx.globalAlpha = value / 255;
	ctx.fillRect(dst_x, dst_y, 1, 1);
      }
    }
  }
  ctx.globalAlpha = 255;
  // draw the underline if necessary
  if (attrs & A_UNDERLINE) {
    ctx.fillRect(sx, sy + height - 1, width, 1);
  }
  // increment the canvas pool's counter: move to the next character
  pool.x++;
  var img_data = char_cache[c][attrs].img_data = ctx.getImageData(sx, sy, 9, 16);
  // return an object telling where to find the offscreen character
  return char_cache[c][attrs];
};

var draw_offscreen_char_ttf = function(scr, c, attrs) {
  // used for storing the drawn character in case it has to be redrawn
  // (for better performance)
  var char_cache = scr.char_cache;
  // calculate the colours for everything
  var colors = attr_colors(attrs);
  var fg = colors[0];
  var bg = colors[1];
  // calculate where to draw the character
  var pool = ((attrs & A_BOLD) && scr.font.use_bold) ?
	scr.canvas_pool.bold :
	scr.canvas_pool.normal;
  var canvas = pool.canvases[pool.canvases.length - 1];
  var ctx = canvas.ctx;
  var sy = 0;
  var sx = Math.round(pool.x * scr.font.char_width);
  // save info in the char cache
  if (! char_cache[c]) {
    char_cache[c] = {};
  }
  scr.char_cache[c][attrs] = {
    src: canvas[0],
    sy: sy,
    sx: sx
  };
  // draw a background
  ctx.fillStyle = bg;
  ctx.fillRect(sx, sy, scr.font.char_width, scr.font.char_height);
  // draw the character
  ctx.fillStyle = fg;
  ctx.fillText(c, sx, Math.round(sy + scr.font.line_spacing / 2));
  // draw the underline if necessary
  if (attrs & A_UNDERLINE) {
    ctx.fillRect(sx, sy + scr.font.char_height - 1, scr.font.char_width, 1);
  }
  // increment the canvas pool's counter: move to the next character
  pool.x++;
  // return an object telling where to find the offscreen character
  return char_cache[c][attrs];
};

// draw the cursor at the current location
var draw_cursor = function(scr) {
  var y, x, tile;
  if (scr._cursor_visibility === 1) {
    // line cursor
    y = Math.round((scr.y + 1) * scr.font.char_height - 2);
    x = Math.round(scr.x * scr.font.char_width);
    tile = scr.display[scr.y][scr.x];
    scr.context.fillStyle = attr_colors(tile.attrs)[0];
    scr.context.fillRect(x, y, Math.round(scr.font.char_width - 1), 2);
  }
  else {
    // block cursor
    y = scr.y;
    x = scr.x;
    tile = scr.display[y][x];
    draw_char(scr, y, x, tile.content, tile.attrs ^ A_REVERSE);
  }
};

// clear the cursor from its previous position
// (optional: supply previous position)
var undraw_cursor = function(scr, y, x) {
  if (typeof y !== "number" || typeof x !== "number") {
    y = scr.y;
    x = scr.x;
  }
  var tile = scr.display[y][x];
  draw_char(scr, y, x, tile.content, tile.attrs);
};


/**
 * Create a new window at position (y,x), with height `height` and width
 * `width`. The parent window is the object newwin() is applied on (or the
 * default screen, it applicable). The child window is returned by this 
 * function.
 *
 * The child window is always drawn over the content of the parent window,
 * even if the child window is empty (it will simply draw empty chars, most
 * likely empty space, unless bkgd() is called).
 *
 * The created window starts being drawn on the next refresh() call.
 *
 * @param {Integer} y y position of the window, in characters.
 * @param {Integer} x x position of the window, in characters.
 * @param {Integer} height height of the window, in characters.
 * @param {Integer} width width of the window, in characters.
 * @return {window_t} The created child window.
 **/
defun(screen_t, window_t, 'newwin', function(height, width, y, x) {
  if (typeof y !== "number") {
    throw new TypeError("y is not a number");
  }
  if (y < 0) {
    throw new RangeError("y is negative");
  }
  if (typeof x !== "number") {
    throw new TypeError("x is not a number");
  }
  if (x < 0) {
    throw new RangeError("x is negative");
  }
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
  // create the window
  var win = new window_t(this.parent_screen);
  win.win_y = y;
  win.win_x = x;
  win.height = height;
  win.width = width;
  win.parent = this;
  // add to parent's subwindows
  this.subwindows.push(win);
  var i, j;
  // create the 2D array of tiles
  for (j = 0; j < height; j++) {
    win.tiles[j] = [];
    for (i = 0; i < width; i++) {
      win.tiles[j][i] = new tile_t();
    }
  }
  // draw each tile
  for (j = 0; j < height; j++) {
    for (i = 0; i < width; i++) {
      win.addch(j, i, win.empty_char);
      win.tiles[j][i].empty = true;
    }
  }
  // undraw each 'covered' tile in the parent
  this.unexpose(y, x, height, width);
  // return the created window
  return win;
});
exports.newwin = simplify(screen_t.prototype.newwin);

/**
 * Draw the background character `c`, using attrlist `attrs`, as the new
 * background character for the window. All the places that are already filled
 * with the current background character are replaced with the new one on
 * next refresh() call.
 *
 * @param {Character} c New background character.
 * @param {Attrlist} attrs New attrlist for the background.
 **/
defun(window_t, 'bkgd', function (c, attrs) {
  // TODO: implement for screen_t (and test)
  attrs |= 0;
  var saved_attrs = this.attrs;
  this.attrs = attrs;
  var y, x;
  for (y = 0; y < this.height; y++) {
    for (x = 0; x < this.width; x++) {
      if (this.tiles[y][x].empty) {
        this.addch(y, x, c);
        this.tiles[y][x].empty = true;
      }
    }
  }
  this.empty_char = c;
  this.empty_attrs = attrs;
  this.attrset(saved_attrs);
});
exports.wbkgd = windowify(window_t.prototype.bkgd);

/**
 * Draw a box around the window, using the border() function, but in a simpler
 * way. Use box() instead of border() when all corners use the same character,
 * all vertical borders use the same character, and all horizontal borders use
 * the same character.
 *
 * `corner` is the character used to draw the four corners of the box;
 * `vert` is the character used to draw the left and right borders; and
 * `horiz` is the character used to draw the top and bottom borders.
 *
 * You can call this function specifying only character arguments, in which
 * case the window's current default attributes are used for the characters.
 * You can also specify an attrlist argument after each character argument
 * in order to force each character's attributes to the specified values.
 *
 * For instance, you can call box() by doing:
 *     win.box(); // default attributes for everything
 *     win.box('|', '-', A_BOLD); // top/bottom borders are bold;
 *                                // corners and left/right borders are normal
 *
 * @param {ChType} [vert=ACS_VLINE] One, or two arguments, that describe the
 *   character for the left and right borders, and its attributes.
 * @param {ChType} [horiz=ACS_HLINE] One, or two arguments, that describe the
 *   character for the left and right borders, and its attributes.
 **/
defun(screen_t, window_t, 'box', function (vert, horiz) {
  var defaults = [ACS_VLINE, ACS_HLINE];
  var chars = parse_chtypes(arguments, defaults, this);
  vert = chars[0];
  horiz = chars[1];
  this.border(vert.value, vert.attrs, vert.value, vert.attrs,
	      horiz.value, horiz.attrs, horiz.value, horiz.attrs);
});
exports.box = windowify(window_t.prototype.box);

/**
 * Draw a box around a window, using the specified characters and attributes for
 * each side of the box.
 *
 * You can call this function specifying only character arguments, in which case
 * the window's current default attributes are used for the characters. You
 * can also specify an attrlist argument after each character argument in order
 * to force each character's attributes to the specified values.
 *
 * For instance, you can call border() by doing:
 *     win.border(); // default for everything
 *     win.border('|', '|', '-', '-'); // specify character for non-corners
 *     // left border is bold, right border is reverse:
 *     win.border('|', A_BOLD, '|', A_REVERSE);
 *
 * @param {ChType} [ls=ACS_VLINE] Character (and attributes) for left side.
 * @param {ChType} [rs=ACS_VLINE] Character (and attributes) for right side.
 * @param {ChType} [ts=ACS_HLINE] Character (and attributes) for top side.
 * @param {ChType} [bs=ACS_HLINE] Character (and attributes) for bottom side.
 * @param {ChType} [tl=ACS_ULCORNER] Character (and attributes) for top left
 * corner.
 * @param {ChType} [tr=ACS_URCORNER] Character (and attributes) for top right
 * corner.
 * @param {ChType} [bl=ACS_LLCORNER] Character (and attributes) for bottom left
 * corner.
 * @param {ChType} [br=ACS_LRCORNER] Character (and attributes) for bottom right
 * corner.
 */
defun(screen_t, window_t, 'border', function(ls, rs, ts, bs, tl, tr, bl, br) {
  var defaults = [ACS_VLINE, ACS_VLINE,
		  ACS_HLINE, ACS_HLINE,
		  ACS_ULCORNER, ACS_URCORNER, ACS_LLCORNER, ACS_LRCORNER];
  var chars = parse_chtypes(arguments, defaults, this);
  // draw corners
  this.addch(0, 0, chars[4].value, chars[4].attrs);
  this.addch(0, this.width - 1, chars[5].value, chars[5].attrs);
  this.addch(this.height - 1, 0, chars[6].value, chars[6].attrs);
  this.addch(this.height - 1, this.width - 1, chars[7].value, chars[7].attrs);
  // draw borders
  this.vline(1, 0, chars[0].value, this.height - 2, chars[0].attrs);
  this.vline(1, this.width - 1, chars[1].value, this.height - 2,
	     chars[1].attrs);
  this.hline(0, 1, chars[2].value, this.width - 2, chars[2].attrs);
  this.hline(this.height - 1, 1, chars[3].value, this.width - 2,
	     chars[3].attrs);
});
exports.wborder = windowify(window_t.prototype.border);
exports.border = simplify(screen_t.prototype.border);

// helper function for passing arguments to box() and border()
var parse_chtypes = function(arglist, defaults, win) {
  var chars = [];
  var i, j;
  for (i = 0, j = 0; i < arglist.length; i++, j++) {
    if (typeof arglist[i] === "string" || arglist[i].length !== 1) {
      var ch = {
        value: arglist[i]
      };
      if (typeof arglist[i + 1] === "number") {
        ch.attrs = arglist[i + 1];
        i++;
      }
      else {
        ch.attrs = win.attrs;
      }
      chars.push(ch);
    }
    else {
      throw new TypeError("expected a character for argument " + (i + 1));
    }
  }
  while (j < defaults.length) {
    chars.push({
      value: defaults[j],
      attrs: win.attrs
    });
    j++;
  }
  return chars;
};

/**
 * Controls what happens when the cursor is moved to the edge of the window, by
 * typing the last character on the last line (TODO), entering a newline on the
 * last line (TODO), or using the scroll()/scrl()/wscrl() functions.
 *
 * If `bf` is true, the window will scroll up one line every time, or more if
 * scrl() is called.
 *
 * @param {Boolean} bf `true` iff scrolling should be enabled for the window or
 * screen.
 */
defun(screen_t, window_t, 'scrollok', function (bf) {
  this._scroll_ok = bf;
});
exports.scrollok = windowify(window_t.prototype.scrollok);

/**
 * Scroll the window up one line, if scrollok() is enabled.
 */
defun(screen_t, window_t, 'scroll', function () {
  this.scrl(1);
});
exports.scroll = windowify(window_t.prototype.scroll);

/**
 * Scroll the window up any number of lines, if scrollok() is enabled. Negative
 * numbers indicate that the window should scroll down.
 *
 * @param {Integer} n Number of lines to scroll up.
 */
defun(screen_t, window_t, 'scrl', function (n) {
  if (! this._scroll_ok) {
    return;
  }
  var i, x, tile;
  if (n > 0) {
    // scroll up
    for (i = 0; i < n; i++) {
      this.tiles.shift();
      this.tiles.push([]);
      for (x = 0; x < this.width; x++) {
	tile = new tile_t();
	tile.content = this.empty_char;
	tile.attrs = this.empty_attrs;
	this.tiles[this.height - 1][x] = tile;
      }
    }
  }
  else if (n < 0) {
    n = -n;
    // scroll down
    for (i = 0; i < n; i++) {
      this.tiles.pop();
      this.tiles.unshift([]);
      for (x = 0; x < this.width; x++) {
	tile = new tile_t();
	tile.content = this.empty_char;
	tile.attrs = this.empty_attrs;
	this.tiles[0][x] = tile;
      }
    }
  }
});
exports.wscrl = windowify(window_t.prototype.scrl);
exports.scrl = simplify(screen_t.prototype.scrl);

/**
 * Delete a window, and remove it from its parent window. Force a redraw
 * on the part of the parent window that was being covered by this window.
 * The redraw only happens when refresh() is next called.
 * 
 * TODO
 **/
defun(window_t, 'delwin', function () {
  // force a redraw on the parent, in the area corresponding to this window
  this.parent.expose(this.win_y, this.win_x, this.height, this.width);
  // remove from the parent's subwindows
  var i;
  for (i = 0; i < this.parent.subwindows.length; i++) {
    if (this.parent.subwindows[i] === this) {
      break;
    }
  }
  if (i !== this.parent.subwindows.length) {
    this.parent.subwindows.splice(i, 1);
  }
});


/**
 * Trigger an event on the window, with name `event_name`.
 *
 * Call all the event handlers bound to that event, and pass any other arguments
 * given to trigger() to each even handler.
 *
 * @param {String} event_name Name of the event to be fired.
 **/
screen_t.prototype.trigger = function(event_name) {
  var last_return;
  if (this.listeners[event_name]) {
    var args = [].slice.call(arguments, 1);
    var i;
    for (i = 0; i < this.listeners[event_name].length; i++) {
      var returned = this.listeners[event_name][i].apply(this, args);
      if (returned !== undefined) {
	last_return = returned;
      }
    }
  }
  return last_return;
};

/**
 * Add an event handler for the event with name `event_name`.
 *
 * @param {String} event_name Name of the event to listen to.
 * @param {Function} callback Function that will be called when the event is
 *   fired.
 **/
screen_t.prototype.on = function(event_name, callback) {
  if (! this.listeners[event_name]) {
    this.listeners[event_name] = [];
  }
  this.listeners[event_name].push(callback);
};

/**
 * Remove an event handler for the event with name `event_name`. This removes
 * an event handler that was previously added with on().
 *
 * @param {String} event_name Name of the event the handler was bound to.
 * @param {Function} callback Function that was passed to on() previously.
 **/
screen_t.prototype.off = function(event_name, callback) {
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

/**
 * Add an event handler for the event with name `event_name`. The event handler
 * is removed after executing once.
 *
 * @param {String} event_name Name of the event to listen to.
 * @param {Function} callback Function that will be called when the event is
 *   fired.
 **/
screen_t.prototype.one = function(event_name, callback) {
  var scr = this;
  var f = function() {
    callback.apply(this, arguments);
    scr.off(event_name, f);
  };
  this.on(event_name, f);
};

/**
 * Call function `callback` only once, when a key is entered by the user (if
 * the screen has focus). `callback` will receive an event object as its first
 * argument.
 *
 * The description of the event object is still subject to change.
 *
 * @param {Function} callback Function to be called when a key is pressed.
 **/
screen_t.prototype.getch = function(callback) {
  this.one('keydown', callback);
};
exports.getch = simplify(screen_t.prototype.getch);

/**
 * Call function `callback` when a key is entered by the user (if the screen
 * has focus). `callback` will receive an event object as its first argument.
 *
 * The description of the event object is still subject to change.
 *
 * @param {Function} callback Function to be called when a key is pressed.
 **/
screen_t.prototype.ongetch = function(callback) {
  this.on('keydown', callback);
};
exports.ongetch = simplify(screen_t.prototype.ongetch);

/**
 * Stop listening to keyboard events; undoes a previous call to getch() or
 * ongetch(). The `callback` argument must be the same as in a previous call to
 * getch() or ongetch().
 *
 * @param {Function} callback Function that should not be called anymore when a
 *   key is pressed.
 **/
screen_t.prototype.ungetch = function(callback) {
  this.off('keydown', callback);
};
exports.ungetch = simplify(screen_t.prototype.ungetch);

})();