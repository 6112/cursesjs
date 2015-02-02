// flags used for attron(), attroff(), and attrset()
//
// these correspond to CSS classes: .a-standout for A_STANDOUT,
// .a-underline for A_UNDERLINE, etc.
//
// A_NORMAL has no associated CSS class (it is the default style)
var A_NORMAL = exports.A_NORMAL = 0;
var A_STANDOUT = exports.A_STANDOUT = 0x10000;
var A_UNDERLINE = exports.A_UNDERLINE = A_STANDOUT << 1;
var A_REVERSE = exports.A_REVERSE = A_STANDOUT << 2;
var A_BLINK = exports.A_BLINK = A_STANDOUT << 3;
var A_DIM = exports.A_DIM = A_STANDOUT << 4;
var A_BOLD = exports.A_BOLD = A_STANDOUT << 5;

// used as a flag for attron(), attroff(), and attrset()
var COLOR_PAIR = exports.COLOR_PAIR = function(n) {
  return n * 0x100;
};

// used for only getting the 'color pair' part of an attrlist
var COLOR_MASK = 0xFFFF;

// used for getting the number (n the 0 to COLOR_PAIRS range) of a color
// pair, from an attrlist
var pair_number = function(n) {
  return (n & COLOR_MASK) >> 8;
};

// table of color pairs used for the application
var color_pairs = {
  0: {
    fg: exports.COLOR_WHITE,
    bg: exports.COLOR_BLACK
  }
};

// initialize a color pair so it can be used with COLOR_PAIR(n) to describe
// a given (fg,bg) pair of colors.
var init_pair = exports.init_pair = function(pair_index,
                                            foreground, background) {
  color_pairs[pair_index] = {
    fg: foreground,
    bg: background
  };
};


// force the text attributes to a new value, resetting any previous values
screen_t.prototype.attrset = function(attrs) {
  this.attrs = attrs;
};
exports.attrset = simplify(screen_t.prototype.attrset);

// turn an attribute (or multiple attributes, using a binary OR) on.
//
// e.g.:
//   attron(A_BOLD | A_REVERSE | COLOR_PAIR(3));
screen_t.prototype.attron = function(attrs) {
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

// turn an attribute (or multiple attributes, using a binary OR) off.
//
// e.g.:
//   attroff(A_BOLD | A_REVERSE);
screen_t.prototype.attroff = function(attrs) {
  var color_pair = this.attrs & COLOR_MASK;
  var new_attrs = ((attrs >> 16) << 16);
  new_attrs = ~new_attrs & this.attrs;
  if (attrs & COLOR_MASK) {
    new_attrs = new_attrs & ~COLOR_MASK;
  }
  this.attrset(new_attrs);
};
exports.attroff = simplify(screen_t.prototype.attroff);
