(function() {
  var bm = window.bm = {
    timeout: 0,
    update: function(c) {
      if (c === KEY_Q) {
        clear();
        demo.redraw();
        ongetch(demo.update);
        ungetch(bm.update);
        clearTimeout(bm.timeout);
        return;
      }
      bm.redraw();
    },
    redraw: function() {
      var y, x;
      for (y = 0; y < 28; y++) {
        for (x = 0; x < 60; x++) {
          var k = Math.round(Math.random() 
                             * ('Z'.charCodeAt(0) - 'A'.charCodeAt(0)));
          k += 'A'.charCodeAt(0);
          var c = String.fromCharCode(k);
          var attrs = 0;
          if (Math.round(Math.random())) {
            attrs |= A_BOLD;
          }
          if (Math.round(Math.random())) {
            attrs |= A_REVERSE;
          }
          attrs |= COLOR_PAIR(Math.round(Math.random() * 6));
          addstr(y, x, c, attrs);
        }
      }
      addstr(28, 0, 'press a key to update screen', A_BOLD | A_REVERSE);
      addstr(29, 0, 'press q to quit', A_BOLD | A_REVERSE);
      refresh();
      clearTimeout(bm.timeout);
      bm.timeout = setTimeout(bm.redraw, 1000);
    }
  };
})();
