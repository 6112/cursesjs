// when called with a function, return that function, wrapped so that
// it can be used directly by being applied on `default_screen'.
//
// i.e., the call:
//   default_screen.addstr('hello world');
//
// can be shortened to:
//   addstr('hello world');
//
// if you define:
//   addstr = simplify(screen_t.prototype.addstr);
// when called with function name `function_name' that is defined in
// screen_t.prototype, will create a function with the same name in `exports'
// that calls this function using `default_screen'
var simplify = function(f) {
  return function() {
    return f.apply(default_screen, arguments);
  };
};

// similar to simplify, but convert the call so it can be done as in C with
// ncurses.
//
// for instance, the call:
//   scr.addstr('hello world');
//
// can be rewritten:
//   waddstr(scr, 'hello world');
//
// if you define:
//   waddstr = generalize(f);
//
// TODO: *use* this, instead of just declaring it
var generalize = function(f) {
  return function() {
    return f.apply(arguments[0], [].slice.call(arguments, 1));
  };
};

// similar to simplify, but instead of allowing to call without supplying a
// `screen_t' object, allows calling by supplying a position for inserting
// text.
//
// for instance, the function call:
//   scr.addstr(10, 10, 'hello world');
//
// will expand to:
//   scr.move(10, 10);
//   scr.addstr('hello world');
//
// if you define:
//   screen_t.prototype.addstr = shortcut_move(screen_t.prototype.addstr);
//
// TODO: rename this decorator
var shortcut_move = function(f) {
  return function(y, x) {
    var args = arguments;
    if (typeof y === "number" && typeof x === "number") {
      this.move(y, x);
      args = [].slice.call(arguments, 2);
    }
    return f.apply(this, args);
  };
};

// similar to simplify, but allows the caller to specify text attributes
// (as per attron() and attroff()) as the last argument to the call.
// 
// for instance, the function call:
//   scr.addstr('hello world', A_BOLD | COLOR_PAIR(3));
//
// will expand to:
//   scr.attron(A_BOLD | COLOR_PAIR(3));
//   scr.addstr('hello world');
//   scr.attroff(A_BOLD | COLOR_PAIR(3));
//
// if you define:
//   screen_t.prototype.addstr = attributify(screen_t.prototype.addstr);
var attributify = function(f) {
  return function() {
    var args = arguments;
    var attrs = null;
    var prev_attrs = this.attrs;
    if (arguments.length !== 0) {
      attrs = arguments[arguments.length - 1];
      if (typeof attrs === "number") {
        args = [].slice.call(arguments, 0, arguments.length - 1);
        this.attron(attrs);
      }
    }
    var return_value = f.apply(this, args);
    if (typeof attrs === "number") {
      this.attrset(prev_attrs);
    }
    return return_value;
  };
};
