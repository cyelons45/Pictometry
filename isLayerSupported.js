// isLayerSupported checks to see if a given layer is supported by our widget.
var isLayerSupported = function (layer) {
  // All we support is feature layers.
  return layer && layer.type === 'Feature Layer';
};

define(function () {
  return isLayerSupported;
});

