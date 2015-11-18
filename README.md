# js-curses

`js-curses` is an attempt at porting the `ncurses` library to the web browser.
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
conventions, and duplicating the original function names where possible. Thus,
C's old `underscore_identifiers` are used instead of JavaScript's conventional
`camelCaseIdentifiers` for function names, variable names, etc.

## Compiling & Running

This project contains a `Gruntfile.js`, which allows automation of tasks for
this project, assuming the `grunt-cli` package is installed from the `npm`. As
root, you can run:

```bash
npm install -g grunt-cli
npm install
```

The source files are distributed in the `src/` directory, and the compiled,
unminified JavaScript is in the `dist/` directory. In order to recompile the
source files after a change, you may run the command:

```bash
grunt # or grunt concat
```

If you want to automatically recompile everytime a file in the `src/` directory,
use this command in a separate terminal, and let it run (or detach it from the
terminal):

```bash
grunt watch   # without detaching
grunt watch & # with detaching
```

In order to view a demo of the js-curses library, simply open `demo/index.html`
in a web browser.

## TODO

* Add mouse support
* Implement echo(), noecho()
* Implement endwin(), delwin()
* Improve bkgd()
* Improve keyboard events
* Port rendering from Canvas2D to WebGL
* Add elements to the demo page
