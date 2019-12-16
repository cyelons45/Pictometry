define(
  [
    'dojo/_base/declare',
    'dojo/dom-attr',
    'widgets/Pictometry/Button',
    'dojo/domReady!'
  ],

  function (declare, domAttr, Button) {
    var clazz = declare(Button, {
      constructor: function () {},

      _initializeEventHandlers: function () {
        this.inherited(arguments);
      },

      _onClick: function () {
        // Toggle the state.
        this.setPressed(!this.isPressed());

        this.inherited(arguments);
      },

      isPressed: function () {
        return domAttr.get(this._nodeId, 'data-checked') === 'true';
      },

      setPressed: function (pressed) {
        domAttr.set(this._nodeId, 'data-checked', pressed.toString());
      }
    });

    return clazz;
  }
);
