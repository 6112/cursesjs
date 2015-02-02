// number of chars saved per off-screen canvas
var CHARS_PER_CANVAS = 256;

// load a font with given attributes font_name and font_size
var load_font = function(win, font_name, font_size) {
  win.context.font = 'Bold ' + font_size + 'px ' + font_name;
  win.context.textAlign = 'left';
  var c = 'm';
  // calculate the probable font metrics
  var metrics = win.context.measureText(c);
  var height = font_size + 2;
  var width = Math.round(metrics.width);
  // check that it's (probably) a monospace font
  var testChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ" + 
    "_-+*@ ()[]{}/\\|~`,.0123456789";
  var i;
  for (i = 0; i < testChars.length; i++) {
    c = testChars[i];
    metrics = win.context.measureText(c);
    if (Math.round(metrics.width) !== width) {
      console.warn(font_name + ' does not seem to be a monospace font');
    }
  }
  // resize the canvas
  win.canvas.attr({
    height: Math.round(win.height * height),
    width: Math.round(win.width * width)
  });
  // save the currently used font
  win.font.name = font_name;
  win.font.size = font_size;
  win.font.char_height = height;
  win.font.char_width = width;
  // create an offscreen canvas for rendering
  var offscreen = make_offscreen_canvas(win.font);
  win.offscreen_canvases = [offscreen];
};
exports.loadfont = simplify(screen_t.prototype.loadfont);

// clear the whole window
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

// update the canvas, pushing the actual changes made with drawing functions
// (such as addstr() and addch()) and refreshing the screen.
//
// in other words, addstr() and addch() do nothing until refresh() is called.
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

// output a single character to the console at current position (or move to
// the given position, and then output the given character).
//
// the cursor is moved one position to the right.
//
// all current attributes (as in attron(), attroff() and attrset()) are
// applied to the output.
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

// output a string to the console at current position (or move to the given
// position, and then output the string).
//
// the cursor is moved to the right end of the text.
//
// all current attributes (as in attron(), attroff() and attrset()) are
// applied to the output.
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

// draw a character at pixel-pos (x,y) on window `win'
//
// the character drawn is `c', with attrlist `attrs', and may be pulled
// from the canvas cache ̀`char_cache'
//
// draw_char() is used by refresh() to redraw characters where necessary
var draw_char = function(win, y, x, c, char_cache, attrs) {
  var offscreen = find_offscreen_char(win, c, char_cache, attrs);
  // apply the drawing onto the visible canvas
  win.context.drawImage(offscreen.canvas,
                        offscreen.sx, offscreen.sy,
                        win.font.char_width, win.font.char_height,
                        x, y,
                        win.font.char_width, win.font.char_height);
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
var find_offscreen_char = function(win, c, char_cache, attrs) {
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
    if (win.offscreen_canvas_index >= CHARS_PER_CANVAS - 1) {
      win.offscreen_canvas_index = 0;
      canvas = make_offscreen_canvas(win.font);
      win.offscreen_canvases.push(canvas);
    }
    canvas = win.offscreen_canvases[win.offscreen_canvases.length - 1];
    var ctx = canvas.ctx;
    sx = Math.round(win.offscreen_canvas_index * win.font.char_width);
    // populat the `char_cache' with wher to find this character
    if (! char_cache[c]) {
      char_cache[c] = {};
    }
    win.char_cache[c][attrs] = {
      canvas: canvas,
      sx: sx
    };
    // draw a background
    ctx.fillStyle = (attrs & A_REVERSE) ? fg : bg;
    ctx.fillRect(sx, 0, win.font.char_width, win.font.char_height);
    // choose a font
    var font = (attrs & A_BOLD) ? 'Bold ' : '';
    font += win.font.size + 'px ' + win.font.name;
    ctx.font = font;
    ctx.textBaseline = 'hanging';
    // draw the character
    ctx.fillStyle = (attrs & A_REVERSE) ? bg : fg;
    ctx.fillText(c, sx, 1);
    win.offscreen_canvas_index++;
  }
  // return an object describing the location of the character
  return {
    canvas: canvas[0],
    sx: sx,
    sy: sy
  };
};

