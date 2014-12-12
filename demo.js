$(function() {
  var win = initscr('#stage', 30, 60, 'Inconsolata', 14, true);
  raw();
  var selected = 0;
  var options = [
    'Roguelike-like player movement',
    'Text editor',
    'Window demo'
  ];
  var redraw = function() {
    attron(A_BOLD | A_REVERSE | COLOR_PAIR(1));
    addstr(0, 0, '  js-curses demonstration');
    var x = win.x;
    while (x++ < 59) {
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
      while (x++ < 59) {
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
  var update = function(c) {
    switch(c) {
      case 'J'.charCodeAt(0):
      case 40:
        selected++;
        break;

      case 'K'.charCodeAt(0):
      case 38:
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
        break;

      default: break;
    }
    selected = Math.min(options.length - 1, Math.max(0, selected));
    redraw();
  };
  ongetch(update);
  var rl_state = {
    player: {
      x: 4,
      y: 4
    },
    map: [
      "##########",
      "#........#",
      "#........#",
      "#........#",
      "#.....#..#",
      "#.....#..#",
      "#..#.....#",
      "#..##....#",
      "#........#",
      "##########"
    ]
  };
  var rl = {
    redraw: function() {
      var y, x;
      for (y = 0; y < rl_state.map.length; y++) {
        for (x = 0; x < rl_state.map[y].length; x++) {
          var tile = rl_state.map[y][x];
          addch(y, x, tile);
        }
      }
      addch(rl_state.player.y, rl_state.player.x, '@', A_BOLD | COLOR_PAIR(2));
      addstr(rl_state.map.length + 1, 0, 'use ');
      addstr('hjkl', A_BOLD);
      addstr(' or ');
      addstr('arrow keys', A_BOLD);
      addstr(' to move around');
      addstr(rl_state.map.length + 2, 0, 'press ');
      addstr('q', A_BOLD);
      addstr(' to quit');
      move(rl_state.player.y, rl_state.player.x);
      refresh();
    },
    update: function(c) {
      var old_y, old_x;
      old_y = rl_state.player.y;
      old_x = rl_state.player.x;
      switch (c) {
        case 'H'.charCodeAt(0):
        case 37:
          rl_state.player.x--;
          break;

        case 'J'.charCodeAt(0):
        case 40:
          rl_state.player.y++;
          break;

        case 'K'.charCodeAt(0):
        case 38:
          rl_state.player.y--;
          break;

        case 'L'.charCodeAt(0):
        case 39:
          rl_state.player.x++;
          break;

        case 'Q'.charCodeAt(0):
          clear();
          redraw();
          ongetch(update);
          ungetch(rl.update);
          return;
          break;

        default: break;
      }
      if (rl_state.map[rl_state.player.y][rl_state.player.x] === '#') {
        rl_state.player.y = old_y;
        rl_state.player.x = old_x;
      }
      rl.redraw();
    }
  };
});
