// number of chars saved per off-screen canvas
var CHARS_PER_CANVAS = 256;

/**
 * Load a font with given attributes `font_name` and `font_size`. You should
 * ensure that the font has already been loaded by the browser before calling
 * `load_font`. The bold variant of the font should already have been loaded,
 * if you intend to use it. The usual way to do this is to insert an element
 * that uses that font in your webpage's HTML. This function is automatically
 * called by `initscr`.
 *
 * Print warning messages to the web console when the font does not appear to
 * be a monospace font.
 *
 * @param {String} font_name Name of the font to be loaded.
 * @param {Integer} font_size Size of the font to be loaded.
 **/
// load a font with given attributes font_name and font_size
var load_ttf_font = function(scr, font_name, font_size) {
  scr.context.font = 'Bold ' + font_size + 'px ' + font_name;
  scr.context.textAlign = 'left';
  var c = 'm';
  // calculate the probable font metrics
  var metrics = scr.context.measureText(c);
  var height = font_size + 0;
  var width = Math.round(metrics.width);
  // check that it's (probably) a monospace font
  var testChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ" + 
    "_-+*@ ()[]{}/\\|~`,.0123456789";
  var i;
  for (i = 0; i < testChars.length; i++) {
    c = testChars[i];
    metrics = scr.context.measureText(c);
    if (Math.round(metrics.width) !== width) {
      console.warn(font_name + ' does not seem to be a monospace font');
    }
  }
  // resize the canvas
  scr.canvas.attr({
    height: Math.round(scr.height * height),
    width: Math.round(scr.width * width)
  });
  // save the currently used font
  scr.font = {
    type: "ttf",
    name: font_name,
    size: font_size,
    char_height: height,
    char_width: width
  };
  // create the canvas pool for drawing offscreen characters
  scr.canvas_pool = {
    normal: {
      x: 0,
      canvases: null
    },
    bold: {
      x: 0,
      canvases: null
    }
  };
  var offscreen = make_offscreen_canvas(scr.font);
  offscreen.ctx.font = font_size + 'px ' + font_name;
  scr.canvas_pool.normal.canvases = [offscreen];
  offscreen = make_offscreen_canvas(scr.font);
  offscreen.ctx.font = 'Bold ' + font_size + 'px ' + font_name;
  scr.canvas_pool.bold.canvases = [offscreen];
};

