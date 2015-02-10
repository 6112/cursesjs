window_t.prototype.newwin = 
  screen_t.prototype.newwin = function(y, x, height, width) {
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
  var win = new window_t();
  win.win_y = y;
  win.win_x = x;
  win.height = height;
  win.width = width;
  win.parent = this;
  this.subwindows.push(win);
  for (j = 0; j < height; j++) {
    win.tiles[j] = [];
    for (i = 0; i < width; i++) {
      win.tiles[j][i] = new tile_t();
    }
  }
  for (j = 0; j < height; j++) {
    for (i = 0; i < width; i++) {
      win.addch(j, i, ' ');
    }
  }
  this.unexpose(y, x, height, width);
  return win;
};
exports.newwin = simplify(screen_t.prototype.newwin);

window_t.prototype.box = function() {
  this.addch(0, 0, '+');
  this.addch(this.height - 1, 0, '+');
  this.addch(0, this.width - 1, '+');
  this.addch(this.height - 1, this.width - 1, '+');
  var y, x;
  for (y = 1; y < this.height - 1; y++) {
    this.addch(y, 0, '|');
    this.addch(y, this.width - 1, '|');
  }
  for (x = 1; x < this.width - 1; x++) {
    this.addch(0, x, '-');
    this.addch(this.height - 1, x, '-');
  }
};
