/**
 * Some flags that can be used for attron(), attroff(), and attrset().
 **/
var A_NORMAL = exports.A_NORMAL = 0;
var A_STANDOUT = exports.A_STANDOUT = 0x10000; // TODO
var A_UNDERLINE = exports.A_UNDERLINE = A_STANDOUT << 1;
var A_REVERSE = exports.A_REVERSE = A_STANDOUT << 2;
var A_BLINK = exports.A_BLINK = A_STANDOUT << 3; // TODO
var A_DIM = exports.A_DIM = A_STANDOUT << 4; // TODO
var A_BOLD = exports.A_BOLD = A_STANDOUT << 5;

/**
 * Set the new attrlist for the screen to the specified attrlist. Any previous
 * attributes are overwrittent completely.
 *
 * @param {Attrlist} attrs New attributes' values.
 **/
screen_t.prototype.attrset = window_t.prototype.attrset = function(attrs) {
  this.attrs = attrs;
};
exports.attrset = simplify(screen_t.prototype.attrset);

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
screen_t.prototype.attron = window_t.prototype.attron = function(attrs) {
  var color_pair = attrs & COLOR_MASK;
  if (color_pair === 0) {
    color_pair = this.attrs & COLOR_MASK;
  }
  var other_attrs = ((attrs >> 16) << 16);
  other_attrs = other_attrs | ((this.attrs >> 16) << 16);
  var new_attrs = other_attrs | color_pair;
  this.attrset(new_attrs);
};
exports.attron = simplify(screen_t.prototype.attron);

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
screen_t.prototype.attroff = window_t.prototype.attroff = function(attrs) {
  var color_pair = this.attrs & COLOR_MASK;
  var new_attrs = ((attrs >> 16) << 16);
  new_attrs = ~new_attrs & this.attrs;
  if (attrs & COLOR_MASK) {
    new_attrs = new_attrs & ~COLOR_MASK;
  }
  this.attrset(new_attrs);
};
exports.attroff = simplify(screen_t.prototype.attroff);