// last arguments are slurped for the char map (to know which
// character is where in the image)
//
// @param {String|HTMLImageElement} bitmap The image to use for
//   drawing
// @param {Integer} char_height Height of a character in the bitmap.
// @param {Integer} char_width Width of a character in the bitmap.
// @param {Array[String]} chars A string for each line in the bitmap
//   file; each character in the string corresponds to a character on
//   that line in the bitmap file.
var load_bitmap_font = function(scr, bitmap, char_height, char_width, chars) {
  if (typeof bitmap === "string") {
    bitmap = $('<img src="' + bitmap + '" />')[0];
  }
  var char_map = {};
  var y, x;
  for (y = 0; y < chars.length; y++) {
    for (x = 0; x < chars[y].length; x++) {
      if (! char_map[chars[y][x]]) {
	char_map[chars[y][x]] = [y, x];
      }
    }
  }
  scr.canvas.attr({
    height: Math.round(scr.height * char_height),
    width: Math.round(scr.width * char_width)
  });
  scr.font = {
    type: "bmp",
    bitmap: bitmap,
    char_height: char_height,
    char_width: char_width,
    char_map: char_map
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
screen_t.prototype.clear = function() {
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
exports.clear = simplify(screen_t.prototype.clear);

/**
 * Push the changes made to the buffer, such as those made with addstr() and
 * addch(). The canvas is updated to reflect the new state of the window. Uses
 * differential display to optimally update only the parts of the screen that
 * have actually changed.
 *
 * Note that functions like addstr() and addch() will not do anything until
 * refresh() is called.
 **/
screen_t.prototype.refresh = function() {
  // for each changed character
  var scr = this;
  var drawfunc = function(y, x, c, attrs) {
    draw_char(scr, y, x, c, attrs);
  };
  refresh_window(this, 0, 0, drawfunc);
  this.changes = {};
};
exports.refresh = simplify(screen_t.prototype.refresh);

// refresh a window
var refresh_window = function(win, dy, dx, drawfunc) {
  var i;
  for (i = 0; i < win.subwindows.length; i++) {
    var subwin = win.subwindows[i];
    refresh_window(subwin, dy + win.win_y, dx + win.win_x, drawfunc);
  }
  var k;
  for (k in win.changes) {
    var change = win.changes[k];
    var pos = change.at;
    if (win.tiles[pos.y][pos.x].exposed) {
      drawfunc(pos.y + win.win_y + dy, pos.x + win.win_x + dx, 
               change.value, change.attrs);
    }
  }
};

window_t.prototype.expose =
  screen_t.prototype.expose = function(y, x, height, width) {
  var j, i;
  for (j = y; j < y + height; j++) {
    for (i = x; i < x + width; i++) {
      var tile = this.tiles[y][x];
      tile.exposed = true;
      this.addch(y, x, tile.content, tile.attrs);
    }
  }
};

window_t.prototype.unexpose = 
  screen_t.prototype.unexpose =function(y, x, height, width) {
  var j, i;
  for (j = y; j < y + height; j++) {
    for (i = x; i < x + width; i++) {
      this.tiles[j][i].exposed = false;
    }
  }
};

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
screen_t.prototype.addch = window_t.prototype.addch = function(c) {
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
    c = this.empty_char;
  }
  var tile = this.tiles[this.y][this.x];
  // only do this if the content (or attrlist) changed
  if (c !== tile.content || this.attrs !== tile.attrs) {
    // update the tile
    tile.content = c;
    tile.empty = false;
    tile.attrs = this.attrs;
    // add an instruction to the 'changes queue'
    this.changes[this.y + ','  + this.x] = {
      at: {
        y: this.y,
        x: this.x
      },
      value: c,
      attrs: this.attrs
    };
  }
  // move to the right
  if (this.x < this.width - 1) {
    this.move(this.y, this.x + 1);
  }
  else if (this.y < this.height - 1) {
    // or continue to next line if the end of the line was reached
    this.move(this.y + 1, 0);
  }
}; 
// allow calling as addch(y, x, c);
screen_t.prototype.addch = shortcut_move(screen_t.prototype.addch);
screen_t.prototype.addch = attributify(screen_t.prototype.addch);
window_t.prototype.addch = shortcut_move(window_t.prototype.addch);
window_t.prototype.addch = attributify(window_t.prototype.addch);
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
 **/
screen_t.prototype.addstr = window_t.prototype.addstr = function(str) {
  var i;
  for (i = 0; i < str.length && this.x < this.width; i++) {
    this.addch(str[i]);
  }
  if (i !== str.length) {
    throw new RangeError("not enough room to add the whole string");
  }
}; 
// allow calling as addstr(y, x, str);
screen_t.prototype.addstr = shortcut_move(screen_t.prototype.addstr);
screen_t.prototype.addstr = attributify(screen_t.prototype.addstr);
window_t.prototype.addstr = shortcut_move(window_t.prototype.addstr);
window_t.prototype.addstr = attributify(window_t.prototype.addstr);
exports.addstr = simplify(screen_t.prototype.addstr);

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
  if (found) {
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

var draw_offscreen_char_bmp = function(scr, c, attrs) {
  // used for storing the drawn character in case it has to be redrawn
  // (for better performacne)
  var char_cache = scr.char_cache;
  // calculate the colours for everything
  var color_pair = pair_number(attrs);
  var bg = color_pairs[color_pair].bg;
  var fg = color_pairs[color_pair].fg;
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
  var bitmap_y = scr.font.char_map[c][0] * scr.font.char_height;
  bitmap_y = Math.round(bitmap_y);
  var bitmap_x = scr.font.char_map[c][1] * scr.font.char_width;
  bitmap_x = Math.round(bitmap_x);
  // draw a background
  ctx.fillStyle = (attrs & A_REVERSE) ? fg : bg;
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
  var pixels = small.getImageData(0, 0, width, height).data;
  ctx.fillStyle = (attrs & A_REVERSE) ? bg : fg;
  var y, x;
  for (y = 0; y < height; y++) {
    for (x = 0; x < width; x++) {
      var alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha !== 0) {
	// TODO: use putImageData() to improve performance in some
	// browsers
	// ctx.putImageData(dot, sx + x, sy + y);
	ctx.fillRect(sx + x, sy + y, 1, 1);
      }
    }
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
  var color_pair = pair_number(attrs);
  var bg = color_pairs[color_pair].bg;
  var fg = color_pairs[color_pair].fg;
  // calculate where to draw the character
  var pool = (attrs & A_BOLD) ? scr.canvas_pool.bold : scr.canvas_pool.normal;
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
  ctx.fillStyle = (attrs & A_REVERSE) ? fg : bg;
  ctx.fillRect(sx, sy, scr.font.char_width, scr.font.char_height);
  // draw the character
  ctx.fillStyle = (attrs & A_REVERSE) ? bg : fg;
  ctx.fillText(c, sx, sy + 1);
  // increment the canvas pool's counter: move to the next character
  pool.x++;
  // return an object telling where to find the offscreen character
  return char_cache[c][attrs];
};

