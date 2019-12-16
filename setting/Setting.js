/*global define */
define([
  'dojo',
  'dojo/_base/declare',
  'dojo/json',
  'jimu/BaseWidgetSetting',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/_base/array',
  'dojo/_base/html',
  'dojo/_base/lang',
  'jimu/dijit/SimpleTable',
  'dojo/query',
  '../isLayerSupported',
  'dojo/NodeList-manipulate',
  'dijit/Dialog',
  'dijit/form/Button',
  'dijit/form/CheckBox',
  'dijit/form/NumberSpinner',
  'dijit/form/Select',
  'dijit/form/ValidationTextBox',
  'dijit/layout/TabContainer',
  'dijit/layout/ContentPane',
  'dojo/_base/config',
  'dojo/_base/html',
  'dojo/_base/query',
  'dojo/Deferred',
  'dojo/dom-style',
  'dojo/on',
  'dojo/parser',
  'jimu/dijit/URLInput',
  'jimu/dijit/Message',
  'jimu/portalUtils'
],
  function (dojo, declare, JSON, BaseWidgetSetting, WidgetsInTemplateMixin, array, html, lang, SimpleTable, query, isLayerSupported) {

    const TEST_BUILD_WARNING_SELECTOR = '.test_build_content';
    const BUILD_TYPE_TEST = 0;
    const BUILD_TYPE_RELEASE = 1;
    const BUILD_TYPE_DEVELOPMENT = 2;

    return declare([BaseWidgetSetting, WidgetsInTemplateMixin], {
      baseClass: 'jimu-widget-pictometry-setting',
      layersTable: undefined,
      displayLayers: undefined,

      postCreate: function () {
        var fields,
          args;

        // Add a layer table to the UI
        fields = [{
          name: 'id',
          title: this.nls.id,
          type: 'text',
          width: '0px'
        }, {
          name: 'name',
          title: this.nls.name,
          type: 'text'
        }, {
          name: 'enabled',
          title: this.nls.enabled,
          type: 'checkbox',
          'class': 'editable',
          width: '300px'
        }, {
          name: 'userConfigurable',
          title: this.nls.userConfigurable,
          type: 'checkbox',
          'class': 'editable',
          width: '300px'
        }];
        args = {
          fields: fields,
          selectable: false
        };
        this.layersTable = new SimpleTable(args);
        this.layersTable.placeAt(this.layersTableNode);
        this.layersTable.startup();

        //the config object is passed in
        this.setConfig(this.config);
      },

      startup: function () {
        this.inherited(arguments);
        this._initializeTestBuildWarning();
      },

      _initializeTestBuildWarning: function () {
        // If this is not a test build, remove the warning messages.
        if (this.manifest.buildtype === BUILD_TYPE_RELEASE || this.manifest.buildtype === BUILD_TYPE_DEVELOPMENT) {
          query(TEST_BUILD_WARNING_SELECTOR).remove();
        }
      },

      setConfig: function (config) {
        var ipaCredentials = config.ipaCredentials,
          widgetOptions = config.widgetOptions,
          dashboard = config.dashboard,
          userSettings = config.userSettings,
          navigation = dashboard.navigation,
          display = dashboard.display,
          measurements = dashboard.measurements,
          units = measurements.units,
          metric = units.metric,
          english = units.english,
          identify = dashboard.identify,
          exports = dashboard.exports,
          layerId,
          layerData;

        this.apiKeyNode.set('value', ipaCredentials.apiKey);
        this.ipaLoadUrlNode.set('value', ipaCredentials.ipaLoadUrl);
        this.ipaJsLibUrlNode.set('value', ipaCredentials.ipaJsLibUrl);

        this.signedUrlServiceNode.set('value', config.signedUrlService);

        this.widgetBehaviorTable.clear();
        this.widgetBehaviorTable.addRow({id: 'showFootprint', setting: this.nls.showFootprint, enabled: widgetOptions.showFootprint, configurable: userSettings.configFootprint});
        this.widgetBehaviorTable.addRow({id: 'showLocation', setting: this.nls.showLocation, enabled: widgetOptions.showLocation, configurable: userSettings.configLocation});
        this.widgetBehaviorTable.addRow({id: 'autoPan', setting: this.nls.autoPan, enabled: widgetOptions.autoPan, configurable: userSettings.imageToMapSync});
        this.showMapLayersNode.set('checked', widgetOptions.showMapLayersOnImage);
        if (widgetOptions.showMapLayersOnImage) {
          html.setStyle(this.layersTableSpanNode, 'display', '');
          html.setStyle(this.toggleLayersSpanNode, 'display', '');
        } else {
          html.setStyle(this.layersTableSpanNode, 'display', 'none');
          html.setStyle(this.toggleLayersSpanNode, 'display', 'none');
          this.toggleLayersNode.set('checked', false);
        }  
        
        this.showDashboardNode.set('checked', dashboard.show);
        if (dashboard.show) {
          html.setStyle(this.navigationSpanNode, 'display', 'inline');
        } else {
          html.setStyle(this.navigationSpanNode, 'display', 'none');
        }        
        
        this.showPanToolNode.set('checked', dashboard.showPanTool);

        this.showZoomNode.set('checked', navigation.showZoom);
        this.showRotationNode.set('checked', navigation.showRotation);
        this.showImageDateNode.set('checked', navigation.showImageDate);
        this.showNextPreviousNode.set('checked', navigation.showNextPrevious);
        this.showImageFilterNode.set('checked', navigation.showImageFilter);

        this.showStreetLayerNode.set('checked', display.showStreetLayer);

        this.displayLayers = this.getLayersFromMap();
        this.layersTable.clear();
        for (layerId in this.displayLayers) {
          if (this.displayLayers.hasOwnProperty(layerId)) {
            layerData = this.displayLayers[layerId];
            this.layersTable.addRow({
              id: layerId,
              name: layerData.name,
              enabled: layerData.enabled,
              userConfigurable: layerData.userConfigurable
            });
          }
        }

        this.showMeasurementToolsNode.set('checked', measurements.show);
        if (measurements.show) {
          html.setStyle(this.measurementToolsSpanNode, 'display', 'inline');
        } else {
          html.setStyle(this.measurementToolsSpanNode, 'display', 'none');
        }
        
        this.showAreaToolNode.set('checked', measurements.showAreaTool);
        this.showDistanceToolNode.set('checked', measurements.showDistanceTool);
        this.showHeightToolNode.set('checked', measurements.showHeightTool);
        this.showLocationToolNode.set('checked', measurements.showLocationTool);
        this.showElevationToolNode.set('checked', measurements.showElevationTool);
        this.showBearingToolNode.set('checked', measurements.showBearingTool);
        this.showSlopeToolNode.set('checked', measurements.showSlopeTool);
        this.showXyzToolNode.set('checked', measurements.showXyzTool);
        this.showUnpinMeasurementsNode.set('checked', measurements.showUnpinMeasurements);

        this.defaultUnitsNode.set('value', units.selected);

        this.metricDistanceUnitsNode.set('value', metric.distance);
        this.metricAngleUnitsNode.set('value', metric.angle);
        this.metricLocationUnitsNode.set('value', metric.location);
        this.metricAreaUnitsNode.set('value', metric.area);

        this.englishDistanceUnitsNode.set('value', english.distance);
        this.englishAngleUnitsNode.set('value', english.angle);
        this.englishLocationUnitsNode.set('value', english.location);
        this.englishAreaUnitsNode.set('value', english.area);

        this.showIdentifyPointNode.set('checked', identify.showIdentifyPoint);
        this.showIdentifyBoxNode.set('checked', identify.showIdentifyBox);
        this.showHideAnnotationsNode.set('checked', identify.showHideAnnotations);

        this.showExportImageNode.set('checked', exports.showExportImage);
        if (exports.showExportImage) {
          html.setStyle(this.exportImageSpanNode, 'display', 'inline');
        } else {
          html.setStyle(this.exportImageSpanNode, 'display', 'none');
        }
        
        this.exportImageDateNode.set('checked', exports.exportImageDate);
        this.exportImageTypeNode.set('value', exports.exportImageType);
        this.scaleOnExportNode.set('checked', exports.scaleOnExport);
        this.exportFullImageNode.set('checked', exports.exportFullImage);

        this.showExportPDFNode.set('checked', config.showExportPDF);
        
        this.selectUnitsNode.set('checked', userSettings.selectUnits);
        this.toggleLayersNode.set('checked', userSettings.toggleLayers);
      },

      getConfig: function () {
        //WAB will get config object through this method
        var ipaCredentials = {},
          widgetOptions = {},
          dashboard = {},
          userSettings = {},
          navigation = {},
          display = {},
          measurements = {},
          units = {},
          metric = {},
          english = {},
          identify = {},
          exports = {},
          layers;

        units.metric = metric;
        units.english = english;
        measurements.units = units;
        dashboard.navigation = navigation;
        dashboard.display = display;
        dashboard.measurements = measurements;
        dashboard.identify = identify;
        dashboard.exports = exports;

        ipaCredentials.apiKey = this.apiKeyNode.get('value');
        ipaCredentials.ipaLoadUrl = this.ipaLoadUrlNode.get('value');
        ipaCredentials.ipaJsLibUrl = this.ipaJsLibUrlNode.get('value');

        units.selected = this.defaultUnitsNode.get('value');

        var showFootprintRowData = this.widgetBehaviorTable.getRowDataArrayByFieldValue('id', 'showFootprint')[0];
        widgetOptions.showFootprint = showFootprintRowData.enabled;
        userSettings.configFootprint = showFootprintRowData.configurable;

        var showLocationRowData = this.widgetBehaviorTable.getRowDataArrayByFieldValue('id', 'showLocation')[0];
        widgetOptions.showLocation = showLocationRowData.enabled;
        userSettings.configLocation = showLocationRowData.configurable;

        var autoPanRowData = this.widgetBehaviorTable.getRowDataArrayByFieldValue('id', 'autoPan')[0];
        widgetOptions.autoPan = autoPanRowData.enabled;
        userSettings.imageToMapSync = autoPanRowData.configurable;

        widgetOptions.showMapLayersOnImage = this.showMapLayersNode.get('checked');
        widgetOptions.units = units.selected;

        dashboard.show = this.showDashboardNode.get('checked');
        dashboard.showPanTool = this.showPanToolNode.get('checked');

        navigation.showZoom = this.showZoomNode.get('checked');
        navigation.showRotation = this.showRotationNode.get('checked');
        navigation.showImageDate = this.showImageDateNode.get('checked');
        navigation.showNextPrevious = this.showNextPreviousNode.get('checked');
        navigation.showImageFilter = this.showImageFilterNode.get('checked');

        display.showStreetLayer = this.showStreetLayerNode.get('checked');
        layers = this.layersTable.getData();
        console.log("Data: " + JSON.stringify(layers));
        if (layers && layers.length > 0) {
          dojo.forEach(layers, lang.hitch(this, function (layer) {
            this.displayLayers[layer.id].enabled = layer.enabled;
            this.displayLayers[layer.id].userConfigurable = layer.userConfigurable;
          }));
          display.layers = this.displayLayers;
        }

        measurements.show = this.showMeasurementToolsNode.get('checked');
        measurements.showAreaTool = this.showAreaToolNode.get('checked');
        measurements.showDistanceTool = this.showDistanceToolNode.get('checked');
        measurements.showHeightTool = this.showHeightToolNode.get('checked');
        measurements.showLocationTool = this.showLocationToolNode.get('checked');
        measurements.showElevationTool = this.showElevationToolNode.get('checked');
        measurements.showBearingTool = this.showBearingToolNode.get('checked');
        measurements.showSlopeTool = this.showSlopeToolNode.get('checked');
        measurements.showXyzTool = this.showXyzToolNode.get('checked');
        measurements.showUnpinMeasurements = this.showUnpinMeasurementsNode.get('checked');

        metric.distance = this.metricDistanceUnitsNode.get('value');
        metric.angle = this.metricAngleUnitsNode.get('value');
        metric.location = this.metricLocationUnitsNode.get('value');
        metric.area = this.metricAreaUnitsNode.get('value');

        english.distance = this.englishDistanceUnitsNode.get('value');
        english.angle = this.englishAngleUnitsNode.get('value');
        english.location = this.englishLocationUnitsNode.get('value');
        english.area = this.englishAreaUnitsNode.get('value');

        identify.showIdentifyPoint = this.showIdentifyPointNode.get('checked');
        identify.showIdentifyBox = this.showIdentifyBoxNode.get('checked');
        identify.showHideAnnotations = this.showHideAnnotationsNode.get('checked');

        exports.showExportImage = this.showExportImageNode.get('checked');
        exports.exportImageDate = this.exportImageDateNode.get('checked');
        exports.exportImageType = this.exportImageTypeNode.get('value');
        exports.scaleOnExport = this.scaleOnExportNode.get('checked');
        exports.exportFullImage = this.exportFullImageNode.get('checked');


        userSettings.selectUnits = this.selectUnitsNode.get('checked');
        userSettings.toggleLayers = this.toggleLayersNode.get('checked');

        console.log("Display: " + JSON.stringify(display));
        return {
          ipaCredentials: ipaCredentials,
          signedUrlService: this.signedUrlServiceNode.get('value'),
          widgetOptions: widgetOptions,
          dashboard: dashboard,
          showExportPDF: this.showExportPDFNode.get('checked'),
          userSettings : userSettings
        };
      },

      getLayersFromMap: function () {
        var layers = {},
          layerProperties,
          configLayers;
        array.forEach(this.map.graphicsLayerIds, function (layerId) {
          var layer = this.map.getLayer(layerId);
          if (layer.id && isLayerSupported(layer)) {
            layerProperties = {
              url: layer.url,
              name: layer.label || layer.title || layer.name || layer.id,
              enabled: false,
              userConfigurable: true
            };

            // Retrieve the flags from the existing config, if possible
            console.log("Retrieve the flags from the existing config");
            console.log("this.config.layers: " + this.config.layers);
            configLayers = this.config.dashboard.display.layers;
            if (configLayers && configLayers[layerId] && configLayers[layerId].url === layer.url) {
              layerProperties.enabled = configLayers[layerId].enabled;
              layerProperties.userConfigurable = configLayers[layerId].userConfigurable;
            }
            layers[layer.id] = layerProperties;
          }
        }, this);
        return layers;
      },
      
      onShowMapLayersClicked: function() {
        if (this.showMapLayersNode.checked) {
          html.setStyle(this.layersTableSpanNode, 'display', '');
          html.setStyle(this.toggleLayersSpanNode, 'display', '');
        } else {
          html.setStyle(this.layersTableSpanNode, 'display', 'none');
          html.setStyle(this.toggleLayersSpanNode, 'display', 'none');
          this.toggleLayersNode.set('checked', false);
        }
      },
      
      onShowDashboardClicked: function () {
        if (this.showDashboardNode.checked) {
          html.setStyle(this.navigationSpanNode, 'display', 'inline');
        } else {
          html.setStyle(this.navigationSpanNode, 'display', 'none');
        }        
      },
      
      onShowExportImageClicked: function () {
        if (this.showExportImageNode.checked) {
          html.setStyle(this.exportImageSpanNode, 'display', 'inline');
        } else {
          html.setStyle(this.exportImageSpanNode, 'display', 'none');
        }       
      },
      
      onShowMeasurementToolsClicked: function () {
        if (this.showMeasurementToolsNode.checked) {
          this.showMeasurementToolsNode.checked = false;
          this.confirmNonPublicDialog.show();
        } else {
          html.setStyle(this.measurementToolsSpanNode, 'display', 'none');
        }        
      },
      
      onShowMeasurementsOkClicked: function() {
        this.showMeasurementToolsNode.checked = true;
        html.setStyle(this.measurementToolsSpanNode, 'display', 'inline');
        this.confirmNonPublicDialog.hide();
      },
      
      onShowMeasurementsCancelClicked: function() {
        this.confirmNonPublicDialog.hide();
      }
    });
  });
