import {
  assert, defined,
  isNumber, isObject, isPositiveNumber, isString } from "./assert"
import { stdscr, set_stdscr } from "./stdscr"
import { CODEPAGE_437 } from "./constants"
import { screen_t, tile_t, window_t } from "./types"
import { handle_keyboard } from "./keyboard"
import {
  CHANNEL_ALPHA, do_blink, draw_cursor, load_bitmap_font, load_ttf_font,
  undraw_cursor } from "./draw"
import { start_blink } from "./functions"

/**
 * Create a new screen, set is at the default screen, and return it.
 *
 * A screen uses an HTML Canvas element as its display in order to render
 * characters on-screen; it needs to have a specified, fixed, height and width,
 * and a specified, fixed, font and font size.
 *
 * The created screen is set as the "default screen". This allows calling
 * all curses.js in a C-style way, without explicitly specifying the screen
 * most method calls apply to, assuming initscr() is called only once for the
 * webpage. For instance, the following are legal:
 *
 *     // creating the screen
 *     var screen = initscr({
 *       container: "#container",
 *       height: 30,
 *       width: 30,
 *       font: {
 *         type: "ttf",
 *         name: "Oxygen Mono",
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
 *       container: "#container",
 *       height: 60,
 *       width: 80,
 *       font: {
 *         type: "ttf",
 *         name: "Source Code Pro",
 *         height: 12
 *       },
 *       require_focus: true
 *     });
 *     // bitmap font:
 *     var char_table = [
 *       "abcdefghijklmnopqrstuvwxyz", // each line corresponds to a line inside
 *       "ABCDEFGHIJKLMNOPQRSTUVWXYZ", // the image to be loaded
 *       " ,.!@#$%?&*()[]{}"
 *     ];
 *     initscr({
 *       container: "#canvas",
 *       height: 30,
 *       width: 40,
 *       font: {
 *         type: "bmp",
 *         name: "my_image.png",
 *         height: 16,
 *         width: 8
 *       },
 *       require_focus: true
 *     });
 *
 * @param {Object} opts Options object for the initscr() function.
 * @param {String|HTMLElement|jQuery}
 *     [opts.container=document.createElement("pre")] HTML element or CSS
 *     selector for the element that will wrap the <canvas> element used for
 *     drawing.
 * @param {Integer} [opts.height=(auto)] Height of the screen, in characters. If
 *     unspecified or 0, will be just enough characters to fill the `container`
 *     element, rounded down.
 * @param {Integer} [opts.min_height=0] Minimum height of the screen, in
 *     characters, for when `height` is unspecified.
 * @param {Integer} [opts.width=(auto)] Width of the screen, in chracters. If
 *     unspecified or 0, will be just enough characters to fill the `container`
 *     element, rounded down.
 * @param {Integer} [opts.min_width=0] Minimum width of the screen, in
 *     characters, for when `width` is unspecified.
 * @param {Boolean} [opts.require_focus=false] Whether focus is required for
 *     keyboard events to be registered; if `true`, forces `opts.container` to
 *     be able to receive keyboard focus, by setting its `tabindex` HTML
 *     attribute.
 * @param {Object} opts.font Object describing the font to use.
 * @param {String} [opts.font.type="ttf"] Either "ttf" or "bmp"; says which type
 *     of font should be loaded. "ttf" indicates that it is a font name, and
 *     "bmp" indicates that the font should be loaded from an image.
 * @param {String} opts.font.name For a TTF, indicates the name of the font. The
 *     filetype should not be added to the end for TTF fonts. For a BMP font,
 *     indicates the path for downloading the .png image for the font. The image
 *     should be composed of characters with set height and width, in a grid
 *     disposition, and starting from pixel (0,0) in the image. In any case, the
 *     font that you want to load should already have been preloaded by the
 *     browser before `initscr()` is called.
 * @param {Integer} opts.font.height Height, in pixels, of a character from the
 *     loaded font.
 * @param {Integer} opts.font.width Width, in pixels, of a character from the
 *     loaded font. Only relevant if a BMP font is loaded, and must be supplied
 *     if a BMP font is loaded.
 * @param {Boolean} [opts.font.use_char_cache=true] true iff a cache should be
 *     used to store every drawn character, so that it can be redrawn much
 *     faster next time. This improves performance a lot, but can increase
 *     memory usage by a lot in some cases.
 * @param {Integer} [opts.font.line_spacing=0] Number of pixels between two
 *     lines of text.
 * @param {Array[String]} [opts.font.chars=CODEPAGE_437] Each array element
 *     describes a line in the image for the BMP font being loaded. Each element
 *     should be a string that describes the contiguous characters on that
 *     line. See the example code.
 * @param {Boolean} [opts.font.use_bold=true] `true` iff the bold font variant
 *     should be used for bold text. `false` indicates that bold text will only
 *     be drawn in a brighter color, without actually being bold. Only relevant
 *     for TTF fonts.
 * @param {Integer} [opts.font.channel=CHANNEL_ALPHA] Use this to select the
 *     channel to be used for a BMP font. It should be one of CHANNEL_ALPHA,
 *     CHANNEL_RED, CHANNEL_GREEN, or CHANNEL_BLUE.
 **/
