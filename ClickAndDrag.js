/* jshint maxlen:false */

define(
  [
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/event',
    'dojo/dom',
    'dojo/on',
    'dojo/touch',
    'widgets/Pictometry/isFunction'
  ],
  function (declare, lang, event, dom, on, touch, isFunction) {
    var clazz = declare(null, {
      disableSelectionWhileDragging: false,

      // These can be overridden with custom event handlers.
      onPress: undefined,
      onRelease: undefined,
      onMove: undefined,
      onLeave: undefined,

      _containerNode: null,
      _mouseMoveEventHandler: null,

      constructor: function (containerNode) {
        this._containerNode = containerNode;
        this._initializeEventHandlers();
      },

      _initializeEventHandlers: function () {
        this._mouseMoveEventHandler = on.pausable(document.body, touch.move, lang.hitch(this, this._onMove));
        this._mouseMoveEventHandler.pause();
        on(document.body, touch.press, lang.hitch(this, this._onPress));
        on(document.body, touch.release, lang.hitch(this, this._onRelease));
        on(document.body, touch.leave, lang.hitch(this, this._onLeave));
      },

      _onMove: function (e) {
        if (isFunction(this.onMove)) {
          this.onMove(e);
        }

        if (this.disableSelectionWhileDragging) {
          event.stop(e);
        }
      },

      _onPress: function (e) {
        // Make sure we're clicking somewhere on the element.
        if (dom.isDescendant(e.target, this._containerNode)) {
          if (isFunction(this.onPress)) {
            this.onPress(e);
          }

          this._mouseMoveEventHandler.resume();

          if (this.disableSelectionWhileDragging) {
            event.stop(e);
          }
        }
      },

      _onRelease: function (e) {
        if (isFunction(this.onRelease)) {
          this.onRelease(e);
        }

        this._mouseMoveEventHandler.pause();
      },

      _onLeave: function (e) {
        if (isFunction(this.onLeave)) {
          this.onLeave(e);
        }

        this._mouseMoveEventHandler.pause();
      }

    });

    return clazz;
  }
);
