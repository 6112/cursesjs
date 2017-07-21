// milliseconds between cursor blinks
export const BLINK_DELAY = 200

// default value for the character on 'empty' space
export const EMPTY_CHAR = " "

/**
 * Some flags that can be used for attron(), attroff(), and attrset().
 **/
export const A_NORMAL = 0
export const A_STANDOUT = 0x10000 // TODO
export const A_UNDERLINE = A_STANDOUT << 1
export const A_REVERSE = A_STANDOUT << 2
export const A_BLINK = A_STANDOUT << 3 // TODO
export const A_DIM = A_STANDOUT << 4 // TODO
export const A_BOLD = A_STANDOUT << 5

/**
 * Named constants for colors: COLOR_WHITE, COLOR_RED, COLOR_GREEN, etc.
 **/
export const COLOR_WHITE = ["#b2b2b2", "#FFFFFF"]
export const COLOR_RED = ["#b21818", "#ff5454"]
export const COLOR_GREEN = ["#18b218", "#54ff54"]
export const COLOR_YELLOW = ["#b2b218", "#ffff54"]
export const COLOR_BLUE = ["#1818b2", "#5454ff"]
export const COLOR_MAGENTA = ["#b218b2", "#ff54ff"]
export const COLOR_CYAN = ["#18b2b2", "#54ffff"]
export const COLOR_BLACK = ["#000000", "#545454"]

// export const COLOR_WHITE = ["#CCCCCC", "#FFFFFF"];
// export const COLOR_RED = ["#CC4444", "#FF8888"];
// export const COLOR_GREEN = ["#44CC44", "#88FF88"];
// export const COLOR_YELLOW = ["#CCCC44", "#FFFF88"];
// export const COLOR_BLUE = ["#4444CC", "#8888FF"];
// export const COLOR_MAGENTA = ["#CC44CC", "#FF88FF"];
// export const COLOR_CYAN = ["#44CCCC", "#88FFFF"];
// export const COLOR_BLACK = ["#000000", "#222222"];

// used for only getting the 'color pair' part of an attrlist
export const COLOR_MASK = 0xFFFF

/**
 * Drawing characters. Can be used as variables when a specific character is
 * needed in order to draw a shape.
 **/
// box drawing
export const ACS_ULCORNER = "┌"
export const ACS_LLCORNER = "└"
export const ACS_URCORNER = "┐"
export const ACS_LRCORNER = "┘"
export const ACS_LTEE = "├"
export const ACS_RTEE = "┤"
export const ACS_BTEE = "┴"
export const ACS_TTEE = "┬"
export const ACS_HLINE = "─"
export const ACS_VLINE = "│"
export const ACS_PLUS = "┼"

// box drawing, with double borders
export const ACS_ULCORNER_DOUBLE = "╔"
export const ACS_LLCORNER_DOUBLE = "╚"
export const ACS_URCORNER_DOUBLE = "╗"
export const ACS_LRCORNER_DOUBLE = "╝"
export const ACS_LTEE_DOUBLE = "╠"
export const ACS_RTEE_DOUBLE = "╣"
export const ACS_BTEE_DOUBLE = "╩"
export const ACS_TTEE_DOUBLE = "╦"
export const ACS_HLINE_DOUBLE = "═"
export const ACS_VLINE_DOUBLE = "║"
export const ACS_PLUS_DOUBLE = "╬"