export function initscr(opts) {
  // check arg validity
  check_initscr_args.apply(this, arguments)
  // set some default values for arguments
  opts.require_focus = opts.require_focus || false
  opts.font.type = isBmp(opts.font.type) ? "bmp" : "ttf"
  opts.font.line_spacing = opts.font.line_spacing || 0
  opts.font.chars = opts.font.chars || CODEPAGE_437
  if (defined(opts.font.use_bold))
    opts.font.use_bold = true
  if (defined(opts.font.use_char_cache))
    opts.font.use_char_cache = true
  // `container` should be a DOM element
  if (!defined(opts.container))
    opts.container = document.createElement("pre")
  // clear the container
  opts.container.innerHTML = ""
  // create a new screen_t object
  const scr = new screen_t()
  scr.container = opts.container
  // set the height, in characters
  scr.height = opts.height
  scr.width = opts.width
  // create the canvas
  scr.canvas = document.createElement("canvas")
  scr.container.appendChild(scr.canvas)
  scr.context = scr.canvas.getContext("2d")
  // load the specified font
  // TODO: specify sane default values
  if (isTtf(opts.font.type))
    load_ttf_font(scr, opts.font)
  else
    load_bitmap_font(scr, opts.font)
  // handle default, 'cover the whole container' size
  if (!defined(opts.height)) {
    scr.auto_height = true
    scr.height = Math.floor(opts.container.offsetHeight / scr.font.char_height)
    if (defined(opts.min_height)) {
      scr.height = Math.max(scr.height, opts.min_height)
      scr.min_height = opts.min_height
    }
  }
  if (!defined(opts.width)) {
    scr.auto_width = true
    scr.width = Math.floor(opts.container.offsetWidth / scr.font.char_width)
    if (defined(opts.min_width)) {
      scr.width = Math.max(scr.width, opts.min_width)
      scr.min_width = opts.min_width
    }
  }
  scr.canvas.setAttribute("height", scr.height * scr.font.char_height)
  scr.canvas.setAttribute("width", scr.width * scr.font.char_width)
  // initialize the character tiles to default values
  for (let y = 0; y < scr.height; y++) {
    scr.tiles[y] = []
    scr.display[y] = []
    for (let x = 0; x < scr.width; x++) {
      scr.tiles[y][x] = new tile_t()
      scr.tiles[y][x].content = ""
      scr.display[y][x] = new tile_t()
      scr.display[y][x].content = ""
    }
  }
  // set the created window as the default window for most operations
  // (so you can call functions like addstr(), getch(), etc. directly)
  set_stdscr(scr)
  // draw a background
  scr.clear()
  // add keyboard hooks
  handle_keyboard(scr, opts.container, opts.require_focus)
  // make a blinking cursor
  start_blink(scr)
  // return the created window
  return scr
}

function isBmp(type) {
  return /^bmp$/i.test(type)
}

function isTtf(type) {
  return /^ttf$/i.test(type)
}

// helper function for checking the type & validity of arguments to initscr()
function check_initscr_args(opts) {
  assert(isObject(opts), "opts is not an object")
  assert(isObject(opts.font), "font is not an object")
  assert(isString(opts.font.name), "font.name is not a string")
  assert(isNumber(opts.font.height), "font.height is not a number")
  if (!defined(opts.font.type))
    opts.font.type = "ttf"
  assert(isBmp(opts.font.type) || isTtf(opts.font.type),
         "font.type is invalid. should be 'bmp' or 'ttf'")
  if(isBmp(opts.font.type)) {
    assert(isPositiveNumber(opts.font.width),
           "font.width is not a positive number")
    if (defined(opts.font.chars))
      assert(opts.font.chars instanceof Array, "font.chars is not an array")
    if (!isPositiveNumber(opts.font.channel))
      opts.font.channel = CHANNEL_ALPHA
  }
  if (defined(opts.font.line_spacing))
    assert(isPositiveNumber(opts.font.line_spacing),
           "font.line_spacing is not a positive number")
  if (defined(opts.height))
    assert(isPositiveNumber(opts.height), "height is not a positive number")
  if (defined(opts.min_height))
    assert(isNumber(opts.min_height),
           "min_height is not a positive number")
  if (defined(opts.width))
    assert(isPositiveNumber(opts.width), "width is not a positive number")
  if (defined(opts.min_width))
    assert(isPositiveNumber(opts.min_width),
           "min_width is not a positive number")
}

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
window_t.prototype.getmaxyx = function() {
  return {
    y: this.height - 1,
    x: this.width - 1
  }
}
export function getmaxyx(window) {
  return window.getmaxyx()
}

/**
 * Make the cursor blink once every BLINK_DELAY milliseconds, if it is visible.
 **/
screen_t.prototype.blink = function() {
  if (! this._blink)
    start_blink(this)
  this._blink = true
}
export function blink() {
  return stdscr.blink()
}

/**
 * Make the cursor stop blinking, if it is visible. See blink().
 **/
screen_t.prototype.noblink = function() {
  if (this._blink) {
    clearTimeout(this._blink_timeout)
    do_blink(this)
    clearTimeout(this._blink_timeout)
    this._blink_timeout = 0
  }
  this._blinking = false
  this._blink = false
}
export function noblink() {
  return stdscr.noblink()
}


/**
 * Set the visibility of the cursor, as a number from 0 to 2, 2 being the most
 * visible, and 0 being completely invisible.
 *
 * @param {Integer} visibility
 **/
screen_t.prototype.curs_set = function(visibility) {
  this._cursor_visibility = visibility
  if (visibility)
    draw_cursor(this)
  else
    undraw_cursor(this)
}
export function curs_set(visibility) {
  return stdscr.curs_set(visibility)
}

/**
 * Quit curses.js.
 *
 * TODO
 **/
screen_t.prototype.endwin = function() {
}
export function endwin() {
  return stdscr.endwin()
}
