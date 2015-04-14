/**
 * Create a new window at position (y,x), with height `height` and width
 * `width`. The parent window is the object newwin() is applied on (or the
 * default screen, it applicable). The child window is returned by this 
 * function.
 *
 * The child window is always drawn over the content of the parent window,
 * even if the child window is empty (it will simply draw empty chars, most
 * likely empty space, unless bkgd() is called).
 *
 * The created window starts being drawn on the next refresh() call.
 *
 * @param {Integer} y y position of the window, in characters.
 * @param {Integer} x x position of the window, in characters.
 * @param {Integer} height height of the window, in characters.
 * @param {Integer} width width of the window, in characters.
 * @return {window_t} The created child window.
 **/
window_t.prototype.newwin = 
  screen_t.prototype.newwin = function(height, width, y, x) {
    if (typeof y !== "number") {
      throw new TypeError("y is not a number");
    }
    if (y < 0) {
      throw new RangeError("y is negative");
    }
    if (typeof x !== "number") {
      throw new TypeError("x is not a number");
    }
    if (x < 0) {
      throw new RangeError("x is negative");
    }
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
    // create the window
    var win = new window_t(this.parent_screen);
    win.win_y = y;
    win.win_x = x;
    win.height = height;
    win.width = width;
    win.parent = this;
    // add to parent's subwindows
    this.subwindows.push(win);
    // create the 2D array of tiles
    for (j = 0; j < height; j++) {
      win.tiles[j] = [];
      for (i = 0; i < width; i++) {
	win.tiles[j][i] = new tile_t();
      }
    }
    // draw each tile
    for (j = 0; j < height; j++) {
      for (i = 0; i < width; i++) {
	win.addch(j, i, win.empty_char);
	win.tiles[j][i].empty = true;
      }
    }
    // undraw each 'covered' tile in the parent
    this.unexpose(y, x, height, width);
    // return the created window
    return win;
  };
exports.newwin = simplify(screen_t.prototype.newwin);

/**
 * Draw the background character `c`, using attrlist `attrs`, as the new
 * background character for the window. All the places that are already filled
 * with the current background character are replaced with the new one on
 * next refresh() call.
 *
 * @param {Character} c New background character.
 * @param {Attrlist} attrs New attrlist for the background.
 **/
window_t.prototype.bkgd = function(c, attrs) {
  // TODO: use attrset() instead of attron()
  attrs |= 0;
  var y, x;
  for (y = 0; y < this.height; y++) {
    for (x = 0; x < this.width; x++) {
      if (this.tiles[y][x].empty) {
        this.addch(y, x, c, attrs);
        this.tiles[y][x].empty = true;
      }
    }
  }
  this.empty_char = c;
  this.empty_attrs = attrs;
};

/**
 * Draw a box around the window, using the border() function, but in a simpler
 * way. Use box() instead of border() when all corners use the same character,
 * all vertical borders use the same character, and all horizontal borders use
 * the same character.
 *
 * `corner` is the character used to draw the four corners of the box;
 * `vert` is the character used to draw the left and right borders; and
 * `horiz` is the character used to draw the top and bottom borders.
 *
 * You can call this function specifying only character arguments, in which
 * case the window's current default attributes are used for the characters.
 * You can also specify an attrlist argument after each character argument
 * in order to force each character's attributes to the specified values.
 *
 * For instance, you can call box() by doing:
 *     win.box(); // default attributes for everything
 *     win.box('|', '-', A_BOLD); // top/bottom borders are bold;
 *                                // corners and left/right borders are normal
 *
 * @param {ChType} [vert=ACS_VLINE] One, or two arguments, that describe the
 *   character for the left and right borders, and its attributes.
 * @param {ChType} [horiz=ACS_HLINE] One, or two arguments, that describe the
 *   character for the left and right borders, and its attributes.
 **/
screen_t.prototype.box =
  window_t.prototype.box = function(vert, horiz) {
    var defaults = [ACS_VLINE, ACS_HLINE];
    var chars = parse_chtypes(arguments, defaults, this);
    vert = chars[0];
    horiz = chars[1];
    this.border(vert.value, vert.attrs, vert.value, vert.attrs,
		horiz.value, horiz.attrs, horiz.value, horiz.attrs);
  };
