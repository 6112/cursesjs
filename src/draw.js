import { color_pairs, pair_number } from "./color";
import { A_BOLD, A_NORMAL, A_REVERSE, A_UNDERLINE } from "./constants";
import { screen_t, window_t } from "./types";
import { stdscr } from "./stdscr";

// number of chars saved per off-screen canvas
export const CHARS_PER_CANVAS = 256;

/**
 * Used for selecting which channels to use to render a BMP font. Will default
 * to CHANNEL_ALPHA.
 */
export const CHANNEL_RED = 0;
export const CHANNEL_GREEN = 1;
export const CHANNEL_BLUE = 2;
export const CHANNEL_ALPHA = 3;

// Load a TTF font. The font should already be preloaded before calling this
// function. Automatically called by initscr().
//
// Print warning messages to the web console when the font does not appear to
// be a monospace font.
//
// @param {Object} font Font to be loaded, as passed to initscr().
export function load_ttf_font(scr, font) {
  scr.context.font = "Bold " + font.height + "px " + font.name;
  scr.context.textAlign = "left";
  let c = "m";
  // calculate the probable font metrics
  const metrics = scr.context.measureText(c);
  const height = Math.round(font.height + font.line_spacing);
  const width = Math.round(metrics.width);
  // check that it's (probably) a monospace font
  var testChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ" +
    "_-+*@ ()[]{}/\\|~`,.0123456789";
  for (const c of testChars) {
    const metrics = scr.context.measureText(c);
    if (Math.round(metrics.width) !== width) {
      console.warn(font.name + " does not seem to be a monospace font");
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
  offscreen.ctx.font = font.height + "px " + font.name;
  scr.canvas_pool.normal.canvases = [offscreen];
  if (font.use_bold) {
    offscreen = make_offscreen_canvas(scr.font);
    offscreen.ctx.font = "Bold " + font.height + "px " + font.name;
    scr.canvas_pool.bold.canvases = [offscreen];
  }
}

// Load a BMP font from an image. The image should already be preloaded before
// calling this function. This function is called automatically by initscr().
//
// @param {Object} font Font description, as passed to initscr().
export function load_bitmap_font(scr, font) {
  var bitmap = font.name;
  var char_height = font.height;
  var char_width = font.width;
  if (typeof bitmap === "string") {
    const src = bitmap;
    bitmap = document.createElement("img");
    bitmap.setAttribute("src", src);
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
  scr.small_offscreen = document.createElement("canvas");
  scr.small_offscreen.setAttribute("height", char_height);
  scr.small_offscreen.setAttribute("width", char_width);
}

/**
 * Clear the whole window immediately, without waiting for the next refresh. Use
 * this sparingly, as this can cause very bad performance if used too many
 * times per second.
 **/
window_t.prototype.clear = function() {
  // reset all the character tiles
  // TODO: support setting attributes for empty_char
  var y, x;
  for (y = 0; y < this.height; y++) {
    for (x = 0; x < this.width; x++) {
      var tile = this.tiles[y][x];
      tile.empty = true;
      tile.content = this.empty_char;
      tile.attrs = A_NORMAL;
    }
  }
};
export function wclear(window) {
  return window.clear();
}
export function clear() {
  return stdscr.clear();
}

window_t.prototype.clrtoeol = function() {
  hline(this.empty_char, this.width - this.x, A_NORMAL);
};
export function wclrtoeol(window) {
  return window.clrtoeol();
}
export function clrtoeol() {
  return stdscr.clrtoeol();
}

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
};
export function refresh() {
  return stdscr.refresh();
}

/**
 * Push the changes made to the buffer, such as those made with addstr() and
 * addch(). The canvas is updated to reflect the new state of the window. Uses
 * differential display.
 *
 * Note that if ̀win` is a subwindow of `screen`, and `screen` wants to draw in
 * the same place as `win`, win.refresh() should be called after
 * screen.refresh(). (as in the original ncurses)
 */
window_t.prototype.refresh = function() {
  const scr = this.parent_screen;
  // for each changed character
  for (let y = 0; y < this.height; y++) {
    for (let x = 0; x < this.width; x++) {
      const prev = scr.display[y + this.win_y][x + this.win_x];
      const next = this.tiles[y][x];
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
};
export function wrefresh(window) {
  return window.refresh();
}

// TODO: remove expose/unexpose and related behavior
window_t.prototype.expose = function(y, x, height, width) {
  for (let j = y; j < y + height; j++) {
    for (let i = x; i < x + width; i++) {
      const tile = this.tiles[y][x];
      tile.exposed = true;
      this.addch(y, x, tile.content, tile.attrs);
    }
  }
};

window_t.prototype.unexpose =function(y, x, height, width) {
  for (let j = y; j < y + height; j++) {
    for (let i = x; i < x + width; i++) {
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
 * @param {Integer} [y] y position for output.
 * @param {Integer} [x] x position for output.
 * @param {Character} c Character to be drawn.
 * @param {Attrlist} [attrs] Temporary attributes to be applied.
 **/
window_t.prototype.addch = function(y, x, c, attrs) {
  if (typeof y === "number") {
    this.move(y, x);
  }
  else {
    [y, x, c, attrs] = [undefined, undefined, y, x];
  }
  if (typeof c !== "string" || c.length !== 1) {
    throw new RangeError("c is not a character");
  }
  if (this.x >= this.width || this.x < 0) {
    throw new RangeError("invalid coordinates");
  }
  // treat all whitespace as a single space character
  if (c === "\t" || c === "\n" || c === "\r") {
    c = this.empty_char;
  }
  var tile = this.tiles[this.y][this.x];
  const old_attrs = this.attrs;
  if (typeof attrs === "number") {
    this.attron(attrs);
  }
  // only do this if the content (or attrlist) changed
  if (c !== tile.content || this.attrs !== tile.attrs) {
    // update the tile
    tile.content = c;
    tile.empty = false;
    tile.attrs = this.attrs;
  }
  if (typeof attrs === "number") {
    this.attrset(old_attrs);
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
export function waddch(window, y, x, c, attrs) {
  return window.addch(y, x, c, attrs);
}
export function addch(y, x, c, attrs) {
  return stdscr.addch(y, x, c, attrs);
}

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
window_t.prototype.addstr = function(y, x, str, attrs) {
  if (typeof y === "number") {
    this.move(y, x);
  }
  else {
    [y, x, str, attrs] = [undefined, undefined, y, x];
  }
  const old_attrs = this.attrs;
  if (typeof attrs === "number") {
    this.attron(attrs);
  }
  let i;
  for (i = 0; i < str.length && this.x < this.width; i++) {
    this.addch(str[i]);
  }
  if (typeof attrs === "number") {
    this.attrset(old_attrs);
  }
  if (i !== str.length) {
    throw new RangeError("not enough room to add the whole string");
  }
};
export function waddstr(window, y, x, str, attrs) {
  return window.addstr(y, x, str, attrs);
}
export function addstr(y, x, str, attrs) {
  return stdscr.addstr(y, x, str, attrs);
}

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
window_t.prototype.vline = function(y, x, ch, n, attrs) {
  if (typeof y === "number") {
    this.move(y, x);
  }
  else {
    [y, x, ch, n, attrs] = [undefined, undefined, y, x, ch];
  }
  const start_y = this.y;
  const start_x = this.x;
  for (let y = 0; y < n && y + start_y < this.height; y++) {
    this.addch(y + start_y, start_x, ch, attrs);
  }
  this.move(start_y, start_x);
};
export function wvline(window, y, x, ch, n, attrs) {
  return window.wvline(y, x, ch, n, attrs);
}
export function vline(y, x, ch, n, attrs) {
  return stdscr.vline(y, x, ch, n, attrs);
}

/**
 * Draw a horizontal line using `ch` at the current position. The cursor does
 * not move. The maximum length of the line is `n` characters. If the end of the
 * screen or window is reached, the line stops.
 *
 * If called with two integers as the first arguments, move to those coordinates
 * first (as per move()), and stay there after the line is drawn.
 *
 * @param {Integer} [y=this.y]
 * @param {Integer} [x=this.x]
 * @param {Character} ch Character used to draw the line.
 * @param {Integer} n Length of the line, in characters.
 * @param {Attrlist} attrs Attributes to apply to `ch`.
 **/
window_t.prototype.hline = function(y, x, ch, n, attrs) {
  if (typeof y === "number") {
    this.move(y, x);
  }
  else {
    [y, x, ch, n, attrs] = [undefined, undefined, y, x, ch];
  }
  const start_y = this.y;
  const start_x = this.x;
  for (let x = 0; x < n && x + start_x < this.width; x++) {
    this.addch(start_y, x + start_x, ch, attrs);
  }
  this.move(start_y, start_x);
};
export function whline(window, y, x, ch, n, attrs) {
  return window.whline(y, x, ch, n, attrs);
}
export function hline(ch, n, attrs) {
  return stdscr.hline(ch, n, attrs);
}

// used for creating an off-screen canvas for pre-rendering characters
function make_offscreen_canvas(font) {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("height", font.char_height);
  canvas.setAttribute("width", CHARS_PER_CANVAS * font.char_width);
  canvas.ctx = canvas.getContext("2d");
  canvas.ctx.textBaseline = "hanging";
  return canvas;
}

// draw a character at pixel-pos (x,y) on window `scr`
//
// the character drawn is `c`, with attrlist `attrs`, and may be pulled
// from the canvas cache ̀`char_cache`
//
// draw_char() is used by refresh() to redraw characters where necessary
function draw_char(scr, y, x, c, attrs) {
  const offscreen = find_offscreen_char(scr, c, attrs);
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
}

// used by draw_char for finding (or creating) a canvas where the character
// `c` is drawn with attrlist `attrs`
//
// the return value is an object of the format:
// {
//   src: (canvas element),
//   sy: (Y position of the character on the canvas element),
//   sx: (X position of the character on the canvas element)
// }
function find_offscreen_char(scr, c, attrs) {
  // check if it's a (c,attrs) pair that's already been drawn before;
  // if it is, use the same character as before
  const found = find_in_cache(scr, c, attrs);
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
}

// return an object describing where the character is if it can be
// found in the `char_cache`. if it cannot be found, return null.
function find_in_cache(scr, c, attrs) {
  const char_cache = scr.char_cache;
  if (char_cache[c] && char_cache[c][attrs]) {
    // found, return an object describing where the character is
    return char_cache[c][attrs];
  }
  // not found, return a value indicating that
  return null;
}

// add a canvas to the canvas pool if necessary, so that an offscreen
// character never ends up being drawn outside of its corresponding
// offscreen canvas (by being drawn too far to the right)
function grow_canvas_pool(scr) {
  for (const k in scr.canvas_pool) {
    const pool = scr.canvas_pool[k];
    if (pool.x >= CHARS_PER_CANVAS - 1) {
      pool.x = 0;
      const canvas = make_offscreen_canvas(scr.font);
      canvas.ctx.font = pool.canvases[pool.canvases.length - 1].ctx.font;
      pool.canvases.push(canvas);
    }
  }
}

// return an array [fg, bg] describing the foreground and background colors for
// the given attrlist.
function attr_colors(attrs) {
  const color_pair = pair_number(attrs);
  let bg = color_pairs[color_pair].bg;
  let fg = color_pairs[color_pair].fg;
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
}

function draw_offscreen_char_bmp(scr, c, attrs) {
  // used for storing the drawn character in case it has to be redrawn
  // (for better performacne)
  const char_cache = scr.char_cache;
  // calculate the colours for everything
  const [fg, bg] = attr_colors(attrs);
  // calculate where to draw the character
  const pool = scr.canvas_pool.normal;
  const canvas = pool.canvases[pool.canvases.length - 1];
  const ctx = canvas.ctx;
  const sy = 0;
  const sx = Math.round(pool.x * scr.font.char_width);
  // save info in the char cache
  if (! char_cache[c]) {
    char_cache[c] = {};
  }
  scr.char_cache[c][attrs] = {
    src: canvas,
    sy: sy,
    sx: sx
  };
  if (! scr.font.char_map[c]) {
    // silently fail if we don't know where to find the character on
    // the original bitmap image
    return null;
  }
  // calculate coordinates from the source image
  const bitmap_y = Math.round(
    scr.font.char_map[c][0] *
      (scr.font.char_height - scr.font.line_spacing));
  const bitmap_x = Math.round(scr.font.char_map[c][1] * scr.font.char_width);
  // draw a background
  ctx.fillStyle = bg;
  ctx.fillRect(sx, sy, scr.font.char_width, scr.font.char_height);
  // draw the character on a separate, very small, offscreen canvas
  const small = scr.small_offscreen.getContext("2d");
  const height = scr.font.char_height;
  const width = scr.font.char_width;
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
  const pixels = small.getImageData(0, 0, width, height).data;
  for (let y = 0; y < height - scr.font.line_spacing; y++) {
    for (let x = 0; x < width; x++) {
      const value = pixels[(y * width + x) * 4 + scr.font.channel];
      if (value !== 0) {
        // TODO: use putImageData() to improve performance in some
        // browsers
        const dst_x = Math.round(sx + x);
        const dst_y = Math.round(sy + y + scr.font.line_spacing / 2);
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
}

function draw_offscreen_char_ttf(scr, c, attrs) {
  // used for storing the drawn character in case it has to be redrawn
  // (for better performance)
  const char_cache = scr.char_cache;
  // calculate the colours for everything
  const [fg, bg] = attr_colors(attrs);
  // calculate where to draw the character
  const pool =
      ((attrs & A_BOLD) && scr.font.use_bold) ?
        scr.canvas_pool.bold :
        scr.canvas_pool.normal;
  const canvas = pool.canvases[pool.canvases.length - 1];
  const ctx = canvas.ctx;
  const sy = 0;
  const sx = Math.round(pool.x * scr.font.char_width);
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
}

// draw the cursor at the current location
export function draw_cursor(scr) {
  if (scr._cursor_visibility === 1) {
    // line cursor
    const y = Math.round((scr.y + 1) * scr.font.char_height - 2);
    const x = Math.round(scr.x * scr.font.char_width);
    const tile = scr.tiles[scr.y][scr.x];
    scr.context.fillStyle = attr_colors(tile.attrs)[0];
    scr.context.fillRect(x, y, Math.round(scr.font.char_width - 1), 2);
  }
  else {
    // block cursor
    const y = scr.y;
    const x = scr.x;
    const tile = scr.tiles[y][x];
    draw_char(scr, y, x, tile.content, tile.attrs ^ A_REVERSE);
  }
}

// clear the cursor from its previous position
// (optional: supply previous position)
export function undraw_cursor(scr, y, x) {
  if (typeof y !== "number" || typeof x !== "number") {
    y = scr.y;
    x = scr.x;
  }
  const tile = scr.tiles[y][x];
  draw_char(scr, y, x, tile.content, tile.attrs);
}
