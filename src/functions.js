// TODO: move everything in this file to more relevant files, and delete this
// file

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
var start_blink = function(scr) {
  scr._blinkTimeout = setTimeout(function() {
    do_blink(scr);
  }, BLINK_DELAY);
};

var do_blink = function(scr) {
  var y = scr.y;
  var x = scr.x;
  var tile = scr.tiles[y][x];
  draw_char(scr, y, x, tile.content, tile.attrs ^ A_REVERSE);
  scr._blinking = true;
  scr._blinkTimeout = setTimeout(function() {
    do_unblink(scr);
  }, BLINK_DELAY);
};

var do_unblink = function(scr) {
  var y = scr.y;
  var x = scr.x;
  var tile = scr.tiles[y][x];
  draw_char(scr, y, x, tile.content, tile.attrs);
  scr._blinking = false;
  scr._blinkTimeout = setTimeout(function() {
    do_blink(scr);
  }, BLINK_DELAY);
};

/**
 * Move the cursor to a given position on the screen. If the position is outside
 * of the screen's bound, a RangeError is thrown.
 *
 * All output from addch() and addstr() is done at the position of the cursor.
 *
 * @param {Integer} y y position of the new position.
 * @param {Integer} x x position of the new position.
 * @throws RangeError
 **/
screen_t.prototype.move = window_t.prototype.move = function(y, x) {
  if (y < 0 || y >= this.height || x < 0 || x >= this.width) {
    throw new RangeError("coordinates out of range");
  }
  // var tile = this.tiles[this.y][this.x];
  if (this._blink) {
    var tile = this.tiles[this.y][this.x];
    draw_char(this, this.y, this.x, tile.content, tile.attrs);
  }
  this.y = y;
  this.x = x;
};
exports.move = simplify(screen_t.prototype.move);
