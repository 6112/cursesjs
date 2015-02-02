// trigger an event on the window, with name event_name.
//
// call all the event handlers bound to that event, and pass any other
// arguments given to trigger() to each event handler.
screen_t.prototype.trigger = function(event_name) {
  if (this.listeners[event_name]) {
    var args = [].slice.call(arguments, 1);
    var i;
    for (i = 0; i < this.listeners[event_name].length; i++) {
      this.listeners[event_name][i].apply(this, args);
    }
  }
};

// add an event handler for the event with name event_name.
screen_t.prototype.on = function(event_name, callback) {
  if (! this.listeners[event_name]) {
    this.listeners[event_name] = [];
  }
  this.listeners[event_name].push(callback);
};

// remove an event handler for the event with name event_name.
screen_t.prototype.off = function(event_name, callback) {
  if (! this.listeners[event_name]) {
    this.listeners[event_name] = [];
  }
  var i;
  for (i = 0; i < this.listeners[event_name].length; i++) {
    if (this.listeners[event_name][i] == callback) {
      break;
    }
  }
  if (i !== this.listeners[event_name].length) {
    this.listeners[event_name].splice(i, 1);
  }
};

// add an event handler for the event with name event_name, which is removed
// after executing once.
screen_t.prototype.one = function(event_name, callback) {
  var win = this;
  var f = function() {
    callback.apply(this, arguments);
    win.off(event_name, f);
  };
  this.on(event_name, f);
};

// call function `callback' only once, when a key is entered by the user.
//
// the first argument to `callback' will be the event object.
screen_t.prototype.getch = function(callback) {
  this.one('keydown', callback);
};
exports.getch = simplify(screen_t.prototype.getch);

// call function `callback' everytime a key is entered by the user.
//
// the first argument to `callback' will be the event objet.
screen_t.prototype.ongetch = function(callback) {
  this.on('keydown', callback);
};
exports.ongetch = simplify(screen_t.prototype.ongetch);

// stop listening for keyboard events
screen_t.prototype.ungetch = function(callback) {
  this.off('keydown', callback);
};
exports.ungetch = simplify(screen_t.prototype.ungetch);
