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
 * webpage. For instance, the following are legal:
 *
 *     // creating the screen
 *     var screen = initscr({
 *       container: '#container',
 *       height: 30,
 *       width: 30,
 *       font: {
 *         type: 'ttf',
 *         name: 'Oxygen Mono',
 *         height: 14
 *       },
 *       require_focus: true
 *     });
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
 * arguments. See load_ttf_font() and load_bmp_font() for more information on
 * font loading.
 *
 * If `require_focus` is true, the screen will only grab keyboard events when
 * it receives focus; additionally, it will make sure that it has a way to
 * grab the keyboard focus, by setting the HTML "tabindex" attribute for its
 * container. If `require_focus` is false or unspecified, then the screen
 * will grab all keyboard events on the webpage, which may get in the way
 * of the web browser's shortcuts, and a lot of other things.
 *
 * Examples:
 *     // ttf font:
 *     initscr({
 *       container: '#container',
 *       height: 60,
 *       width: 80,
 *       font: {
 *         type: 'ttf',
 *         name: 'Source Code Pro',
 *         height: 12
 *       },
 *       require_focus: true
 *     });
 *     // bitmap font:
 *     var char_table = [
 *       'abcdefghijklmnopqrstuvwxyz', // each line corresponds to a line inside
 *       'ABCDEFGHIJKLMNOPQRSTUVWXYZ', // the image to be loaded
 *       ' ,.!@#$%?&*()[]{}'
 *     ];
 *     initscr({
 *       container: '#canvas',
 *       height: 30,
 *       width: 40,
 *       font: {
 *         type: 'bmp',
 *         name: 'my_image.png',
 *         height: 16,
 *         width: 8
 *       },
 *       require_focus: true
 *     });
 * 
 * @param {Object} opts Options object for the initscr() function.
 * @param {String|HTMLElement|jQuery} [opts.container=$('<pre></pre>')] HTML
 * element or CSS selector for the element that will wrap the <canvas> element
 * used for drawing.
 * @param {Integer} [opts.height=(auto)] Height of the screen, in characters. If
 * unspecified or 0, will be just enough characters to fill the `container`
 * element, rounded down.
 * @param {Integer} [opts.min_height=0] Minimum height of the screen, in
 * characters, for when `height` is unspecified.
 * @param {Integer} [opts.width=(auto)] Width of the screen, in chracters. If
 * unspecified or 0, will be just enough characters to fill the `container`
 * element, rounded down.
 * @param {Integer} [opts.min_width=0] Minimum width of the screen, in
 * characters, for when `width` is unspecified.
 * @param {Boolean} [opts.require_focus=false] Whether focus is required for
 * keyboard events to be registered; if `true`, forces `opts.container` to be
 * able to receive keyboard focus, by setting its `tabindex` HTML attribute.
 * @param {Object} opts.font Object describing the font to use.
 * @param {String} [opts.font.type="ttf"] Either "ttf" or "bmp"; says which type
 * of font should be loaded. "ttf" indicates that it is a font name, and "bmp"
 * indicates that the font should be loaded from an image.
 * @param {String} opts.font.name For a TTF, indicates the name of the font. The
 * filetype should not be added to the end for TTF fonts. For a BMP font,
 * indicates the path for downloading the .png image for the font. The image
 * should be composed of characters with set height and width, in a grid
 * disposition, and starting from pixel (0,0) in the image. In any case, the
 * font that you want to load should already have been preloaded by the browser
 * before `initscr()` is called.
 * @param {Integer} opts.font.height Height, in pixels, of a character from the
 * loaded font.
 * @param {Integer} opts.font.width Width, in pixels, of a character from the
 * loaded font. Only relevant if a BMP font is loaded, and must be supplied if a
 * BMP font is loaded.
 * @param {Integer} [opts.font.line_spacing=0] Number of pixels between two
 * lines of text.
 * @param {Array[String]} [opts.font.chars=CODEPAGE_437] Each array element
 * describes a line in the image for the BMP font being loaded. Each element
 * should be a string that describes the contiguous characters on that line. See
 * the example code.
 * @param {Boolean} [opts.font.use_bold=true] `true` iff the bold font variant
 * should be used for bold text. `false` indicates that bold text will only be
 * drawn in a brighter color, without actually being bold. Only relevant for TTF
 * fonts.
 * @param {Integer} [opts.font.channel=CHANNEL_ALPHA] Use this to select the
 * channel to be used for a BMP font. It should be one of CHANNEL_ALPHA,
 * CHANNEL_RED, CHANNEL_GREEN, or CHANNEL_BLUE.
 **/
