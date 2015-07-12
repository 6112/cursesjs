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
var draw_char = function(scr, y, x, c, attrs) {
  var offscreen = find_offscreen_char(scr, c, attrs);
  if (! offscreen) {
    // silently fail, and return false
    return false;
  }
  // apply the drawing onto the visible canvas
  y = Math.round(y * scr.font.char_height);
  x = Math.round(x * scr.font.char_width);
  var i;
  scr.context.drawImage(offscreen.src,
                        offscreen.sx, offscreen.sy,
                        scr.font.char_width, scr.font.char_height,
                        x, y,
                        scr.font.char_width, scr.font.char_height);
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
  scr.char_cache[c][attrs] = {
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
  ctx.save();
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
  ctx.restore();
  // draw the underline if necessary
  if (attrs & A_UNDERLINE) {
    ctx.fillRect(sx, sy + height - 1, width, 1);
  }
  // increment the canvas pool's counter: move to the next character
  pool.x++;
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
