import { window_t } from "./types"
import { stdscr } from "./stdscr"
import { BLINK_DELAY } from "./constants"
import { draw_cursor, undraw_cursor } from "./draw"

// TODO: move everything in this file to more relevant files, and delete this
// file

// keys that are to be ignored for the purposes of events
// TODO
const ignoreKeys = {
  Control: true,
  Shift: true,
  Alt: true,
  AltGraph: true,
  Unidentified: true
}

// return true iff the KeyboardEvent `event' is an actual keypress of a
// printable character, not just a modifier key (like Ctrl, Shift, or Alt)
export function is_key_press(event) {
  // TODO
  return ! ignoreKeys[event.key]
}

// used for making a blinking cursor
export function start_blink(scr) {
  scr._blink_timeout = setTimeout(function() {
    do_blink(scr)
  }, BLINK_DELAY)
}

export function do_blink(scr) {
  if (scr._cursor_visibility)
    draw_cursor(scr)
  scr._blinking = true
  scr._blink_timeout = setTimeout(function() {
    do_unblink(scr)
  }, BLINK_DELAY)
}

function do_unblink(scr) {
  if (scr._cursor_visibility)
    undraw_cursor(scr)
  scr._blinking = false
  scr._blink_timeout = setTimeout(function() {
    do_blink(scr)
  }, BLINK_DELAY)
}

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
window_t.prototype.move = function(y, x) {
  if (y < 0 || y >= this.height || x < 0 || x >= this.width)
    throw new RangeError("coordinates out of range")
  this.y = y
  this.x = x
}
export function wmove(window, y, x) {
  return window.move(y, x)
}
export function move(y, x) {
  return stdscr.move(y, x)
}