var initscr = exports.initscr = function(opts) {
  // check arg validity
  check_initscr_args.apply(this, arguments);
  // set some default values for arguments
  opts.require_focus |= false;
  opts.font.type = /^bmp$/i.test(opts.font.type) ? "bmp" : "ttf";
  opts.font.line_spacing |= 0;
  opts.font.chars = opts.font.chars || CODEPAGE_437;
  if (opts.font.use_bold === undefined) {
    opts.font.use_bold = true;
  }
  // `container` can either be a DOM element, or an ID for a DOM element
  if (opts.container !== undefined) {
    opts.container = $(opts.container);
  }
  else {
    opts.container = $('<pre></pre>');
  }
  // clear the container
  opts.container.html('');
  // create a new screen_t object
  var scr = new screen_t();
  scr.container = opts.container;
  // set the height, in characters
  scr.height = opts.height;
  scr.width = opts.width;
  // create the canvas
  scr.canvas = $('<canvas></canvas>');
  scr.container.append(scr.canvas);
  scr.context = scr.canvas[0].getContext('2d');
  // load the specified font
  // TODO: specify sane default values
  if (/^ttf$/i.test(opts.font.type)) {
    load_ttf_font(scr, opts.font);
  }
  else {
    load_bitmap_font(scr, opts.font);
  }
  // handle default, 'cover the whole container' size
  if (! opts.height) {
    scr.auto_height = true;
    scr.height = Math.floor(opts.container.height() / scr.font.char_height);
    if (opts.min_height) {
      scr.height = Math.max(scr.height, opts.min_height);
      scr.min_height = opts.min_height;
    }
  }
  if (! opts.width) {
    scr.auto_width = true;
    scr.width = Math.floor(opts.container.width() / scr.font.char_width);
    if (opts.min_width) {
      scr.width = Math.max(scr.width, opts.min_width);
      scr.min_width = opts.min_width;
    }
  }
  scr.canvas.attr({
    height: scr.height * scr.font.char_height,
    width: scr.width * scr.font.char_width
  });
  // initialize the character tiles to default values
  var y, x;
  for (y = 0; y < scr.height; y++) {
    scr.tiles[y] = [];
    for (x = 0; x < scr.width; x++) {
      scr.tiles[y][x] = new tile_t();
      scr.tiles[y][x].content = '';
    }
  }
  // set the created window as the default window for most operations
  // (so you can call functions like addstr(), getch(), etc. directly)
  default_screen = scr;
  // draw a background
  scr.clear();
  // add keyboard hooks
  handle_keyboard(scr, opts.container, opts.require_focus);
  // make a blinking cursor
  start_blink(scr);
  // return the created window
  return scr;
};

// helper function for checking the type & validity of arguments to initscr()
var check_initscr_args = function(opts) {
  if (typeof opts !== "object") {
    throw new TypeError("opts is not an object");
  }
  if (opts.height) {
    if (typeof opts.height !== "number" ) {
      throw new TypeError("height is not a number");
    }
    if (opts.height < 0) {
      throw new RangeError("height is negative");
    }
  }
  if (opts.min_height && typeof opts.min_height !== "number") {
    throw new TypeError("min_height is not a number");
  }
  if (opts.width) {
    if (typeof opts.width !== "number") {
      throw new TypeError("width is not a number");
    }
    if (opts.width < 0) {
      throw new RangeError("width is negative");
    }
  }
  if (opts.min_width && typeof opts.min_width !== "number") {
    throw new TypeError("min_width is not a number");
  }
  if (typeof opts.font !== "object") {
    throw new TypeError("font is not an object");
  }
  if (typeof opts.font.name !== "string" ) {
    throw new TypeError("font.name is not a string");
  }
  if (typeof opts.font.height !== "number") {
    throw new TypeError("font.height is not a number");
  }
  if (! /^ttf$/i.test(opts.font.type)) {
    if (typeof opts.font.width !== "number") {
      throw new TypeError("font.width is not a number, for a BMP font");
    }
    if (opts.font.chars && ! (opts.font.chars instanceof Array)) {
      throw new TypeError("font.chars is not an array");
    }
    if (typeof opts.font.channel !== "number") {
      opts.font.channel = CHANNEL_ALPHA;
    }
  }
  if (opts.font.line_spacing) {
    if (typeof opts.font.line_spacing !== "number") {
      throw new TypeError("font.line_spacing is not a number");
    }
    if (opts.font.line_spacing < 0) {
      throw new TypeError("font.line_spacing is negative");
    }
  }
};

/**
 * Return the maximum possible position the cursor can have in the window. This
 * corresponds to the position of the cursor in the bottom right corner. The
 * object is returned in the following format:
 *
 *     {
 *       y: (maximum y),
 *       x: (maximum x)
 *     }
 *
 * @return {Object} Object describing the bottom right corner of the screen.
 **/
screen_t.prototype.getmaxyx = function() {
  return {
    y: this.height - 1,
    x: this.width - 1
  };
};
exports.getmaxyx = simplify(screen_t.prototype.getmaxyx);

/**
 * Enable a blinking cursor.
 **/
screen_t.prototype.blink = function() {
  if (! this._blink) {
    start_blink(this);
  }
  this._blink = true;
};
exports.blink = simplify(screen_t.prototype.blink);

/**
 * Disable a blinking cursor.
 **/
screen_t.prototype.noblink = function() {
  if (this._blink) {
    clearTimeout(this._blink_timeout);
    do_unblink(this);
    clearTimeout(this._blink_timeout);
    this._blink_timeout = 0;
  }
  this._blinking = false;
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
