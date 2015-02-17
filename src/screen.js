/**
 * Create a new screen, set is at the default screen, and return it.
 *
 * A screen uses an HTML Canvas element as its display in order to render
 * characters on-screen; it needs to have a specified, fixed, height and width,
 * and a specified, fixed, font and font size.
 *
 * The created screen is set as the "default screen". This allows calling
 * all js-curses in a C-style way, without explicitly specifying the screen
 * most method calls apply to, assuming initscr() is called only once for the
 * webpage. For isntance, the following are legal:
 *
 *     // creating the screen
 *     var screen = initscr('#container', 30, 30, 'Oxygen Mono', 14, true);
 *     // explicitly calling screen.move() and screen.addstr()
 *     screen.move(10, 10);
 *     screen.addstr("hello world");
 *     // implicitly calling screen.move() and screen.addstr()
 *     move(11, 10);
 *     screen.addstr("bonjour world");
 *     // updating the display
 *     refresh(); // or screen.refresh()
 *
 * The created screen is contained within the DOM element `container`; if
 * `container` is a string, it is used as a CSS selector with jQuery; if it
 * is undefined, a DOM element is created to hold the screen.
 *
 * The dimensions of the screen, in columns and rows (character-wise), are
 * specified by the `height` and `width` arguments.
 *
 * The font to use must be specified by the `font_name` and `font_size`
 * arguments. See load_font() for more information on font loading.
 *
 * If `require_focus` is true, the screen will only grab keyboard events when
 * it receives focus; additionally, it will make sure that it has a way to
 * grab the keyboard focus, by setting the HTML "tabindex" attribute for its
 * container. If `require_focus` is false or unspecified, then the screen
 * will grab all keyboard events on the webpage, which may get in the way
 * of the web browser's shortcuts, and a lot of other things.
 *
 * Examples:
 *     initscr('#container', 80, 60, 'Source Code Pro', 12, true);
 *     var char_table = [
 *       'abcdefghijklmnopqrstuvwxyz', // each line corresponds to a line inside
 *       'ABCDEFGHIJKLMNOPQRSTUVWXYZ', // the image to be loaded
 *       ' ,.!@#$%?&*()[]{}'
 *     ];
 *     initscr('#canvas', 40, 30, 'my_image.bmp', 16, 8, char_table);
 * 
 * @param {HTMLElement|String|undefined} container The container for the
 *    display canvas.
 * @param {Integer} height Height, in characters, of the screen.
 * @param {Integer} width Width, in chracters, of the screen.
 * @param {String} [font_name] Name of the TTF font to be loaded. If `font_name`
 * is specified, `font_size` must be specified, and `font_path` and friends
 * cannot be specified.
 * @param {Integer} [font_size] Size, in pixels, of the TTF font to be loaded.
 * @param {String|HTMLImageElement} [font_path] Name, or <img> element, for the
 * image to be used as a spritesheet for the characters for a Bitmap font. If
 * `font_path` is specified, `font_height`, `font_width`, and `font_chars` must
 * be specified, and `font_size` and friends cannot be specified. The characters
 * in the images to be loaded must be contiguous rectangles of constant size.
 * @param {Integer} [font_height] Height, in pixels, of each character in the
 * bitmap font to be loaded.
 * @param {Integer} [font_width] Width, in pixels, of each character in the
 * bitmap font to be loaded.
 * @param {Array[String]} [font_chars] Each array element describes a line in the
 * image for the Bitmap font being loaded. Each element should be a string that
 * describes the contiguous characters on that line. See the example code.
 * @param {Boolean} [require_focus=false] Whether focus is required for keyboard
 *   events to be registered.
 * @return {screen_t} The created screen, and the new default screen.
 **/
var initscr = exports.initscr = function(container, height, width,
                                         font_name, font_size,
                                         require_focus) {
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
  // `container` can either be a DOM element, or an ID for a DOM element
  if (container !== undefined) {
    container = $(container);
  }
  else {
    container = $('<pre></pre>');
  }
  // clear the container
  container.html('');
  // create a new screen_t object
  var scr = new screen_t();
  scr.container = container;
  // set the height, in characters
  scr.height = height;
  scr.width = width;
  // create the canvas
  scr.canvas = $('<canvas></canvas>');
  scr.container.append(scr.canvas);
  scr.context = scr.canvas[0].getContext('2d');
  // load the specified font
  // TODO: specify sane default values
  if (typeof font_name === "string" &&
      ! /\.(jpe?g|png|bmp|gif)$/.test(font_name)) {
    // not an image: load the TTF font
    load_ttf_font(scr, font_name, font_size);
  }
  else {
    // seems to be an image: load the bitmap font
    load_bitmap_font(scr, arguments[3], arguments[4], arguments[5], arguments[6]);
    require_focus = arguments[7];
  }
  // initialize the character tiles to default values
  var y, x;
  for (y = 0; y < height; y++) {
    scr.tiles[y] = [];
    for (x = 0; x < width; x++) {
      scr.tiles[y][x] = new tile_t();
    }
  }
  // set the created window as the default window for most operations
  // (so you can call functions like addstr(), getch(), etc. directly)
  default_screen = scr;
  // draw a background
  scr.clear();
  // add keyboard hooks
  handle_keyboard(scr, container, require_focus);
  // make a blinking cursor
  // TODO: reimplement blinking
  // startBlink(scr);
  // return the created window
  return scr;
};

/**
 * Enable a blinking cursor.
 *
 * TODO
 **/
screen_t.prototype.blink = function() {
  if (! this._blink) {
    startBlink(this);
  }
  this._blink = true;
};
exports.blink = simplify(screen_t.prototype.blink);

/**
 * Disable a blinking cursor.
 *
 * TODO
 **/
screen_t.prototype.noblink = function() {
  if (this._blink) {
    this.tiles[this.y][this.x].element.addClass('a-reverse');
    clearTimeout(this._blinkTimeout);
    this._blinkTimeout = 0;
  }
  this._blink = false;
};
exports.noblink = simplify(screen_t.prototype.noblink);

/**
 * Quit js-curses.
 * 
 * TODO
 **/
screen_t.prototype.endwin = function() {
};
exports.endwin = simplify(screen_t.prototype.endwin);
