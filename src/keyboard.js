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

var construct_key_table = function() {
  for (var k in keys) {
    exports['KEY_' + k] = keys[k];
  }
  for (k = 'A'.charCodeAt(0); k <= 'Z'.charCodeAt(0); k++) {
    var c = String.fromCharCode(k);
    exports['KEY_' + c] = k;
  }
};
construct_key_table();

// called by initscr() to add keyboard support
var handle_keyboard = function(win, container, require_focus) {
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
// TODO
var keypad = exports.keypad = function() {};

