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
var load_font = function(scr, font_name, font_size) {
  scr.context.font = 'Bold ' + font_size + 'px ' + font_name;
  scr.context.textAlign = 'left';
  var c = 'm';
  // calculate the probable font metrics
  var metrics = scr.context.measureText(c);
  var height = font_size + 2;
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
  scr.font.name = font_name;
  scr.font.size = font_size;
  scr.font.char_height = height;
  scr.font.char_width = width;
  // create an offscreen canvas for rendering
  var offscreen = make_offscreen_canvas(scr.font);
  scr.offscreen_canvases = [offscreen];
};
exports.loadfont = simplify(screen_t.prototype.loadfont);

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
  var k;
  for (k in this.changes) {
    var change = this.changes[k];
    var attrs = change.attrs;
    var c = change.value;
    var char_cache = this.char_cache;
    draw_char(this, change.at.y, change.at.x, c, char_cache, attrs);
  }
  this.changes = {};
};
exports.refresh = simplify(screen_t.prototype.refresh);

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
screen_t.prototype.addch = function(c) {
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
    // pixel-pos for drawing
    var draw_x = Math.round(this.font.char_width * this.x);
    var draw_y = Math.round(this.font.char_height * this.y);
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
  else if (this.y < this.height - 1) {
    // or continue to next line if the end of the line was reached
    this.move(this.y + 1, 0);
  }
}; 
// allow calling as addch(y, x, c);
screen_t.prototype.addch = shortcut_move(screen_t.prototype.addch);
screen_t.prototype.addch = attributify(screen_t.prototype.addch);
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
 *
 * @param {Integer} [y] y position for output.
 * @param {Integer} [x] x position for output.
 * @param {Character} str Character to be drawn.
 * @param {Attrlist} [attrs] Temporary attributes to be applied.
 **/
screen_t.prototype.addstr = function(str) {
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
exports.addstr = simplify(screen_t.prototype.addstr);

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

// draw a character at pixel-pos (x,y) on window `scr`
//
// the character drawn is `c`, with attrlist `attrs`, and may be pulled
// from the canvas cache ̀`char_cache`
//
// draw_char() is used by refresh() to redraw characters where necessary
var draw_char = function(scr, y, x, c, char_cache, attrs) {
  var offscreen = find_offscreen_char(scr, c, char_cache, attrs);
  // apply the drawing onto the visible canvas
  scr.context.drawImage(offscreen.canvas,
                        offscreen.sx, offscreen.sy,
                        scr.font.char_width, scr.font.char_height,
                        x, y,
                        scr.font.char_width, scr.font.char_height);
};

// used by draw_char for finding (or creating) a canvas where the character
// `c` is drawn with attrlist `attrs`
//
// the return value is an object of the format:
// {
//   canvas: (canvas element),
//   sy: (Y position of the character on the canvas element),
//   sx: (X position of the character on the canvas element)
// }
var find_offscreen_char = function(scr, c, char_cache, attrs) {
  // number for the color pair for the character
  var color_pair = pair_number(attrs);
  // foreground and background colors
  var bg = color_pairs[color_pair].bg;
  var fg = color_pairs[color_pair].fg;
  // source y, source x, and source canvas for drawing
  var sy = 0;
  var sx;
  var canvas;
  // if the char is already drawn on one of the offscreen canvases, with the
  // right attributes
  if (char_cache[c] && char_cache[c][attrs]) {
    // graphics saved, just use the cache
    canvas = char_cache[c][attrs].canvas;
    sx = char_cache[c][attrs].sx;
  }
  else {
    // if canvas is full, use another canvas
    if (scr.offscreen_canvas_index >= CHARS_PER_CANVAS - 1) {
      scr.offscreen_canvas_index = 0;
      canvas = make_offscreen_canvas(scr.font);
      scr.offscreen_canvases.push(canvas);
    }
    canvas = scr.offscreen_canvases[scr.offscreen_canvases.length - 1];
    var ctx = canvas.ctx;
    sx = Math.round(scr.offscreen_canvas_index * scr.font.char_width);
    // populate the `char_cache` with wher to find this character
    if (! char_cache[c]) {
      char_cache[c] = {};
    }
    scr.char_cache[c][attrs] = {
      canvas: canvas,
      sx: sx
    };
    // draw a background
    ctx.fillStyle = (attrs & A_REVERSE) ? fg : bg;
    ctx.fillRect(sx, 0, scr.font.char_width, scr.font.char_height);
    // choose a font
    var font = (attrs & A_BOLD) ? 'Bold ' : '';
    font += scr.font.size + 'px ' + scr.font.name;
    ctx.font = font;
    ctx.textBaseline = 'hanging';
    // draw the character
    ctx.fillStyle = (attrs & A_REVERSE) ? bg : fg;
    ctx.fillText(c, sx, 1);
    scr.offscreen_canvas_index++;
  }
  // return an object describing the location of the character
  return {
    canvas: canvas[0],
    sx: sx,
    sy: sy
  };
};

