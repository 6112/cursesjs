import screen_t from "./types"
import stdscr from "./stdscr"

/**
 * Trigger an event on the window, with name `event_name`.
 *
 * Call all the event handlers bound to that event, and pass any other arguments
 * given to trigger() to each even handler.
 *
 * @param {String} event_name Name of the event to be fired.
 **/
screen_t.prototype.trigger = function(event_name, ...args) {
  let last_return
  if (this.listeners[event_name])
    for (const listener of this.listeners[event_name]) {
      const returned = listener.apply(this, args)
      if (returned !== undefined)
        last_return = returned
    }
  return last_return
}

/**
 * Add an event handler for the event with name `event_name`.
 *
 * @param {String} event_name Name of the event to listen to.
 * @param {Function} callback Function that will be called when the event is
 *     fired.
 **/
screen_t.prototype.on = function(event_name, callback) {
  if (! this.listeners[event_name])
    this.listeners[event_name] = []
  this.listeners[event_name].push(callback)
}

/**
 * Remove an event handler for the event with name `event_name`. This removes
 * an event handler that was previously added with on().
 *
 * @param {String} event_name Name of the event the handler was bound to.
 * @param {Function} callback Function that was passed to on() previously.
 **/
screen_t.prototype.off = function(event_name, callback) {
  if (! this.listeners[event_name])
    this.listeners[event_name] = []
  const listeners = this.listeners[event_name]
  let i = 0
  for (i = 0; i < listeners.length; i++)
    if (listeners[i] === callback)
      break
  if (i !== listeners.length)
    listeners.splice(i, 1)
}

/**
 * Add an event handler for the event with name `event_name`. The event handler
 * is removed after executing once.
 *
 * @param {String} event_name Name of the event to listen to.
 * @param {Function} callback Function that will be called when the event is
 *     fired.
 **/
screen_t.prototype.one = function(event_name, callback) {
  const scr = this
  this.on(event_name, function(...args) {
    callback.apply(this, args)
    scr.off()
  })
}

/**
 * Return a promise that resolves when a key is entered by the user (if the
 * screen has focus).
 *
 * Call function `callback` only once, when a key is entered by the user (if
 * the screen has focus). `callback` will receive an event object as its first
 * argument.
 *
 * The description of the event object is still subject to change.
 *
 * @param {Function} callback Function to be called when a key is pressed.
 * @return {Promise<Object>} Promise that resolves when the user hits a key.
 **/
screen_t.prototype.getch = function() {
  // eslint-disable-next-line no-undef
  return new Promise(resolve => {
    this.one("keydown", event => {
      resolve(event)
    })
  })
}
export function getch() {
  return stdscr.getch()
}

/**
 * Call function `callback` when a key is entered by the user (if the screen
 * has focus). `callback` will receive an event object as its first argument.
 *
 * The description of the event object is still subject to change.
 *
 * @param {Function} callback Function to be called when a key is pressed.
 **/
screen_t.prototype.ongetch = function(callback) {
  this.on("keydown", callback)
}
export function ongetch(callback) {
  return stdscr.ongetch(callback)
}

/**
 * Stop listening to keyboard events; undoes a previous call to getch() or
 * ongetch(). The `callback` argument must be the same as in a previous call to
 * getch() or ongetch().
 *
 * @param {Function} callback Function that should not be called anymore when a
 *     key is pressed.
 **/
screen_t.prototype.ungetch = function(callback) {
  this.off("keydown", callback)
}
export function ungetch(callback) {
  return stdscr.ungetch(callback)
}
