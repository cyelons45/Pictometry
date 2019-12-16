/* jshint maxlen:false */

define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/dom-construct',
    'dojo/dom-geometry',
    'dojo/Evented',
    'widgets/Pictometry/ClickAndDrag'
  ],
  function (declare, lang, domConstruct, domGeometry, Evented, ClickAndDrag) {

    var resizeDirections = {
      X: 'x',
      Y: 'y'
    };

    var resizeHandleLocations = {
      TOP: 'top',
      RIGHT: 'right',
      BOTTOM: 'bottom',
      LEFT: 'left'
    };

    var RESIZE_HANDLE_MOVED_EVENT = 'resized';

    var clazz = declare(Evented, {

      parentNode: null,
      resizeHandleLocation: null,
      resizeHandleNode: null,
      resizeDirection: null,
      mouseMoveEventHandler: null,
      clickOffsetFromHandle: {
        x: 0,
        y: 0
      },

      size: 0,
      minSize: {
        x: 0,
        y: 0
      },
      maxSize: {
        x: 999999,
        y: 999999
      },

      clickAndDragHandler: null,

      constructor: function (parentNode, resizeHandleLocation, resizeDirection) {
        this.parentNode = parentNode;
        this.resizeHandleLocation = resizeHandleLocation;
        this.resizeDirection = resizeDirection;

        this._createResizeHandle();
        this._initializeEventHandlers();
      },

      _createResizeHandle: function () {
        // TODO: Use this.resizeHandleLocation to place the resize handle appropriately.
        // TODO: Use this.resizeDirection to set the div class.
        this.resizeHandleNode = domConstruct.place('<div class="hresize"><div class="hresize_thumb"/></div>', this.parentNode, 'first');
        var handleBox = domGeometry.getMarginBox(this.resizeHandleNode);
        this.minSize.x = handleBox.w;
        this.minSize.y = handleBox.h;
      },

      _initializeEventHandlers: function () {
        this.clickAndDragHandler = new ClickAndDrag(this.resizeHandleNode);
        this.clickAndDragHandler.disableSelectionWhileDragging = true;
        this.clickAndDragHandler.onPress = lang.hitch(this, this._onPress);
        this.clickAndDragHandler.onMove = lang.hitch(this, this._onMove);
      },

      _onPress: function (e) {
        // Save the distance between the handle and the mouse click.  The versions of Chrome and IE 
        // that I've tested use offsetX and offsetY, while Firefox uses layerX and layerY.
        if (e.offsetX !== undefined) {
          this.clickOffsetFromHandle.x = e.offsetX;
          this.clickOffsetFromHandle.y = e.offsetY;
        } else if (e.layerX !== undefined) {
          this.clickOffsetFromHandle.x = e.layerX;
          this.clickOffsetFromHandle.y = e.layerY;
        } else {
          this.clickOffsetFromHandle.x = 0;
          this.clickOffsetFromHandle.y = 0;
        }
      },

      _onMove: function (e) {
        var parentPosition = domGeometry.position(this.parentNode);
        var parentBottomLeft = {
          x: parentPosition.x + parentPosition.w,
          y: parentPosition.y + parentPosition.h
        };
        var mouseToParentOffset = {
          x: parentBottomLeft.x - e.clientX + this.clickOffsetFromHandle.x,
          y: parentBottomLeft.y - e.clientY + this.clickOffsetFromHandle.y
        };

        var oldSize = this.size;
        this.setSize(mouseToParentOffset.y);

        if (oldSize !== this.size) {
          this.emit(RESIZE_HANDLE_MOVED_EVENT, {});
        }
      },

      updateMaxSize: function () {
        this.size = this._clip(this.size, this.minSize.y, this.maxSize.y);
      },

      setSize: function (size) {
        this.size = this._clip(size, this.minSize.y, this.maxSize.y);
      },

      getSize: function () {
        return this.size;
      },

      _clip: function (number, min, max) {
        return Math.max(min, Math.min(number, max));
      }

    });

    clazz.ResizeHandleLocations = resizeHandleLocations;
    clazz.ResizeDirections = resizeDirections;
    clazz.RESIZE_HANDLE_MOVED_EVENT = RESIZE_HANDLE_MOVED_EVENT;

    return clazz;
  }
);
