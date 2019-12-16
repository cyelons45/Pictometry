define(
  [
    'dojo/_base/declare',
    'dojo/dom',
    'dojo/dom-geometry',
    'widgets/Pictometry/ResizeHandle'
  ],
  function (declare, dom, domGeometry, ResizeHandle) {
    return declare(ResizeHandle, {
      ipaContainer: null,

      constructor: function (parentNode, resizeHandleLocation, resizeDirection) {
        this.ipaContainer = dom.byId('pictometry_ipa_container');
        var parentSize = domGeometry.getMarginSize(parentNode);
        this.setSize(parentSize.h);
      },

      updateMaxSize: function () {
        var ipaSize = domGeometry.getMarginBox(this.ipaContainer);
        this.maxSize = {
          x: ipaSize.w,
          y: ipaSize.h
        };

        this.inherited(arguments);
      }
    });
  }
);
