(function() {
  "use strict";

  // functions, variables, etc. that should be exported
  var exports = window;

  // milliseconds between cursor blinks
  var BLINK_DELAY = 500;

  // default value for the character on 'empty' space
  var EMPTY_CHAR = ' ';

  // array for (lower-case) names for the attributes (A_STANDOUT, A_UNDERLINE,
  // etc.)
  var attr_names = ['standout', 'underline', 'reverse', 'blink', 'dim', 'bold'];

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
  //
  // each color pair has an associated class: .pair-1 for COLOR_PAIR(1),
  // .pair-2 for COLOR_PAIR(2), etc.
  //
  // COLOR_PAIR(0) has no associated CSS class (it is the default style)
  var COLOR_PAIR = exports.COLOR_PAIR = function(n) {
    return n * 0x100;
  };

  // default window: will be used as a default object for all curses functions,
  // such as print(), addch(), move(), etc., if called directly instead of using
  // win.print(), win.addch(), win.move(), etc.
  var default_window = null;

  // curses window
  // TODO: implement creating other windows, sub-wdinows (not just the global 
  // 'stdscr' window)
  var window_t = function() {
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

  // creates a new window, sets it as the default window, and returns it
  //
  // if `require_focus' is true, don't grab keyboard events for the whole page:
  // only when the element is focused will it actually register keyboard events.
  var initscr = exports.initscr = function(container, height, width,
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
    if (container != null) {
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
    win.height = height;
    win.width = width;
    // initialize the tiles
    var y, x;
    for (y = 0; y < height; y++) {
      win.tiles[y] = [];
      for (x = 0; x < width; x++) {
        var tile = new tile_t();
        tile.element = $('<span>' + win.empty_char + '</span>');
        container.append(tile.element);
        win.tiles[y][x] = tile;
      }
      if (y !== height - 1) {
        container.append('<br />');
      }
    }
    // set the created window as the default window for most operations
    // (so you can call functions like addstr(), getch(), etc. directly)
    default_window = win;
    // grab keyboard events for the whole page
    var keyboard_target = require_focus ? container : $('body');
    if (require_focus) {
      container.attr('tabindex', 0);
    }
    keyboard_target.keydown(function(event) {
      if (is_key_press(event)) {
        win.trigger('keydown', event.key, event, win);
      }
      // disable most browser shortcuts if the _raw flag is on for the window
      return ! win._raw;
    });
    // make a blinking cursor
    startBlink(win);
    // return the created window
    return win;
  };

  // keys that are to be ignored for the purposes of events
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
    return ! ignoreKeys[event.key];
  };

  // used for making a blinking cursor
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
  window_t.prototype.blink = function() {
    if (! this._blink) {
      startBlink(this);
    }
    this._blink = true;
  };
  exports.blink = simplify(window_t.prototype.blink);

  // stop the cursor from blinking
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

  // move the cursor to a given position on the screen
  window_t.prototype.move = function(y, x) {
    if (y < 0 || y >= this.height || x < 0 || x >= this.width) {
      throw new RangeError("coordinates out of range");
    }
    var tile = this.tiles[this.y][this.x];
    if (tile && ! (tile.attrs & A_REVERSE)) {
      tile.element.removeClass('a-reverse');
    }
    this.y = y;
    this.x = x;
    this.tiles[y][x].element.addClass('a-reverse');
  };
  exports.move = simplify(window_t.prototype.move);

  // TODO: actually implement a refresh mechanism
  window_t.prototype.refresh = function() {};
  exports.refresh = simplify(window_t.prototype.refresh);

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
    // apply attributes if necessary
    if (tile.attrs !== this.attrs) {
      addClasses(tile.element, tile.attrs, this.attrs);
      removeClasses(tile.element, tile.attrs, this.attrs);
      tile.attrs = this.attrs;
    }
    // change the content
    tile.element.text(c);
    tile.element.content = c;
    tile.empty = false;
    // move to the right
    if (this.x < this.width - 1) {
      this.move(this.y, this.x + 1);
    }
  }; 
  // allow calling as addch(y, x, c);
  window_t.prototype.addch = shortcut_move(window_t.prototype.addch);
  window_t.prototype.addch = attributify(window_t.prototype.addch);
  exports.addch = simplify(window_t.prototype.addch);

  // helper function for addch()
  var addClasses = function(element, old_attrs, new_attrs) {
    var added = function(attr) {
      return (new_attrs & attr) && ! (old_attrs & attr);
    };
    var i;
    for (i = 0; i < attr_names.length; i++) {
      var flag_name = 'A_' + attr_names[i].toUpperCase();
      var class_name = 'a-' + attr_names[i];
      if (added(exports[flag_name])) {
        element.addClass(class_name);
      }
    }
    if ((new_attrs & 0xFFFF) !== (old_attrs & 0xFFFF)) {
      var color_pair = (new_attrs & 0xFFFF) >> 8;
      if (color_pair !== 0) {
        element.addClass('pair-' + color_pair);
      }
    }
  };

  // helper function for addch()
  var removeClasses = function(element, old_attrs, new_attrs) {
    var removed = function(attr) {
      return ! (new_attrs & attr) && (old_attrs & attr);
    };
    var i;
    for (i = 0; i < attr_names.length; i++) {
      var flag_name = 'A_' + attr_names[i].toUpperCase();
      var class_name = 'a-' + attr_names[i];
      if (removed(exports[flag_name])) {
        element.addClass(class_name);
      }
    }
    if ((new_attrs & 0xFFFF) !== (old_attrs & 0xFFFF)) {
      var color_pair = (old_attrs & 0xFFFF) >> 8;
      if (color_pair !== 0) {
        element.removeClass('pair-' + color_pair);
      }
    }
  };

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
    var color_pair = attrs & 0xFFFF;
    if (color_pair === 0) {
      color_pair = this.attrs & 0xFFFF;
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
    var color_pair = this.attrs & 0xFFFF;
    var new_attrs = ((attrs >> 16) << 16);
    new_attrs = ~new_attrs & this.attrs;
    if (attrs & 0xFFFF) {
      new_attrs = new_attrs & 0x0000;
    }
    this.attrset(new_attrs);
  };
  exports.attroff = simplify(window_t.prototype.attroff);

  // used for event handling

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

  // stop running js-curses. 
  //
  // TODO: implement this function.
  window_t.prototype.endwin = function() {
  };
  exports.endwin = simplify(window_t.prototype.endwin);
})();
