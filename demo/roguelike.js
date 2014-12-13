(function() {
  var state = {
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
  var rl = window.rl = {
    redraw: function() {
      var y, x;
      for (y = 0; y < state.map.length; y++) {
        for (x = 0; x < state.map[y].length; x++) {
          var tile = state.map[y][x];
          addch(y, x, tile);
        }
      }
      addch(state.player.y, state.player.x, '@', A_BOLD | COLOR_PAIR(2));
      addstr(state.map.length + 1, 0, 'use ');
      addstr('hjkl', A_BOLD);
      addstr(' or ');
      addstr('arrow keys', A_BOLD);
      addstr(' to move around');
      addstr(state.map.length + 2, 0, 'press ');
      addstr('q', A_BOLD);
      addstr(' to quit');
      move(state.player.y, state.player.x);
      refresh();
    },
    update: function(c) {
      var old_y, old_x;
      old_y = state.player.y;
      old_x = state.player.x;
      switch (c) {
        case KEY_H:
        case KEY_LEFT:
          state.player.x--;
          break;

        case KEY_J:
        case KEY_DOWN:
          state.player.y++;
          break;

        case KEY_K:
        case KEY_UP:
          state.player.y--;
          break;

        case KEY_L:
        case KEY_RIGHT:
          state.player.x++;
          break;

        case KEY_Q:
          clear();
          demo.redraw();
          ongetch(demo.update);
          ungetch(rl.update);
          return;
          break;

        default: break;
      }
      if (state.map[state.player.y][state.player.x] === '#') {
        state.player.y = old_y;
        state.player.x = old_x;
      }
      rl.redraw();
    }
  };
})();
