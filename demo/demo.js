$(window).load(function() {
  $('#preload').remove();
  /*
  // * /
  var win = initscr({
    container: '#stage',
    min_height: 30,
    min_width: 60,
    font: {
      type: 'ttf',
      name: 'Source Code Pro',
      height: 14,
      line_spacing: 1
    },
    require_focus: false
  });
  // */
  /*
  // */
  var win = initscr({
    container: '#stage',
    min_height: 30,
    min_width: 60,
    font: {
      type: 'bmp',
      name: 'vgafont.png',
      height: 16,
      width: 9,
      line_spacing: 0
    },
    require_focus: false
  });
  // */
  curs_set(1);
  mousemask(BUTTON1_PRESSED);
  blink();
  init_pair(1, COLOR_RED, COLOR_BLACK);
  init_pair(2, COLOR_GREEN, COLOR_BLACK);
  init_pair(3, COLOR_YELLOW, COLOR_BLACK);
  init_pair(4, COLOR_BLUE, COLOR_BLACK);
  init_pair(5, COLOR_MAGENTA, COLOR_BLACK);
  init_pair(6, COLOR_CYAN, COLOR_BLACK);
  init_pair(7, COLOR_BLACK, COLOR_BLACK);
  var subwin = newwin(5, 22, 20, 5);
  wbkgd(subwin, '.', COLOR_PAIR(1) | A_REVERSE);
  waddstr(subwin, 2, 2, 'I am a subwindow.');
  wborder(subwin);
  var subwin2 = newwin(5, 20, 20, 28);
  wbkgd(subwin2, '_', COLOR_PAIR(2) | A_REVERSE);
  // scrollok(subwin2, true);
  wmove(subwin2, 0, 0);
  var i;
  for (i = 0; i < 4; i++) {
    waddstr(subwin2, i + "\n");
  }
  waddstr(subwin2, "(these should be the last 2 lines)");
  raw();
  var selected = 0;
  var options = [
    'Roguelike-like player movement',
    'Text editor (TODO ☺)',
    'Window demo (TODO ☻)',
    'Benchmark'
  ];
  var mouse = {
    y: options.length + 3,
    x: 0
  };
  var demo = window.demo = {};
  var redraw = demo.redraw = function() {
    var bounds = getmaxyx(win);
    var max_y = bounds.y;
    var max_x = bounds.x;
    attron(A_BOLD | A_REVERSE | COLOR_PAIR(1));
    addstr(0, 0, '  js-curses demonstration');
    var x = win.x;
    while (x++ <= max_x) {
      addstr(' ');
    }
    attroff(A_BOLD | A_REVERSE | COLOR_PAIR(1));
    addstr(1, 2, 'use ');
    addstr('jk', A_BOLD | A_UNDERLINE);
    addstr(' or the ');
    addstr('arrow keys', A_BOLD | A_UNDERLINE);
    addstr(' to select a demo');
    addstr(2, 2, 'press ');
    addstr('enter', A_BOLD | A_UNDERLINE);
    addstr(' to run that demo');

    addstr(9, 4, "ncurses", A_BOLD);
    addstr(" is a C library for console programs.");
    addstr(10, 4, "It handles colors, bold, windows, etc.");
    addstr(11, 4, "js-curses", A_BOLD);
    addstr(" is a port of ");
    addstr("ncurses ", A_BOLD);
    addstr("for the web.");

    addstr(14, 8, "(made by ");
    addstr("Nicolas Ouellet-Payeur", COLOR_PAIR(2));
    addch(')');
    addstr(15, 8, "http://github.com/6112/js-curses",
	   COLOR_PAIR(6) | A_UNDERLINE);
    var i;
    for (i = 0; i < options.length; i++) {
      if (i === selected) {
        attron(A_REVERSE);
      }
      addstr(i + 3, 0, options[i]);
      var x = win.x;
      while (x++ <= max_x) {
        addstr(' ');
      }
      if (i === selected) {
        attroff(A_REVERSE);
      }
    }
    addch(max_y, max_x, 'M');
    // move(i + 3, 0);
    move(mouse.y, mouse.x);
    refresh();
    wrefresh(subwin);
    wrefresh(subwin2);
  };
  redraw();
  var update = demo.update = function(c) {
    var cancel = true;
    switch(c) {
      case KEY_MOUSE:
        mouse = getmouse();
        break;
      
      case 'j':
      case KEY_DOWN:
        selected++;
        break;

      case 'k':
      case KEY_UP:
        selected--;
        break;

      case '\n':
        if (selected === 0) {
          ungetch(update);
          clear();
          rl.redraw();
          ongetch(rl.update);
          return false;
        }
        if (selected === 3) {
          ungetch(update);
          clear();
          bm.ticks = 0;
          bm.redraw();
          bm.fps_timeout = setTimeout(bm.count_fps, 1000);
          ongetch(bm.update);
          return false;
        }
        break;

      default:
        cancel = false;
        break;
    }
    selected = Math.min(options.length - 1, Math.max(0, selected));
    redraw();
    return ! cancel;
  };
  ongetch(update);
});
