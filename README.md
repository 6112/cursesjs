# curses.js

`curses.js` is an attempt at porting the `ncurses` library to the web browser.
`ncurses` is a library that allows a terminal application to make use of some
"visual" settings: color, text alignment on screen, more interactive user input,
etc. Examples of applications that use `ncurses` are Emacs and Vim.

For now, only Firefox and Google Chrome are supported.

```
This project is still under development. As such, the API is still subject to change.
```

## Goal

The goal was to make the syntax as close to that of the original `ncurses`
library, where possible. This means, among other things, using C-like naming
conventions, and duplicating the original function names where possible.

## Example

Here is a quick example to get started with curses.js and ES6:

```javascript
// Initialize curses.
curses.initscr({
  container: document.getElementById("my-canvas"),
  height: 25,
  width: 80,
  font: {
    type: "bmp",
    name: "myfont.png",
    height: 16,
    width: 9,
    line_spacing: 0,
    use_char_cache: true,
  },
});
// Define colors we can use later.
curses.init_pair(1, COLOR_RED, COLOR_BLACK);
// Main loop
while (1) {
  // Clear the screen.
  curses.clear();
  // Tell the user what to do.
  curses.addstr(0, 0, "Please hit ");
  curses.addstr("any key", COLOR_PAIR(1) | A_BOLD);
  curses.addstr(" to have fun.");
  curses.refresh();
  // Wait for the user to press a key.
  const c = await getch();
  // Do something depending on which key was pressed.
  curses.move(2, 0);
  if (c == KEY_F) {
    curses.addstr("F is for the ");
    curses.addstr("friends", A_UNDERLINE);
    curses.addstr(" that do stuff together.");
  }
  else {
    curses.addstr("I don't know about that key.");
  }
}
```

## Compiling & Running

This project contains a `Gruntfile.js`, which allows automation of tasks for
this project, assuming the `grunt-cli` package is installed from the `npm`. As
root, you can run:

```bash
npm install -g webpack-cli
npm install
```

The source files are distributed in the `src/` directory, and the compiled,
unminified JavaScript is in the `dist/` directory. In order to recompile the
source files after a change, you may run the command:

```bash
webpack
webpack --optimize-minimize
```
