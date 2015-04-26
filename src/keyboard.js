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
    scr._mouse_down = true;
    if (scr._mousemask & BUTTON1_PRESSED) {
      var mevent = get_mevent(scr, event);
      mevent.id = '$BUTTON1_PRESSED';
      scr._mevents.push(mevent);
      scr.trigger('keydown', KEY_MOUSE, event);
    }
  });
  mouse_target.mouseup(function(event) {
    scr._mouse_down = false;
    if (scr._mousemask & BUTTON1_RELEASED) {
      var mevent = get_mevent(scr, event);
      mevent.id = '$BUTTON1_RELEASED';
      scr._mevents.push(mevent);
      scr.trigger('keydown', KEY_MOUSE, event);
    }
  });
  mouse_target.mousemove(function(event) {
    if (scr._mouse_down) {
      // TODO
    }
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