exports.box = simplify(screen_t.prototype.box);

/**
 * Draw a box around a window, using the specified characters and attributes for
 * each side of the box.
 *
 * You can call this function specifying only character arguments, in which case
 * the window's current default attributes are used for the characters. You
 * can also specify an attrlist argument after each character argument in order
 * to force each character's attributes to the specified values.
 *
 * For instance, you can call border() by doing:
 *     win.border(); // default for everything
 *     win.border('|', '|', '-', '-'); // specify character for non-corners
 *     // left border is bold, right border is reverse:
 *     win.border('|', A_BOLD, '|', A_REVERSE);
 *
 * @param {ChType} [ls=ACS_VLINE] Character (and attributes) for left side.
 * @param {ChType} [rs=ACS_VLINE] Character (and attributes) for right side.
 * @param {ChType} [ts=ACS_HLINE] Character (and attributes) for top side.
 * @param {ChType} [bs=ACS_HLINE] Character (and attributes) for bottom side.
 * @param {ChType} [tl=ACS_ULCORNER] Character (and attributes) for top left
 * corner.
 * @param {ChType} [tr=ACS_URCORNER] Character (and attributes) for top right
 * corner.
 * @param {ChType} [bl=ACS_LLCORNER] Character (and attributes) for bottom left
 * corner.
 * @param {ChType} [br=ACS_LRCORNER] Character (and attributes) for bottom right
 * corner.
 */
screen_t.prototype.border =
  window_t.prototype.border = function(ls, rs, ts, bs, tl, tr, bl, br) {
    var defaults = [ACS_VLINE, ACS_VLINE,
		    ACS_HLINE, ACS_HLINE,
		    ACS_ULCORNER, ACS_URCORNER, ACS_LLCORNER, ACS_LRCORNER];
    var chars = parse_chtypes(arguments, defaults, this);
    // draw corners
    this.addch(0, 0, chars[4].value, chars[4].attrs);
    this.addch(0, this.width - 1, chars[5].value, chars[5].attrs);
    this.addch(this.height - 1, 0, chars[6].value, chars[6].attrs);
    this.addch(this.height - 1, this.width - 1, chars[7].value, chars[7].attrs);
    // draw borders
    this.vline(1, 0, chars[0].value, this.height - 2, chars[0].attrs);
    this.vline(1, this.width - 1, chars[1].value, this.height - 2,
	       chars[1].attrs);
    this.hline(0, 1, chars[2].value, this.width - 2, chars[2].attrs);
    this.hline(this.height - 1, 1, chars[3].value, this.width - 2,
	       chars[3].attrs);
  };
exports.border = simplify(screen_t.prototype.border);

// helper function for passing arguments to box() and border()
var parse_chtypes = function(arglist, defaults, win) {
  var chars = [];
  var i, j;
  for (i = 0, j = 0; i < arglist.length; i++, j++) {
    if (typeof arglist[i] === "string" || arglist[i].length !== 1) {
      var ch = {
        value: arglist[i]
      };
      if (typeof arglist[i + 1] === "number") {
        ch.attrs = arglist[i + 1];
        i++;
      }
      else {
        ch.attrs = win.attrs;
      }
      chars.push(ch);
    }
    else {
      throw new TypeError("expected a character for argument " + (i + 1));
    }
  }
  while (j < defaults.length) {
    chars.push({
      value: defaults[j],
      attrs: win.attrs
    });
    j++;
  }
  return chars;
};

/**
 * Delete a window, and remove it from its parent window. Force a redraw
 * on the part of the parent window that was being covered by this window.
 * The redraw only happens when refresh() is next called.
 * 
 * TODO
 **/
window_t.prototype.delwin = function() {
  // force a redraw on the parent, in the area corresponding to this window
  this.parent.expose(this.win_y, this.win_x, this.height, this.width);
  // remove from the parent's subwindows
  var i;
  for (i = 0; i < this.parent.subwindows.length; i++) {
    if (this.parent.subwindows[i] === this) {
      break;
    }
  }
  if (i !== this.parent.subwindows.length) {
    this.parent.subwindows.splice(i, 1);
  }
};