// box drawing, with only one double border
export const ACS_ULCORNER_DOUBLE_RIGHT = "╒"
export const ACS_ULCORNER_DOUBLE_DOWN = "╓"
export const ACS_LLCORNER_DOUBLE_RIGHT = "╘"
export const ACS_LLCORNER_DOUBLE_UP = "╙"
export const ACS_URCORNER_DOUBLE_LEFT = "╕"
export const ACS_URCORNER_DOUBLE_DOWN = "╖"
export const ACS_LRCORNER_DOUBLE_LEFT = "╛"
export const ACS_LRCORNER_DOUBLE_UP = "╜"
export const ACS_LTEE_DOUBLE_RIGHT = "╞"
export const ACS_LTEE_DOUBLE_VERT = "╟"
export const ACS_RTEE_DOUBLE_LEFT = "╡"
export const ACS_RTEE_DOUBLE_VERT = "╢"
export const ACS_TTEE_DOUBLE_HORIZ = "╤"
export const ACS_TTEE_DOUBLE_DOWN = "╥"
export const ACS_BTEE_DOUBLE_HORIZ = "╧"
export const ACS_BTEE_DOUBLE_UP = "╨"
export const ACS_PLUS_DOUBLE_HORIZ = "╪"
export const ACS_PLUS_DOUBLE_VERT = "╫"

// blocks
export const ACS_BLOCK = "█"
export const ACS_LIGHT_BLOCK = "░"
export const ACS_MEDIUM_BLOCK = "▒"
export const ACS_CKBOARD = ACS_MEDIUM_BLOCK
export const ACS_DARK_BLOCK = "▓"

// misc symbols
export const ACS_DIAMOND = "♦"
export const ACS_PLMINUS = "±"
export const ACS_DEGREE = "°"
export const ACS_BULLET = "•"
export const ACS_LARROW = "<"
export const ACS_RARROW = ">"
export const ACS_DARROW = "v"
export const ACS_UARROW = "^"
export const ACS_BOARD = "#"
export const ACS_LEQUAL = "≥"
export const ACS_GEQUAL = "≤"
export const ACS_PI = "π"
export const ACS_STERLING = "£"

// The following are not part of codepage 437, and as such, cannot be used if
// you use `CODEPAGE_437` directly.

// wide box drawing
export const ACS_ULCORNER_HEAVY = "┏"
export const ACS_LLCORNER_HEAVY = "┓"
export const ACS_URCORNER_HEAVY = "┗"
export const ACS_LRCORNER_HEAVY = "┛"
export const ACS_LTEE_HEAVY = "┣"
export const ACS_RTEE_HEAVY = "┫"
export const ACS_BTEE_HEAVY = "┻"
export const ACS_TTEE_HEAVY = "┳"
export const ACS_HLINE_HEAVY = "━"
export const ACS_VLINE_HEAVY = "┃"
export const ACS_PLUS_HEAVY = "╋"

// misc symbols
export const ACS_NEQUAL = "≠"

/**
 * Can be given to the initscr() function as the `font.chars` option, if you
 * know that your BMP font uses the standard code page 437 format.
 *
 * This is a 'fake' codepage-437, in that it allows you to enter many characters
 * as their actual Unicode equivalent, not as their 8-bit codepage-437 value.
 * This means that you can use some characters like 'é' and all the ACS_*
 * variables without having to worry about this codepage.
 *
 * If you need the *actual* codepage 437 (where the characters are just ordered
 * by ASCII value), you can generate it using two nested loops:
 *
 *     var my_code_page = [];
 *     var y, x;
 *     for (y = 0; y < 0x08; y++) {
 *       my_code_page[y] = "";
 *       for (x = 0; x < 0x20; x++) {
 *         exports.my_code_page[y] += String.fromCharCode(y * 0x20 + x);
 *       }
 *     }
 **/
export const CODEPAGE_437 = []
{
  // lines 2-4 are normal ASCII characters
  for (let y = 1; y < 0x04; y++) {
    CODEPAGE_437[y] = ""
    for (let x = 0; x < 0x20; x++)
      CODEPAGE_437[y] += String.fromCharCode(y * 0x20 + x)
  }
  CODEPAGE_437[0] = "\0☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼"
  CODEPAGE_437[3] = CODEPAGE_437[3].substr(0, 31) + "⌂"
  CODEPAGE_437[4] = "ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒ"
  CODEPAGE_437[5] = "áíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐"
  CODEPAGE_437[6] = "└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀"
  CODEPAGE_437[7] = "αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ "
}
