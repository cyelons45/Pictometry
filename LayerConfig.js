define(
  [
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/Evented',
    './LocalStorage',
    './DebugDisplay',
    './isLayerSupported'
  ],

  function (declare, array, Evented, LocalStorage, debugDisplay, isLayerSupported) {
    var OPTIONS_STORE_NAME = 'Layers';
    var LAYER_ENABLED_EVENT = 'layerenabled';

    var clazz = declare([Evented], {

      constructor: function (map, defaultLayerConfig) {
        this.localStorage = new LocalStorage(OPTIONS_STORE_NAME);
        this.layers = null;

        this._loadLayers(map, defaultLayerConfig);

        debugDisplay.addParticipant(this, 'LayerConfig');
      },

      _loadLayers: function (map, defaultLayerConfig) {
        // Ensure that defaultLayerConfig is defined.
        if (!defaultLayerConfig) {
          defaultLayerConfig = {};
        }

        var localLayerConfig = this.localStorage.getProperty('layers');
        if (localLayerConfig === undefined) {
          localLayerConfig = {};
        }

        this.layers = [];

        // Loop over all the layers in the map.
        array.forEach(map.graphicsLayerIds, function (layerId) {
          var mapLayer = map.getLayer(layerId);
          if(isLayerSupported(mapLayer)) {

            // Get its details.
            var mapLayerProperties = {
              id: layerId,
              url: mapLayer.url,
              name: mapLayer.label || mapLayer.title || mapLayer.name || mapLayer.id,
              enabled: false,
              userConfigurable: true
            };

            // If it's in the default list, override enabled and userConfigurable.
            var defaultLayerProperties = defaultLayerConfig[mapLayer.id];
            if (defaultLayerProperties !== undefined) {
              mapLayerProperties.enabled = defaultLayerProperties.enabled;
              mapLayerProperties.userConfigurable = defaultLayerProperties.userConfigurable;
            }

            // If it's in the local settings and is user configurable, override enabled.
            var localLayerProperties = localLayerConfig[mapLayer.id];
            if (localLayerProperties !== undefined && mapLayerProperties.userConfigurable) {
              mapLayerProperties.enabled = localLayerProperties.enabled;
            }

            // Add it to the list of loaded layers.
            this.layers.push(mapLayerProperties);
          }
        }, this);
      },

      getLayers: function () {
        return this.layers;
      },

      setLayerEnabled: function (layerId, enabled) {
        var index = this._findLayerIndex(layerId);
        if (index !== undefined) {
          this.layers[index].enabled = enabled;
          this._updateLocalStorage();
        }

        this.emit(LAYER_ENABLED_EVENT, this.layers[index]);
      },

      _updateLocalStorage: function () {
        // Convert the array of layers into an object that looks like this:
        // {
        //   layer1_id: {
        //     enabled: true
        //   }
        //   layer2_id: {
        //     enabled: false
        //   }
        // }
        var transmogrifiedLayer = {};
        array.forEach(this.layers, function (layer) {
          transmogrifiedLayer[layer.id] = {
            enabled: layer.enabled
          };
        }, this);

        // Put the new structure into local storage.
        this.localStorage.setProperty('layers', transmogrifiedLayer);
      },

      _findLayerIndex: function (layerId) {
        var i = 0;
        var layerFound = array.some(this.layers, function (layer) {
          if (layer.id === layerId) {
            return true;
          }
          i++;
        });

        if (layerFound) {
          return i;
        }

        return undefined;
      },

      getDebugInfo: function () {
        return {
          layers: this.layers
        }
      }

    });

    clazz.LAYER_ENABLED_EVENT = LAYER_ENABLED_EVENT;

    return clazz;
  }
);
