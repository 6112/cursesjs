import { window_t } from "./types"
import { stdscr } from "./stdscr"
import { COLOR_MASK } from "./constants"

/**
 * Set the new attrlist for the screen to the specified attrlist. Any previous
 * attributes are overwrittent completely.
 *
 * @param {Attrlist} attrs New attributes' values.
 **/
window_t.prototype.attrset = function(attrs) {
  this.attrs = attrs
}
export function wattrset(window, attrs) {
  return window.attrset(attrs)
}
export function attrset(attrs) {
  return stdscr.attrset(attrs)
}

/**
 * Turn on an attribute (or multiple attributes, if you use a binary OR).
 *
 * Example:
 *     // add these attributes
 *     attron(A_BOLD | A_REVERSE | COLOR_PAIR(3));
 *     // in bold, with color pair 3, and foreground/background swapped
 *     addstr("hello world");
 *
 * @param {Attrlist} attrs Attributes to be added.
 **/
window_t.prototype.attron = function(attrs) {
  let color_pair = attrs & COLOR_MASK
  if (color_pair === 0)
    color_pair = this.attrs & COLOR_MASK
  let other_attrs = ((attrs >> 16) << 16)
  other_attrs = other_attrs | ((this.attrs >> 16) << 16)
  const new_attrs = other_attrs | color_pair
  this.attrset(new_attrs)
}
export function wattron(window, attrs) {
  return window.attron(attrs)
}
export function attron(attrs) {
  return stdscr.attron(attrs)
}

/**
 * Turn off an attribute (or multiple attributes, if you use a binary OR).
 *
 * Example:
 *     // add these attributes
 *     attron(A_BOLD | COLOR_PAIR(1));
 *     addstr("i am bold, and red);
 *     // remove only the color attribute
 *     attroff(COLOR_PAIR(1));
 *     addstr("i am not red, but I am still bold");
 *     // remove the bold attribute
 *     attroff(A_BOLD);
 *     addstr("i am neither red, nor bold");
 *
 * @param {Attrlist} attrs Attributes to be removed.
 **/
window_t.prototype.attroff = function(attrs) {
  let new_attrs = ((attrs >> 16) << 16)
  new_attrs = ~new_attrs & this.attrs
  if (attrs & COLOR_MASK)
    new_attrs = new_attrs & ~COLOR_MASK
  this.attrset(new_attrs)
}
export function wattroff(window, attrs) {
  return window.attroff(attrs)
}
export function attroff(attrs) {
  return stdscr.attroff(attrs)
}
