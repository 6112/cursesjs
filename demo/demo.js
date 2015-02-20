$(window).load(function() {
  $('#preload').remove();
  /*
  var win = initscr({
    container: '#stage',
    height: 30,
    width: 60,
    font: {
      type: 'ttf',
      name: 'Source Code Pro',
      height: 14
    },
    require_focus: false
  });
  */
  var win = initscr({
    container: '#stage',
    min_height: 30,
    min_width: 60,
    font: {
      type: 'bmp',
      name: 'vgafont.png',
      height: 16,
      width: 9,
      chars: CODEPAGE_437,
      line_spacing: 0
    },
    require_focus: false
  });
  init_pair(1, COLOR_RED, COLOR_BLACK);
  init_pair(2, COLOR_GREEN, COLOR_BLACK);
  init_pair(3, COLOR_YELLOW, COLOR_BLACK);
  init_pair(4, COLOR_BLUE, COLOR_BLACK);
  init_pair(5, COLOR_MAGENTA, COLOR_BLACK);
  init_pair(6, COLOR_CYAN, COLOR_BLACK);
  var subwin = newwin(5, 22, 20, 5);
  subwin.attron(COLOR_PAIR(1) | A_REVERSE);
  subwin.bkgd('.');
  subwin.addstr(2, 2, 'I am a subwîndòw.');
  subwin.border();
  subwin = newwin(5, 6, 15, 5);
  subwin.attron(COLOR_PAIR(2));
  subwin.bkgd('.');
  subwin.addstr(2,2, '#2');
  subwin.border(ACS_VLINE, ACS_VLINE_DOUBLE,
	        ACS_HLINE, ACS_HLINE_DOUBLE,
	        ACS_ULCORNER, ACS_URCORNER_DOUBLE_DOWN,
		ACS_LLCORNER_DOUBLE_RIGHT, ACS_LRCORNER_DOUBLE);
  // raw();
  var selected = 0;
  var options = [
    'Roguelike-like player movement',
    'Text editor (TODO ☺)',
    'Window demo (TODO ☻)',
    'Benchmark'
  ];
  var demo = window.demo = {};
  var redraw = demo.redraw = function() {
    var bounds = getmaxyx();
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
    addstr('jk', A_BOLD);
    addstr(' or the ');
    addstr ('arrow keys', A_BOLD);
    addstr(' to select a demo');
    addstr(2, 2, 'press ');
    addstr('enter', A_BOLD);
    addstr(' to run that demo');
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
    move(i + 3, 0);
    refresh();
  };
  redraw();
  var update = demo.update = function(c) {
    switch(c) {
      case KEY_J:
      case KEY_DOWN:
        selected++;
        break;

      case KEY_K:
      case KEY_UP:
        selected--;
        break;

      case 13:
        if (selected === 0) {
          ungetch(update);
          clear();
          rl.redraw();
          ongetch(rl.update);
          return;
        }
        if (selected === 3) {
          ungetch(update);
          clear();
          bm.ticks = 0;
          bm.redraw();
          bm.fps_timeout = setTimeout(bm.count_fps, 1000);
          ongetch(bm.update);
          return;
        }
        break;

      default: break;
    }
    selected = Math.min(options.length - 1, Math.max(0, selected));
    redraw();
  };
  ongetch(update);
});
