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
