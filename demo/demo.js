window.addEventListener("load", async () => {
  // Polute the global namespace, because programming is fun.
  for (const k in curses) {
    window[k] = curses[k];
  }
  document.getElementById('preload').remove();
  /*
  // * /
  const scr = initscr({
    container: "#stage",
    min_height: 30,
    min_width: 60,
    font: {
      type: "ttf",
      name: "Source Code Pro",
      height: 14,
      line_spacing: 1
    },
    require_focus: false
  });
  // */
  /*
  */
  const scr = initscr({
    container: document.getElementById("stage"),
    min_height: 30,
    min_width: 60,
    font: {
      type: "bmp",
      name: "egafont.png",
      height: 12,
      width: 8,
      line_spacing: 0,
      use_char_cache: true,
    },
    require_focus: false,
  });
  // */
  curs_set(1);
  blink();
  init_pair(1, COLOR_RED, COLOR_BLACK);
  init_pair(2, COLOR_GREEN, COLOR_BLACK);
  init_pair(3, COLOR_YELLOW, COLOR_BLACK);
  init_pair(4, COLOR_BLUE, COLOR_BLACK);
  init_pair(5, COLOR_MAGENTA, COLOR_BLACK);
  init_pair(6, COLOR_CYAN, COLOR_BLACK);
  init_pair(7, COLOR_BLACK, COLOR_BLACK);
  const subwin = newwin(5, 22, 20, 5);
  wattron(subwin, COLOR_PAIR(1) | A_REVERSE);
  wbkgd(subwin, ".");
  waddstr(subwin, 2, 2, "I am a subwindow.");
  wborder(subwin);
  raw();
  let selected = 0;
  const options = [
    "World's lamest roguelike",
    "Performance benchmark"
  ];
  const demo = window.demo = {};
  function redraw() {
    const {y: max_y, x: max_x} = getmaxyx(scr);
    attron(A_REVERSE | COLOR_PAIR(1));
    addstr(0, 0, "  curses.js demonstration");
    for (let x = scr.x; x <= max_x; x++) {
      addstr(" ");
    }
    attroff(A_BOLD | A_REVERSE | COLOR_PAIR(1));
    addstr(1, 2, "use ");
    addstr("jk", A_BOLD);
    addstr(" or the ");
    addstr("arrow keys", A_BOLD);
    addstr(" to select a demo");
    addstr(2, 2, "press ");
    addstr("enter", A_BOLD);
    addstr(" to run that demo");

    addstr(9, 4, "ncurses", A_BOLD);
    addstr(" is a C library for console programs.");
    addstr(10, 4, "It handles colors, bold, windows, etc.");
    addstr(11, 4, "curses.js", A_BOLD);
    addstr(" is a port of ");
    addstr("ncurses ", A_BOLD);
    addstr("for the web.");

    addstr(14, 8, "(made by ");
    addstr("Nicolas Ouellet-Payeur", COLOR_PAIR(2));
    addch(")");
    addstr(15, 8, "https://github.com/6112/cursesjs",
           COLOR_PAIR(6) | A_UNDERLINE);
    let i;
    for (i = 0; i < options.length; i++) {
      if (i === selected) {
        attron(A_REVERSE);
      }
      addstr(i + 3, 0, options[i]);
      for (let x = scr.x; x <= max_x; x++) {
        addstr(" ");
      }
      if (i === selected) {
        attroff(A_REVERSE);
      }
    }
    addch(max_y, max_x, "M");
    move(i + 3, 0);
    refresh();
    wrefresh(subwin);
  };
  redraw();
  while (1) {
    const c = await getch();
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
          clear();
          await rl.run();
        }
        if (selected === 1) {
          clear();
          bm.ticks = 0;
          await bm.run();
        }
        break;

      default:
        break;
    }
    selected = Math.min(options.length - 1, Math.max(0, selected));
    redraw();
  }
});
