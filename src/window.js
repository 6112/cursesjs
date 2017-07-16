import { window_t, tile_t } from "./types";
import { stdscr } from "./stdscr";
import {
  ACS_VLINE, ACS_HLINE, ACS_ULCORNER, ACS_URCORNER, ACS_LLCORNER,
  ACS_LRCORNER }from "./constants";

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
window_t.prototype.newwin = function(height, width, y, x) {
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
  const win = new window_t(this.parent_screen);
  win.win_y = y;
  win.win_x = x;
  win.height = height;
  win.width = width;
  win.parent = this;
  // add to parent's subwindows
  this.subwindows.push(win);
  // create the 2D array of tiles
  for (let j = 0; j < height; j++) {
    win.tiles[j] = [];
    for (let i = 0; i < width; i++) {
      win.tiles[j][i] = new tile_t();
    }
  }
  // draw each tile
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      win.addch(j, i, win.empty_char);
      win.tiles[j][i].empty = true;
    }
  }
  // undraw each 'covered' tile in the parent
  this.unexpose(y, x, height, width);
  // return the created window
  return win;
};
export function newwin(height, width, y, x) {
  return stdscr.newwin(height, width, y, x);
}

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
  // TODO: implement for screen_t (and test)
  attrs |= 0;
  for (let y = 0; y < this.height; y++) {
    for (let x = 0; x < this.width; x++) {
      if (this.tiles[y][x].empty) {
        this.addch(y, x, c, attrs);
        this.tiles[y][x].empty = true;
      }
    }
  }
  this.empty_char = c;
  this.empty_attrs = attrs;
};
export function wbkgd(window, c, attrs) {
  return window.bkgd(c, attrs);
}
export function bkgd(c, attrs) {
  return stdscr.bkgd(c, attrs);
}

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
window_t.prototype.box = function(vert, horiz) {
  const defaults = [ACS_VLINE, ACS_HLINE];
  const chars = parse_chtypes(arguments, defaults, this);
  vert = chars[0];
  horiz = chars[1];
  this.border(vert.value, vert.attrs, vert.value, vert.attrs,
              horiz.value, horiz.attrs, horiz.value, horiz.attrs);
};
export function wbox(window, vert, horiz) {
  return window.box(vert, horiz);
}
export function box(vert, horiz) {
  return stdscr.box(vert, horiz);
}

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
// eslint-disable-next-line no-unused-vars
window_t.prototype.border = function(ls, rs, ts, bs, tl, tr, bl, br) {
  const defaults = [ACS_VLINE, ACS_VLINE,
                    ACS_HLINE, ACS_HLINE,
                    ACS_ULCORNER, ACS_URCORNER, ACS_LLCORNER, ACS_LRCORNER];
  const chars = parse_chtypes(arguments, defaults, this);
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
// eslint-disable-next-line no-unused-vars
export function wborder(window, ls, rs, ts, bs, tl, tr, bl, br) {
  return window.border(...Array.prototype.slice.call(arguments, 1));
}
// eslint-disable-next-line no-unused-vars
export function border(ls, rs, ts, bs, tl, tr, bl, br) {
  return stdscr.border(...arguments);
}

// helper function for passing arguments to box() and border()
function parse_chtypes(arglist, defaults, win) {
  const chars = [];
  let i;
  for (i = 0; i < arglist.length; i++) {
    const arg = arglist[i];
    const next_arg = arglist[i + 1];
    console.log(arg);
    if (typeof arg === "string" || arg.length !== 1) {
      const ch = { value: arg };
      if (typeof next_arg === "number") {
        ch.attrs = next_arg;
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
  while (i < defaults.length) {
    chars.push({
      attrs: win.attrs,
      value: defaults[i++],
    });
  }
  return chars;
}

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
  let i;
  for (i = 0; i < this.parent.subwindows.length; i++) {
    if (this.parent.subwindows[i] === this) {
      break;
    }
  }
  if (i !== this.parent.subwindows.length) {
    this.parent.subwindows.splice(i, 1);
  }
};
