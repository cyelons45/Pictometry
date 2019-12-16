/* jshint maxlen:false */

define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/dom',
    'dojo/dom-geometry',
    'dojo/dom-style',
    'dojo/dom-attr',
    'dojo/fx',
    'dojo/on',
    'dojo/query',
    'dojo/string',
    'dojo/Evented',
    'widgets/Pictometry/ResizeHandle',
    'widgets/Pictometry/MenuResizeHandle',
    'dijit/focus'
  ],
  function (declare, lang, dom, domGeometry, domStyle, domAttr, fx, on, query, string, Evented, ResizeHandle, MenuResizeHandle, focus) {

    var slideSpeedInPixelsPerMillisecond = 1.5;

    var dockLocations = {
      TOP: 'top',
      RIGHT: 'right',
      BOTTOM: 'bottom',
      LEFT: 'left'
    };

    var clazz = declare([Evented], {

      resizeHandle: null,

      constructor: function (panelNode, dockLocation) {
        this.panelNode = panelNode;
        this.containerNode = panelNode.parentElement;
        this.isOpen = false;
        this.currentAnimation = null;
        this.dockLocation = dockLocation;

        this.closedPosition = {
          x: 0,
          y: 0
        };

        this._initializeResizeHandle();
      },

      _initializeResizeHandle: function () {
        this.resizeHandle = new MenuResizeHandle(this.panelNode,
          ResizeHandle.ResizeHandleLocations.TOP,
          ResizeHandle.ResizeDirections.X);
        on(this.resizeHandle, ResizeHandle.RESIZE_HANDLE_MOVED_EVENT, lang.hitch(this, this._updatePanelSize));
      },

      resize: function () {
        // If we're in the middle of animation, stop it.
        this._stopAnimation();
        this.resizeHandle.updateMaxSize();
        this._updatePanelSize();
      },

      _updatePanelSize: function () {
        var size = this.resizeHandle.getSize();

        var newStyle = {
          height: size + 'px'
        };
        if (this.isOpen) {
          newStyle.top = -size + 'px';
        }

        domStyle.set(this.panelNode, newStyle);
      },

      open: function () {
        if (!this.isOpen) {
          this.isOpen = true;
          this._slide(this._calculateOpenPosition());
          this._addMenuItemsToTabOrder();
        }
      },

      close: function () {
        if (this.isOpen) {
          this.isOpen = false;
          this._slide(this.closedPosition);
          this._unfocusCurrentItem();
          this._removeMenuItemsFromTabOrder();
        }
      },

      _calculateOpenPosition: function () {
        var panelSize = domGeometry.getMarginSize(this.panelNode);
        var openPosition = null;

        if (this.dockLocation === dockLocations.TOP) {
          openPosition = {
            x: 0,
            y: panelSize.h
          };
        } else if (this.dockLocation === dockLocations.RIGHT) {
          openPosition = {
            x: -panelSize.w,
            y: 0
          };
        } else if (this.dockLocation === dockLocations.BOTTOM) {
          openPosition = {
            x: 0,
            y: -panelSize.h
          };
        } else if (this.dockLocation === dockLocations.LEFT) {
          openPosition = {
            x: panelSize.w,
            y: 0
          };
        }

        return openPosition;
      },

      _unfocusCurrentItem: function () {
        var currentNode = focus.curNode;
        if (currentNode && dom.isDescendant(currentNode, this.panelNode)) {
          currentNode.blur();
        }
      },

      _removeMenuItemsFromTabOrder: function () {
        var nodes = this._getNodesWithTabIndexes(this.panelNode);
        if (nodes) {
          nodes.forEach(lang.hitch(this, function (node) {
            if (!this._nodeHasSavedTabIndex(node)) {
              this._saveTabIndex(node);
            }
          }));
        }
      },

      _addMenuItemsToTabOrder: function () {
        var nodes = this._getNodesWithTabIndexes(this.panelNode);
        if (nodes) {
          nodes.forEach(lang.hitch(this, function (node) {
            if (this._nodeHasSavedTabIndex(node)) {
              this._restoreTabIndex(node);
            }
          }));
        }
      },

      _getNodesWithTabIndexes: function (parentNode) {
        var selector = string.substitute('#${id} *[tabindex]', {
          id: parentNode.id
        });
        return query(selector);
      },

      _nodeHasSavedTabIndex: function (node) {
        return node.savedTabIndex !== undefined;
      },

      _saveTabIndex: function (node) {
        node.savedTabIndex = domAttr.get(node, 'tabindex');
        domAttr.set(node, 'tabindex', '-1');
      },

      _restoreTabIndex: function (node) {
        domAttr.set(node, 'tabindex', node.savedTabIndex);
        node.savedTabIndex = undefined;
      },

      _stopAnimation: function () {
        if (this.animation === null) {
          // Stop the current animation.
          this.animation.stop();
          this.animation = null;
        }
      },

      _slide: function (targetPosition) {
        // If we're in the middle of animation, stop it.
        this._stopAnimation();

        // TODO: lang.hitch()
        var me = this;

        this.currentTargetPosition = targetPosition;
        var panelMarginBox = domGeometry.getMarginBox(this.panelNode);
        var currentPosition = {
          x: panelMarginBox.l,
          y: panelMarginBox.t
        };

        var distance = this._distance(currentPosition, targetPosition);
        var slideDuration = distance / slideSpeedInPixelsPerMillisecond;

        this.currentAnimation = fx.slideTo({
          node: this.panelNode,
          left: targetPosition.x,
          top: targetPosition.y,
          duration: slideDuration,
          onEnd: function () {
            me.currentAnimation = null;
          }
        }).play();
      },

      // This returns the Euclidean distance between the two points.
      _distance: function (coord1, coord2) {
        return Math.sqrt(Math.pow(coord1.x - coord2.x, 2) + Math.pow(coord1.y - coord2.y, 2));
      }

    });

    clazz.DockLocations = dockLocations;

    return clazz;
  }
);
