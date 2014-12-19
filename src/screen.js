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