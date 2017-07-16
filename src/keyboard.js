import { stdscr } from "./stdscr";
import { screen_t, tile_t } from "./types";
import { is_key_press } from "./functions";
import "./event";

/**
 * Name constants for keys. Useful for commonly-used keycodes, especially the
 * non-alphanumeric keys. All of their names start with `KEY_`. For instance,
 * there are `KEY_LEFT`, `KEY_UP`, `KEY_ESC`, `KEY_ENTER`, etc.
 *
 * There is also a constant for each letter of the alphabet (`KEY_A`, `KEY_B`,
 * etc.)
 **/
export const KEY_LEFT = 37;
export const KEY_UP = 38;
export const KEY_RIGHT = 39;
export const KEY_DOWN = 40;
export const KEY_ESC = 27;
export const KEY_TAB = 9;
export const KEY_BACKSPACE = 8;
export const KEY_HOME = 36;
export const KEY_END = 35;
export const KEY_ENTER = 13;
export const KEY_PAGE_UP = 33;
export const KEY_PAGE_DOWN = 34;

export const KEY_A = 65;
export const KEY_B = 66;
export const KEY_C = 67;
export const KEY_D = 68;
export const KEY_E = 69;
export const KEY_F = 70;
export const KEY_G = 71;
export const KEY_H = 72;
export const KEY_I = 73;
export const KEY_J = 74;
export const KEY_K = 75;
export const KEY_L = 76;
export const KEY_M = 77;
export const KEY_N = 78;
export const KEY_O = 79;
export const KEY_P = 80;
export const KEY_Q = 81;
export const KEY_R = 82;
export const KEY_S = 83;
export const KEY_T = 84;
export const KEY_U = 85;
export const KEY_V = 86;
export const KEY_W = 87;
export const KEY_X = 88;
export const KEY_Y = 89;
export const KEY_Z = 90;

export const KEY_RESIZE = "$RESIZE";

// called by initscr() to add keyboard support
// TODO: don't export this function
export function handle_keyboard(scr, container, require_focus) {
  // grab keyboard events for the whole page, or the container, depending
  // on the require_focus argument
  const keyboard_target = require_focus ? container : document.body;
  if (require_focus) {
    // apply tabindex="0" so this element can actually receive focus
    container.setAttribute("tabindex", "0");
  }
  keyboard_target.addEventListener("keydown", event => {
    // true iff the event key event should not be sent to the browser
    let cancel = scr._raw;
    if (is_key_press(event)) {
      // trigger the event, and call event handlers as
      // handler(keycode, event, screen);
      const returned = scr.trigger("keydown", event.which, event, scr);
      if (typeof returned === "boolean") {
        cancel = ! returned;
      }
    }
    // disable most browser shortcuts if the _raw flag is on for the window, and
    // the handlers did not return true
    return !cancel;
  });
  if (scr.auto_height || scr.auto_width) {
    window.addEventListener("resize", () => {
      // calculate the new width/height of the screen, in characters
      let height = scr.height;
      let width = scr.width;
      if (scr.auto_height) {
        height = Math.floor(container.offsetHeight / scr.font.char_height);
        if (scr.min_height) {
          height = Math.max(height, scr.min_height);
        }
      }
      if (scr.auto_width) {
        width = Math.floor(container.offsetWidth / scr.font.char_width);
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
      // change the "official" width/height of the window
      scr.height = height;
      scr.width = width;
      // force redrawing of the whole window
      // scr.full_refresh();
      // fire an event for getch() and the like, with KEY_RESIZE as the keycode
      scr.trigger("keydown", KEY_RESIZE);
    });
  }
}

// helper function for resizing a canvas while trying to keep its current state
export function resize_canvas(scr, height, width) {
  // create a new canvas to replace the current one (with the new size)
  // this is because resizing a canvas also clears it
  let h = height * scr.font.char_height;
  let w = width * scr.font.char_width;
  const new_canvas = document.createElement("canvas");
  new_canvas.setAttribute("height", h);
  new_canvas.setAttribute("width", w);
  const ctx = new_canvas.getContext("2d");
  const prev_h = scr.height * scr.font.char_height;
  const prev_w = scr.width * scr.font.char_width;
  h = Math.min(prev_h, h);
  w = Math.min(prev_w, w);
  // copy the old canvas onto the new one
  ctx.drawImage(scr.canvas,
                0, 0, w, h,
                0, 0, w, h);
  // replace the old canvas with the new one
  scr.canvas.replaceWith(new_canvas);
  scr.canvas = new_canvas;
  scr.context = ctx;
  // add the necessary tiles to the tile-grid
  for (let y = 0; y < scr.height; y++) {
    for (let x = scr.width; x < width; x++) {
      scr.tiles[y][x] = new tile_t();
      scr.tiles[y][x].content = " ";
      scr.display[y][x] = new tile_t();
      scr.display[y][x].content = "";
    }
  }
  for (let y = scr.height; y < height; y++) {
    scr.tiles[y] = [];
    scr.display[y] = [];
    for (let x = 0; x < width; x++) {
      scr.tiles[y][x] = new tile_t();
      scr.tiles[y][x].content = " ";
      scr.display[y][x] = new tile_t();
      scr.display[y][x].content = "";
    }
  }
}

/**
 * Disable most browser shortcuts, allowing your application to use things like
 * Ctrl+C and Ctrl+T as keybindings within the application.
 *
 * You may want to use the `require_focus` option in initscr() if you use this
 * function.
 **/
screen_t.prototype.raw = function() {
  this._raw = true;
};
export function raw() {
  return stdscr.raw();
}

/**
 * Enables most browser shortcuts; undoes a previous call to raw(). This is
 * the default behaviour.
 **/
screen_t.prototype.noraw = function() {
  this._raw = false;
};
export function noraw() {
  return stdscr.noraw();
}

/**
 * All characters typed by the user are printed at the cursor's position.
 *
 * TODO
 **/
screen_t.prototype.echo = function() {
  this._echo = true;
};
export function echo() {
  return stdscr.echo();
}

/**
 * All characters not typed by the user are printed at the cursor's position.
 * Undoes a previous call to echo(). This is the default behaviour.
 **/
screen_t.prototype.noecho = function() {
  this._echo = false;
};
export function noecho() {
  return stdscr.noecho();
}

/**
 * Enables non-printable characters to also be grabbed as keyboard events
 * (especially arrow keys, among others).
 *
 * TODO
 **/
screen_t.prototype.keypad = function() {};
export function keypad() {
  return stdscr.keypad();
}
