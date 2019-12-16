/* jshint maxlen:false */

define(
  [
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/dom',
    'dojo/on',
    'dojo/dom-construct',
    'dojo/dom-class',
    'dojo/string',
    'dojo/touch',
    'widgets/Pictometry/ClickAndDrag',
    'widgets/Pictometry/isFunction',
    'dojo/domReady!'
  ],

  function (declare, lang, dom, on, domConstruct, domClass, string, touch, ClickAndDrag, isFunction) {
    var PRESSED_BUTTON_CLASS = 'pressed_button';

    var clazz = declare(null, {
      _nodeId: null,
      _iconClass: null,
      _clickAndDragHandler: null,

      constructor: function (nodeId, iconClass) {
        this._nodeId = nodeId;
        this._iconClass = iconClass;

        this._initializeEventHandlers();
        this._createIconNode();
      },

      _initializeEventHandlers: function () {
        var node = dom.byId(this._nodeId);
        on(node, 'click', lang.hitch(this, this._onClick));
        on(node, touch.press, lang.hitch(this, this._onPress));
        on(document.body, touch.release, lang.hitch(this, this._onRelease));
        on(document.body, touch.leave, lang.hitch(this, this._onLeave));

        this._clickAndDragHandler = ClickAndDrag(node);
        this._clickAndDragHandler.disableSelectionWhileDragging = true;
      },

      _createIconNode: function () {
        var iconHtml = string.substitute(
          '<div class="toolbar_icon ${iconClass}"></div>', {
            iconClass: this._iconClass
          });

        domConstruct.place(iconHtml, this._nodeId);
      },

      _onClick: function (e) {
        // Call the onClick handler if one has been defined.
        if (isFunction(this.onClick)) {
          this.onClick(e);
        }
      },

      _onPress: function (e) {
        domClass.add(this._nodeId, PRESSED_BUTTON_CLASS);

        if (isFunction(this.onPress)) {
          this.onPress(e);
        }
      },

      _onRelease: function (e) {
        domClass.remove(this._nodeId, PRESSED_BUTTON_CLASS);

        if (isFunction(this.onRelease)) {
          this.onRelease(e);
        }
      },

      _onLeave: function (e) {
        domClass.remove(this._nodeId, PRESSED_BUTTON_CLASS);

        if (isFunction(this.onLeave)) {
          this.onLeave(e);
        }
      }
    });

    return clazz;
  }
);
