/*global define */
/*global PictometryHost */
/* jshint maxlen:false */

define([
    'dijit/_WidgetsInTemplateMixin',
    'dojo',
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/json',
    'dojo/request',
    'dojo/request/script',
    'dojo/dom-class',
    'dojo/dom-construct',
    'dojo/on',
    'dojo/touch',
    'dojo/mouse',
    'esri/Color',
    'esri/config',
    'esri/geometry/geometryEngine',
    'esri/geometry/screenUtils',
    'esri/geometry/Extent',
    'esri/geometry/Point',
    'esri/geometry/Polygon',
    'esri/geometry/ScreenPoint',
    'esri/graphic',
    'esri/SpatialReference',
    'esri/symbols/SimpleLineSymbol',
    'esri/symbols/SimpleMarkerSymbol',
    'esri/tasks/GeometryService',
    'esri/tasks/ProjectParameters',
    'esri/kernel',
    'jimu/BaseWidget',
    'jimu/WidgetManager',
    'widgets/Pictometry/WidgetOptions',
    'widgets/Pictometry/LayerConfig',
    'widgets/Pictometry/UserOptionsMenu',
    'widgets/Pictometry/LayerSettingsMenu',
    'widgets/Pictometry/AboutDialog',
    'jimu/PanelManager',
    'widgets/Pictometry/Button',
    'widgets/Pictometry/ToggleButton',
    'widgets/Pictometry/DebugDisplay',
    'widgets/Pictometry/deepExtend.js',
    'dijit/Toolbar',
    'dijit/ToolbarSeparator',
    'esri/map'
  ],

  function (
    WidgetsInTemplateMixin,
    dojo,
    declare,
    lang,
    JSON,
    request,
    script,
    domClass,
    domConstruct,
    on,
    touch,
    mouse,
    Color,
    EsriConfig,
    geometryEngine,
    screenUtils,
    Extent,
    Point,
    Polygon,
    ScreenPoint,
    Graphic,
    SpatialReference,
    SimpleLineSymbol,
    SimpleMarkerSymbol,
    GeometryService,
    ProjectParameters,
    kernel,
    BaseWidget,
    WidgetManager,
    WidgetOptions,
    LayerConfig,
    UserOptionsMenu,
    LayerSettingsMenu,
    AboutDialog,
    PanelManager,
    Button,
    ToggleButton,
    debugDisplay
  ) {

    /*
     * Constants
     */
    var RED = new Color([255, 0, 0]),
      WGS84 = new SpatialReference(4326),
      DEFAULT_GEOMETRY_SERVICE_URL =
      '//tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer',
      IFRAME_ID = 'pictometry_ipa',
      COMPASS_CURSOR = 'url(widgets/Pictometry/css/images/compass_cursor.png), crosshair',
      DEFAULT_CURSOR = 'auto',

      /*
       * Statics
       */
      footprintSymbol,
      geometryService;

    return declare([BaseWidget, WidgetsInTemplateMixin], {
      baseClass: 'jimu-widget-pictometry',

      aboutDialog: null,

      /*
       * Instance simple types
       */
      isVisible: false,
      isActive: false,
      panelId: undefined,

      isSelectLocationToolEnabled: null,

      kernel: kernel,

      clickHandler: null,
      mouseUpHandler: null,

      /*
       * Creation
       */
      constructor: function () {
        /*
         * Instance objects
         */
        this.ipa = undefined;
        this.panel = undefined;
        this.crosshairs = undefined;
        this.footprint = undefined;
        this.footprintPolygon = undefined;
        this.ipaView = undefined;
        this.crosshairsSymbol = undefined;
        this.selectedUnits = undefined;
        this.widgetOptions = undefined;
        this.location = undefined;

        // Initialize static objects
        if (!footprintSymbol) {
          footprintSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, RED, 1);
        }

        if (!geometryService) {
          if (EsriConfig.defaults.geometryService) {
            geometryService = EsriConfig.defaults.geometryService;
          } else {
            geometryService = new GeometryService(DEFAULT_GEOMETRY_SERVICE_URL);
          }
        }

        // Initialize instance objects
        this.crosshairsSymbol = new SimpleMarkerSymbol();
        this.crosshairsSymbol.setOutline(
          new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, RED, 1)
        );
        this.crosshairsSymbol.setPath('<path stroke="#ff0000" d="m0 0 l8 16 l-8 -3 l-8 3 Z" />');

        on(document.body, touch.press, lang.hitch(this, function () {
          domClass.add('pictometry_ipa_overlay', 'shield_activated');
        }));
        on(document.body, touch.release, lang.hitch(this, function () {
          domClass.remove('pictometry_ipa_overlay', 'shield_activated');
        }));
        on(document.body, mouse.leave, lang.hitch(this, function () {
          domClass.remove('pictometry_ipa_overlay', 'shield_activated');
        }));

        document.theWidget = this;
      },

      postCreate: function () {
        this.inherited(arguments);

        this.panelId = this.domNode.id + '_panel';
        this.panel = PanelManager.getInstance().getPanelById(this.panelId);
        this.panel.resize({
          w: 505
        });

        this.loadWidgetOptions();
        this.loadLayerConfiguration();
        this.loadIpaLib();
      },

      startup: function () {
        this.inherited(arguments);

        debugDisplay.addParticipant(this, 'Widget');

        this._initializeUserOptionsToolbarButton();
        this._initializeLayerMenuToolbarButton();
        this._initializeAboutDialog();
        this._initializeSelectLocationToolbarButton();
        this.userOptionsMenu.on("unitsSet", lang.hitch(this, this.setIpaPreferences));
      },

      _initializeUserOptionsToolbarButton: function () {
        this.userOptionsMenu = new UserOptionsMenu(this.widgetOptions, this.config);
        var buttonVisible = !this.userOptionsMenu.isMenuEmpty();
        if (buttonVisible) {
          this.showUserOptionsButton = new Button('show_user_options_button', 'show_user_options_icon');
          this.showUserOptionsButton.onClick = lang.hitch(this, this.onShowUserOptions);
        } else {
          domConstruct.destroy('show_user_options_button');
        }
      },

      _initializeLayerMenuToolbarButton: function () {
        this.layerMenu = new LayerSettingsMenu(this.layerConfig, this.config);
        var buttonVisible = this.config.userSettings.toggleLayers;
        if (buttonVisible) {
          this.showLayerMenuButton = new Button('show_layer_menu_button', 'show_layer_menu_icon');
          this.showLayerMenuButton.onClick = lang.hitch(this, this.onShowLayerMenu);
        } else {
          domConstruct.destroy('show_layer_menu_button');
        }
      },

      _initializeAboutDialog: function () {
        this.aboutDialog = new AboutDialog(this.manifest.buildtype);
        this.aboutButton = new Button('about_button', 'about_icon');
        this.aboutButton.onClick = lang.hitch(this, function () {
          this.aboutDialog.show();
        });
      },

      _initializeSelectLocationToolbarButton: function () {
        this.selectLocationToggleButton = new ToggleButton('select_location_toggle_button', 'select_location_icon');
        this.selectLocationToggleButton.onClick = lang.hitch(this, this.onSelectLocationChanged);

        // Manually update the state of the select location tool to make sure it's consistent with 
        // the button.
        this.onSelectLocationChanged();
      },

      /*
       * Loads widget options and uses the deployer's settings as the default.
       */
      loadWidgetOptions: function () {
        var defaultOptions = this.config.widgetOptions;
        defaultOptions.units = this.config.dashboard.measurements.units.selected;
        this.widgetOptions = new WidgetOptions(defaultOptions);
      },

      /*
       * Loads all the configured layers.
       */
      loadLayerConfiguration: function () {
        this.layerConfig = new LayerConfig(this.map, this.config.dashboard.display.layers);
        this.layerConfig.on(LayerConfig.LAYER_ENABLED_EVENT, lang.hitch(this, function () {
          this.redrawLayersOnIpa();
        }));
      },

      /*
       * Instantiation
       */
      loadIpaLib: function () {
        script.get(this.config.ipaCredentials.ipaJsLibUrl).then(
          lang.hitch(this, function () {
            this.onScriptLoaded();
          })
        );
      },

      onScriptLoaded: function () {
        this.loadIpa();
        this.createPictometryHost();
      },

      loadIpa: function () {
        request(this.config.signedUrlService +
          "?url=" + encodeURIComponent(
            this.config.ipaCredentials.ipaLoadUrl +
            "?apikey=" + this.config.ipaCredentials.apiKey
          ) +
          "&preventCacheing=" + this.getCacheBuster(180)
        ).then(
          lang.hitch(this, function (data) {
            dojo.attr(IFRAME_ID, 'src', JSON.parse(data).url + "&app_id=" + IFRAME_ID);
          }),
          lang.hitch(this, function (err) {
            console.log("Error while trying to retrieve the Pictometry URL: " + err);
          })
        );
      },

      createPictometryHost: function () {
        this.ipa = new PictometryHost(IFRAME_ID, this.config.ipaCredentials.ipaLoadUrl);
        this.ipa.ready = lang.hitch(this, function () {
          this.onIpaReady();
        });
      },

      onIpaReady: function () {
        this.setIpaPreferences();
        this.addIpaListeners();
        this.gotoLastLocation();
        this.showAssociatedUI(true);
      },

      setIpaPreferences: function () {
        this.setUnits();
        this.configureDashboard();
        this.setPreferences();
      },

      setUnits: function () {
        var units;

        units = this.config.dashboard.measurements.units;
        if (this.widgetOptions.getUnits() === 'english') {
          this.selectedUnits = units.english;
        } else {
          this.selectedUnits = units.metric;
        }
      },

      setPreferences: function () {
        var preferences = {};
        preferences.imageDownload = true;
        preferences.imageDate = this.config.dashboard.exports.exportImageDate;
        preferences.imageType = this.getExportImageType(this.config.dashboard.exports.exportImageType);
        preferences.scaleOnExport = this.config.dashboard.exports.scaleOnExport;
        preferences.exportFullImage = this.config.dashboard.exports.exportFullImage;
        preferences.showStreetLayer = this.config.dashboard.display.showStreetLayer;
        preferences.distanceUnits = this.getDistanceUnits(this.selectedUnits.distance);
        preferences.areaUnits = this.getAreaUnits(this.selectedUnits.area);
        preferences.angleUnits = this.getAngleUnits(this.selectedUnits.angle);
        preferences.locationUnits = this.getLocationUnits(this.selectedUnits.location);
        this.ipa.setPreferences(preferences);
      },
      
      getExportImageType: function(configImageType) {
        var imageType;
        switch (configImageType) {
        case 'JPEG':
          imageType = this.ipa.IMAGE_TYPE.JPEG;
          break;
        case 'GIF':
          imageType = this.ipa.IMAGE_TYPE.GIF;
          break;
        case 'PNG':
          imageType = this.ipa.IMAGE_TYPE.PNG;
          break;
        case 'TIFF':
          imageType = this.ipa.IMAGE_TYPE.TIFF;
          break;
        }
        return imageType;
      },

      getDistanceUnits: function (configUnits) {
        var units;
        switch (configUnits) {
        case 'inches':
          units = this.ipa.DISTANCE_UNITS.INCHES;
          break;
        case 'feet':
          units = this.ipa.DISTANCE_UNITS.FEET;
          break;
        case 'yards':
          units = this.ipa.DISTANCE_UNITS.YARDS;
          break;
        case 'miles':
          units = this.ipa.DISTANCE_UNITS.MILES;
          break;
        case 'millimeters':
          units = this.ipa.DISTANCE_UNITS.MILLIMETERS;
          break;
        case 'centimeters':
          units = this.ipa.DISTANCE_UNITS.CENTIMETERS;
          break;
        case 'meters':
          units = this.ipa.DISTANCE_UNITS.METERS;
          break;
        case 'kilometers':
          units = this.ipa.DISTANCE_UNITS.KILOMETERS;
          break;
        case 'nauticalMiles':
          units = this.ipa.DISTANCE_UNITS.NAUTICAL_MILES;
          break;
        }
        return units;
      },

      getAreaUnits: function (configUnits) {
        var units;
        switch (configUnits) {
        case 'squareInches':
          units = this.ipa.AREA_UNITS.SQUARE_INCHES;
          break;
        case 'squareFeet':
          units = this.ipa.AREA_UNITS.SQUARE_FEET;
          break;
        case 'squareYards':
          units = this.ipa.AREA_UNITS.SQUARE_YARDS;
          break;
        case 'squareMiles':
          units = this.ipa.AREA_UNITS.SQUARE_MILES;
          break;
        case 'squareMillimeters':
          units = this.ipa.AREA_UNITS.SQUARE_MILLIMETERS;
          break;
        case 'squareCentimeters':
          units = this.ipa.AREA_UNITS.SQUARE_CENTIMETERS;
          break;
        case 'squareMeters':
          units = this.ipa.AREA_UNITS.SQUARE_METERS;
          break;
        case 'squareKilometers':
          units = this.ipa.AREA_UNITS.SQUARE_KILOMETERS;
          break;
        case 'acres':
          units = this.ipa.AREA_UNITS.ACRES;
          break;
        case 'hectares':
          units = this.ipa.AREA_UNITS.HECTARES;
          break;
        }
        return units;
      },

      getAngleUnits: function (configUnits) {
        var units;
        switch (configUnits) {
        case 'degrees':
          units = this.ipa.ANGLE_UNITS.DEGREES;
          break;
        case 'radians':
          units = this.ipa.ANGLE_UNITS.RADIANS;
          break;
        }
        return units;
      },

      getLocationUnits: function (configUnits) {
        var units;
        switch (configUnits) {
        case 'degrees':
          units = this.ipa.LOCATION_UNITS.DEGREES;
          break;
        case 'radians':
          units = this.ipa.LOCATION_UNITS.RADIANS;
          break;
        case 'degMin':
          units = this.ipa.LOCATION_UNITS.DEG_MIN;
          break;
        case 'degMinSec':
          units = this.ipa.LOCATION_UNITS.DEG_MIN_SEC;
          break;
        }
        return units;
      },

      configureDashboard: function () {
        var dashboard,
          makeVisible;

        dashboard = this.config.dashboard;
        if (!dashboard.show) {
          makeVisible = false;
        } else {
          makeVisible = {};
          makeVisible.zoom = dashboard.navigation.showZoom;
          makeVisible.imageFilter = dashboard.navigation.showImageFilter;
          makeVisible.layers = true; // TODO...
          makeVisible.nextPrevious = dashboard.navigation.showNextPrevious;
          makeVisible.tools = dashboard.showPanTool ||
            dashboard.measurements.show ||
            dashboard.identify.showIdentifyPoint ||
            dashboard.identify.showIdentifyBox;
          makeVisible.annotations = dashboard.identify.showHideAnnotations;
          makeVisible.rotation = dashboard.navigation.showRotation;
          makeVisible.clearMeasurements = dashboard.measurements.show && dashboard.measurements.showUnpinMeasurements;
          makeVisible.exportPdf = this.config.showExportPDF;
          makeVisible.dualPane = false;
          makeVisible.imageDate = dashboard.navigation.showImageDate;
          makeVisible.panTool = dashboard.showPanTool;
          makeVisible.exportImage = dashboard.exports.showExportImage;
          makeVisible.areaTool = dashboard.measurements.show && dashboard.measurements.showAreaTool;
          makeVisible.distanceTool = dashboard.measurements.show && dashboard.measurements.showDistanceTool;
          makeVisible.heightTool = dashboard.measurements.show && dashboard.measurements.showHeightTool;
          makeVisible.locationTool = dashboard.measurements.show && dashboard.measurements.showLocationTool;
          makeVisible.elevationTool = dashboard.measurements.show && dashboard.measurements.showElevationTool;
          makeVisible.bearingTool = dashboard.measurements.show && dashboard.measurements.showBearingTool;
          makeVisible.slopeTool = dashboard.measurements.show && dashboard.measurements.showSlopeTool;
          makeVisible.xyzTool = dashboard.measurements.show && dashboard.measurements.showXyzTool;
          makeVisible.identifyPoint = dashboard.identify.showIdentifyPoint;
          makeVisible.identifyBox = dashboard.identify.showIdentifyBox;
        }
        this.ipa.showDashboard(makeVisible);
      },

      addIpaListeners: function () {
        // NOTE: Navigation API Required
        this.ipa.setPreferences({
          enableSynchronization: true
        });

        this.ipa.addListener('synchronize', lang.hitch(this, this.onSynchronize));
      },

      wireMapEvents: function () {
        if (!this.clickHandler) {
          this.clickHandler = this.map.on("click", lang.hitch(this, this.onMapClick));
        }

        if (!this.mouseUpHandler) {
          this.mouseUpHandler = this.map.on('mouse-up', lang.hitch(this, this.updateMapCursor));
        }
      },

      unwireMapEvents: function () {
        if (this.clickHandler) {
          this.clickHandler.remove();
          this.clickHandler = null;
        }

        if (this.mouseUpHandler) {
          this.mouseUpHandler.remove();
          this.mouseUpHandler = null;
        }
      },

      /*
       * Map event handling
       */
      onMapClick: function (evt) {
        var zoom;

        if (this.isVisible && this.isSelectLocationToolEnabled) {
          zoom = this.map.getZoom() + 1;
          if (this.ipaView !== undefined && this.isActive) {
            zoom = this.ipaView.zoom;
          }
          this.gotoMapPoint(evt.mapPoint, zoom);
          if (!this.isActive) {
            this.isActive = true;
            this.showFootprints(true);
          }
        }
      },

      onMapExtentChange: function () {
        if (this.isVisible) {
          this.keepFootprintVisible();
        }
      },

      /*
       * UI event handling
       */
      onSelectLocationChanged: function () {
        this.setMapSelection(this.selectLocationToggleButton.isPressed());
      },

      onShowUserOptions: function () {
        this.userOptionsMenu.toggleMenuVisibility();
        this.layerMenu.close();
      },

      onShowLayerMenu: function () {
        this.layerMenu.toggleMenuVisibility();
        this.userOptionsMenu.close();
      },

      /*
       * IPA Event Handling
       */
      onSynchronize: function (view) {
        var point;

        this.ipaView = view;
        point = new Point(view.x, view.y, WGS84);
        if (point.spatialReference.wkid === this.map.spatialReference.wkid) {
          this.onSynchronizePoint(point);
        } else {
          geometryService.project(
            this.createProjectParameters([point], this.map.spatialReference),
            lang.hitch(this, function (geometries) {
              dojo.forEach(geometries, lang.hitch(this, function (projectedPoint) {
                this.onSynchronizePoint(projectedPoint);
              }));
            })
          );
        }

        // NOTE: View Extent Required
        this.ipa.getViewExtentLatLon(lang.hitch(this, this.onExtent));
      },

      onSynchronizePoint: function (point) {
        this.location = point;
        if (this.widgetOptions.getShowLocation()) {
          this.setCrosshairs(point);
        } else {
          this.hideCrosshairs();
        }
      },

      onExtent: function (values) {
        var polygon;

        polygon = new Polygon([
          [values.topLeft.x, values.topLeft.y],
          [values.topRight.x, values.topRight.y],
          [values.bottomRight.x, values.bottomRight.y],
          [values.bottomLeft.x, values.bottomLeft.y],
          [values.topLeft.x, values.topLeft.y]
        ]);
        polygon.spatialReference = WGS84;

        if (polygon.spatialReference.wkid === this.map.spatialReference.wkid) {
          this.onExtentPolygon(polygon);
        } else {
          geometryService.project(
            this.createProjectParameters([polygon], this.map.spatialReference),
            lang.hitch(this, function (geometries) {
              dojo.forEach(geometries, lang.hitch(this, function (projectedPolygon) {
                this.onExtentPolygon(projectedPolygon);
              }));
            })
          );
        }
      },

      onExtentPolygon: function (polygon) {
        if (this.widgetOptions.getShowFootprint()) {
          this.setFootprint(polygon);
        } else {
          this.hideFootprint();
        }

        if (this.widgetOptions.getAutoPan()) {
          this.keepFootprintVisible();
        }

        if (this.config.widgetOptions.showMapLayersOnImage) {
          this.showLayersOnIpa(polygon);
        } else {
          this.ipa.removeAllShapes();
        }
      },

      /*
       * Widget event handling
       */
      onOpen: function () {
        this.loadIpa();
        this.showAssociatedUI(true);
        this.setMapSelection(true);
          this.wireMapEvents();
      },

      onClose: function () {
        this.showAssociatedUI(false);
        this.setMapSelection(false);
          this.unwireMapEvents();
      },

      onMaximize: function () {
        this.showAssociatedUI(true);
      },

      onMinimize: function () {
        this.showAssociatedUI(false);
      },

      resize: function () {
        this.userOptionsMenu.resize();
        this.layerMenu.resize();
      },

      /*
       * IPA navigation
       */
      gotoMapPoint: function (point, zoom) {
        if (point.spatialReference.wkid === WGS84.wkid) {
          this.setLocation(point, zoom);
        } else {
          geometryService.project(
            this.createProjectParameters([point], WGS84),
            lang.hitch(this, function (geometries) {
              dojo.forEach(geometries, lang.hitch(this, function (projectedPoint) {
                this.setLocation(projectedPoint, zoom);
              }));
            })
          );
        }
      },

      gotoLastLocation: function () {
        if (this.ipaView) {
          this.setLocation(new Point(this.ipaView.x, this.ipaView.y, WGS84), this.ipaView.zoom);
        }
      },

      setLocation: function (point, zoom) {
        this.ipa.setLocation({
          x: point.x,
          y: point.y,
          zoom: zoom
        });
      },

      /*
       * Cross-hairs and footprint display
       */
      setCrosshairs: function (point) {
        this.hideCrosshairs();
        this.setCrosshairsAngle();
        this.crosshairs = new Graphic(point, this.crosshairsSymbol);
        this.showCrosshairs();
      },

      setCrosshairsAngle: function () {
        if (this.ipaView === null) {
          this.crosshairsSymbol.setAngle(0);
          this.crosshairsSymbol.setOffset(0, -8);
        } else {
          switch (this.ipaView.orientation) {
          case this.ipa.MAP_ORIENTATION.NORTH:
            this.crosshairsSymbol.setAngle(0);
            this.crosshairsSymbol.setOffset(0, -8);
            break;
          case this.ipa.MAP_ORIENTATION.EAST:
            this.crosshairsSymbol.setAngle(90);
            this.crosshairsSymbol.setOffset(-8, 0);
            break;
          case this.ipa.MAP_ORIENTATION.SOUTH:
            this.crosshairsSymbol.setAngle(180);
            this.crosshairsSymbol.setOffset(0, 8);
            break;
          case this.ipa.MAP_ORIENTATION.WEST:
            this.crosshairsSymbol.setAngle(270);
            this.crosshairsSymbol.setOffset(8, 0);
            break;
          }
        }
      },

      hideCrosshairs: function () {
        if (this.crosshairs && this.isVisible) {
          this.map.graphics.remove(this.crosshairs);
        }
      },

      showCrosshairs: function () {
        if (this.crosshairs && this.isVisible) {
          this.map.graphics.add(this.crosshairs);
        }
      },

      setFootprint: function (polygon) {
        this.hideFootprint();
        this.footprint = new Graphic(polygon, footprintSymbol);
        this.showFootprint();
      },

      hideFootprint: function () {
        if (this.footprint && this.isVisible) {
          this.map.graphics.remove(this.footprint);
        }
      },

      showFootprint: function () {
        if (this.footprint && this.isVisible) {
          this.map.graphics.add(this.footprint);
        }
      },

      showAssociatedUI: function (shown) {
        if (shown) {
          this.isVisible = true;
          this.showFootprints(shown);
          this.userOptionsMenu.resize();
          this.layerMenu.resize();
        } else {
          this.showFootprints(shown);
          this.isVisible = false;
        }
      },

      showFootprints: function (shown) {
        if (this.isActive) {
          if (shown) {
            this.showCrosshairs();
            this.showFootprint();
          } else {
            this.hideCrosshairs();
            this.hideFootprint();
          }
        }
      },

      /*
       * Image->Map Synchronization
       */
      keepFootprintVisible: function () {
        var footprintScreenExtent,
          mapScreenExtent,
          widgetScreenExtent,
          crosshairsScreenPosition,
          margin,
          leftQuadrant,
          rightQuadrant,
          topQuadrant,
          bottomQuadrant,
          bestQuadrant,
          minimumDimension,
          scaleFactor,
          xOffset,
          yOffset,
          xScaleFactor,
          yScaleFactor,
          zoomLevels,
          mapExtent;

        // Get the screen geometries of the elements involved
        footprintScreenExtent = screenUtils.toScreenGeometry(
          this.map.extent,
          this.map.width,
          this.map.height,
          this.footprint.geometry.getExtent()
        );
        mapScreenExtent = screenUtils.toScreenGeometry(
          this.map.extent,
          this.map.width,
          this.map.height,
          this.map.extent
        );
        widgetScreenExtent = screenUtils.toScreenGeometry(
          this.map.extent,
          this.map.width,
          this.map.height,
          this.getPanelExtent()
        );
        crosshairsScreenPosition = screenUtils.toScreenPoint(
          this.map.extent,
          this.map.width,
          this.map.height,
          this.location
        );

        // Add a visual margin around the footprint
        margin = 5;
        footprintScreenExtent.xmin -= margin;
        footprintScreenExtent.ymin += margin;
        footprintScreenExtent.xmax += margin;
        footprintScreenExtent.ymax -= margin;

        // If the footprint is not fully within the screen or it overlaps the widget,
        // perform the minimum necessary reposition and/or zoom operations to make 
        // the footprint fully visible
        if (!geometryEngine.disjoint(footprintScreenExtent, widgetScreenExtent) ||
          !geometryEngine.within(footprintScreenExtent, mapScreenExtent)) {
          // Figure out where to reposition the footprint to:
          // There are four quadrants where we could reposition the footprint to
          leftQuadrant = new Extent(
            mapScreenExtent.xmin,
            mapScreenExtent.ymin,
            widgetScreenExtent.xmin - 1,
            mapScreenExtent.ymax
          );
          rightQuadrant = new Extent(
            widgetScreenExtent.xmax + 1,
            mapScreenExtent.ymin,
            mapScreenExtent.xmax,
            mapScreenExtent.ymax
          );
          topQuadrant = new Extent(
            mapScreenExtent.xmin,
            widgetScreenExtent.ymax - 1,
            mapScreenExtent.xmax,
            mapScreenExtent.ymax
          );
          bottomQuadrant = new Extent(
            mapScreenExtent.xmin,
            mapScreenExtent.ymin,
            mapScreenExtent.xmax,
            widgetScreenExtent.ymin + 1
          );

          // Pick the best quadrant. The best quadrant is defined as the one
          // with the largest minimum dimension.
          // TODO: we could preserve the current quadrant if the widget will 
          // fit without zooming. The "current quadrant" should be defined as
          // the quadrant where the crosshairs is curently located. If the center
          // is located in two quadrants (e.g. lower left) then the current 
          // quadrant is the best of the two quadrants given the above definition.
          bestQuadrant = leftQuadrant;
          minimumDimension = this.getMinimumDimension(leftQuadrant);
          if (this.getMinimumDimension(topQuadrant) > minimumDimension) {
            bestQuadrant = topQuadrant;
            minimumDimension = this.getMinimumDimension(topQuadrant);
          }
          if (this.getMinimumDimension(rightQuadrant) > minimumDimension) {
            bestQuadrant = rightQuadrant;
            minimumDimension = this.getMinimumDimension(rightQuadrant);
          }
          if (this.getMinimumDimension(bottomQuadrant) > minimumDimension) {
            bestQuadrant = bottomQuadrant;
            minimumDimension = this.getMinimumDimension(bottomQuadrant);
          }

          // If the footprint will not fit in the best quadrant, zooming is necessary
          scaleFactor = 1.0;
          xOffset = 0;
          yOffset = 0;
          if (footprintScreenExtent.getWidth() > bestQuadrant.getWidth() ||
            footprintScreenExtent.getHeight() > bestQuadrant.getHeight()) {
            // Determine the number of levels to zoom out and the corresponding scale factor
            xScaleFactor = footprintScreenExtent.getWidth() / bestQuadrant.getWidth();
            yScaleFactor = footprintScreenExtent.getHeight() / bestQuadrant.getHeight();
            scaleFactor = Math.max(xScaleFactor, yScaleFactor);
            zoomLevels = Math.ceil(Math.log2(scaleFactor));
            scaleFactor = Math.pow(2, zoomLevels);

            // Calculate the new map extent given the requested zoom level 
            // and preserving the position of the crosshairs on the screen
            xOffset = -crosshairsScreenPosition.x;
            yOffset = -crosshairsScreenPosition.y;
            mapScreenExtent = mapScreenExtent.offset(xOffset, yOffset);
            mapScreenExtent.xmin *= scaleFactor;
            mapScreenExtent.xmax *= scaleFactor;
            mapScreenExtent.ymin *= scaleFactor;
            mapScreenExtent.ymax *= scaleFactor;
            mapScreenExtent = mapScreenExtent.offset(-xOffset, -yOffset);

            // Recalculate the footprint geometry on the map
            footprintScreenExtent = footprintScreenExtent.offset(xOffset, yOffset);
            footprintScreenExtent.xmin /= scaleFactor;
            footprintScreenExtent.xmax /= scaleFactor;
            footprintScreenExtent.ymin /= scaleFactor;
            footprintScreenExtent.ymax /= scaleFactor;
            footprintScreenExtent = footprintScreenExtent.offset(-xOffset, -yOffset);
          }

          // Figure out the minimum move necessary to get the footprint
          // fully within the best quadrant
          xOffset = 0;
          yOffset = 0;
          if (footprintScreenExtent.xmin < bestQuadrant.xmin) {
            xOffset += bestQuadrant.xmin - footprintScreenExtent.xmin;
          } else if (footprintScreenExtent.xmax > bestQuadrant.xmax) {
            xOffset += bestQuadrant.xmax - footprintScreenExtent.xmax;
          }
          if (footprintScreenExtent.ymin > bestQuadrant.ymin) {
            yOffset += bestQuadrant.ymin - footprintScreenExtent.ymin;
          } else if (footprintScreenExtent.ymax < bestQuadrant.ymax) {
            yOffset += bestQuadrant.ymax - footprintScreenExtent.ymax;
          }

          // Scale the offset to account for the zoom scaling
          xOffset *= scaleFactor;
          yOffset *= scaleFactor;

          // Move the footprint to its new location
          mapScreenExtent = mapScreenExtent.offset(-xOffset, -yOffset);
          mapExtent = screenUtils.toMapGeometry(
            this.map.extent,
            this.map.width,
            this.map.height,
            mapScreenExtent
          );
          this.map.setExtent(mapExtent, false);
        }
      },

      getPanelExtent: function () {
        var info,
          mapPosition,
          ulScreenPoint,
          lrScreenPoint,
          ulMapPoint,
          lrMapPoint,
          panelExtent;

        info = dojo.position(this.panelId, false);

        // translate the position to be relative to the map origin
        mapPosition = this.map.position;
        info.x -= mapPosition.x;
        info.y -= mapPosition.y;

        ulScreenPoint = new ScreenPoint(info.x, info.y + info.h);
        lrScreenPoint = new ScreenPoint(info.x + info.w, info.y);

        ulMapPoint = this.map.toMap(ulScreenPoint);
        lrMapPoint = this.map.toMap(lrScreenPoint);

        panelExtent = new Extent(
          ulMapPoint.x,
          ulMapPoint.y,
          lrMapPoint.x,
          lrMapPoint.y,
          ulMapPoint.spatialReference
        );
        return panelExtent;
      },

      getMinimumDimension: function (extent) {
        return Math.min(extent.getWidth(), extent.getHeight());
      },

      /*
       * Layer display on IPA
       */
      showLayersOnIpa: function (footprintPolygon) {
        var layers,
          mapLayer;

        // Remember the footprint polygon so it can be used by redrawLayersOnIpa().
        this.footprintPolygon = footprintPolygon;

        this.ipa.removeAllShapes();

        layers = this.layerConfig.getLayers();
        dojo.forEach(layers, lang.hitch(this, function (layer) {
          mapLayer = this.map.getLayer(layer.id);
          if (layer.enabled && this.isLayerVisible(mapLayer)) {
            this.renderLayer(mapLayer, footprintPolygon);
          }
        }));
      },

      redrawLayersOnIpa: function () {
        if (this.footprintPolygon !== undefined) {
          this.showLayersOnIpa(this.footprintPolygon);
        }
      },

      isLayerVisible: function (mapLayer) {
        return (
          mapLayer.visible &&
          mapLayer.visibleAtMapScale &&
          mapLayer.graphics !== undefined);
      },

      renderLayer: function (mapLayer, footprintPolygon) {
        var clippedGraphics,
          clippedGeometry,
          clippedGraphic,
          clippedGeometries,
          projectedGraphics,
          i;

        clippedGraphics = [];
        dojo.forEach(mapLayer.graphics, lang.hitch(this, function (graphic) {
          clippedGeometry = geometryEngine.clip(
            graphic.geometry,
            footprintPolygon.getExtent().expand(3)
          );
          if (clippedGeometry !== null) {
            clippedGraphic = dojo.mixin({}, graphic); // Shallow copy the graphic object
            clippedGraphic.geometry = clippedGeometry;
            clippedGraphics.push(clippedGraphic);
          }
        }));

        clippedGeometries = [];
        if (clippedGraphics.length > 0) {
          dojo.forEach(clippedGraphics, function (clippedGraphic) {
            clippedGeometries.push(clippedGraphic.geometry);
          });
          geometryService.project(
            this.createProjectParameters(clippedGeometries, WGS84),
            lang.hitch(this, function (projectedGeometries) {
              projectedGraphics = [];
              for (i = 0; i < projectedGeometries.length; i += 1) {
                projectedGraphics[i] = clippedGraphics[i];
                if (projectedGraphics[i]) {
                  projectedGraphics[i].geometry = projectedGeometries[i];
                }
              }
              this.sendGraphicsToIpa(projectedGraphics, mapLayer.renderer);
            })
          );
        }
      },

      sendGraphicsToIpa: function (graphics, renderer) {
        var shapes = [];

        dojo.forEach(graphics, lang.hitch(this, function (graphic) {
          if (graphic && graphic.geometry) {
            switch (graphic.geometry.type) {
            case 'point':
              shapes.push(this.ipaPointShape(graphic, renderer));
              break;
            case 'multipoint':
              shapes = shapes.concat(this.ipaMultipointShapes(graphic, renderer));
              break;
            case 'polyline':
              shapes = shapes.concat(this.ipaPolylineShapes(graphic, renderer));
              break;
            case 'polygon':
              shapes.push(this.ipaPolygonShape(graphic, renderer));
              break;
            }
          }
        }));

        this.ipa.addShapes(shapes, function (results) {
          dojo.forEach(results, lang.hitch(this, function (result) {
            if (result.success === false) {
              console.log("addShapes error: " + result.error);
            }
          }));
        });
      },

      ipaPointShape: function (graphic, renderer) {
        var shape,
          symbol,
          symbolAttributes;

        shape = {
          type: this.ipa.SHAPE_TYPE.POINT,
          center: {
            x: graphic.geometry.x,
            y: graphic.geometry.y
          }
        };

        if (renderer !== undefined) {
          symbol = renderer.getSymbol(graphic);
        } else {
          symbol = graphic.symbol;
        }
        symbolAttributes = this.getAttributesForMarkerSymbol(symbol);
        dojo.mixin(shape, symbolAttributes);
        return shape;
      },

      ipaMultipointShapes: function (graphic, renderer) {
        var shapes = [],
          symbol,
          symbolAttributes,
          shape;

        if (renderer !== undefined) {
          symbol = renderer.getSymbol(graphic);
        } else {
          symbol = graphic.symbol;
        }
        symbolAttributes = this.getAttributesForMarkerSymbol(symbol);
        dojo.forEach(graphic.geometry.points, lang.hitch(this, function (point) {
          shape = {
            type: this.ipa.SHAPE_TYPE.POINT,
            center: {
              x: point[0],
              y: point[1]
            }
          };
          dojo.mixin(shape, symbolAttributes);
          shapes.push(shape);
        }));
        return shapes;
      },

      ipaPolylineShapes: function (graphic, renderer) {
        var shapes = [],
          symbol,
          symbolAttributes,
          shape;

        if (renderer !== undefined) {
          symbol = renderer.getSymbol(graphic);
        } else {
          symbol = graphic.symbol;
        }
        symbolAttributes = this.getAttributesForLineSymbol(symbol);

        dojo.forEach(graphic.geometry.paths, lang.hitch(this, function (path) {
          shape = {
            type: this.ipa.SHAPE_TYPE.POLYLINE,
            coordinates: []
          };
          dojo.forEach(path, function (point) {
            shape.coordinates.push({
              x: point[0],
              y: point[1]
            });
          });
          dojo.mixin(shape, symbolAttributes);
          shapes.push(shape);
        }));
        return shapes;
      },

      ipaPolygonShape: function (graphic, renderer) {
        var shape,
          symbol,
          symbolAttributes,
          points;

        shape = {
          type: this.ipa.SHAPE_TYPE.POLYGON,
          coordinates: []
        };
        if (renderer !== undefined) {
          symbol = renderer.getSymbol(graphic);
        } else {
          symbol = graphic.symbol;
        }

        symbolAttributes = this.getAttributesForFillSymbol(symbol);
        dojo.mixin(shape, symbolAttributes);

        dojo.forEach(graphic.geometry.rings, lang.hitch(this, function (ring) {
          points = [];
          dojo.forEach(ring, lang.hitch(this, function (point) {
            points.push({
              x: point[0],
              y: point[1]
            });
          }));
          shape.coordinates.push(points);
        }));
        return shape;
      },

      getAttributesForMarkerSymbol: function (symbol) {
        var symbolAttributes;

        if (symbol === undefined) {
          symbolAttributes = {
            color: "#00ff00",
            opacity: 0.75
          };
        } else {
          switch (symbol.type) {
          case 'simplemarkersymbol':
            symbolAttributes = {
              // SimpleMarkerSymbol properties not supported in the IPA:
              // angle, outline, size, style, xoffset, yoffset
              // we could provide images for each supported style and treat
              // simple markers like picture markers. Another option is 
              // SVG-defined shapes. A third option is to use Circle, which
              // is a point with a few more attributes, e.g. size and outline.
            };
            if (symbol.color) {
              symbolAttributes.color = symbol.color.toHex();
              symbolAttributes.opacity = 0.75;
            }
            break;
          case 'picturemarkersymbol':
            symbolAttributes = {
              markerImageHeight: symbol.height,
              markerImageWidth: symbol.width,
              markerOffsetX: symbol.xoffset,
              markerOffsetY: symbol.yoffset,
              markerImage: symbol.url
                // ImageMarkerSymbol properties not supported in the IPA: angle
            };
            if (symbol.color) {
              symbolAttributes.color = symbol.color.toHex();
            }
            break;
          }
        }
        return symbolAttributes;
      },

      getAttributesForLineSymbol: function (symbol) {
        var symbolAttributes;

        if (symbol === undefined) {
          symbolAttributes = {
            strokeColor: "#00ff00",
            strokeOpacity: 0.75,
            strokeWeight: 1
          };
        } else {
          switch (symbol.type) {
          case 'simplelinesymbol':
          case 'cartographiclinesymbol':
            symbolAttributes = {
              strokeWeight: symbol.width
                // SimpleLineSymbol properties not supported in the IPA: style
                // CartographicLineSymbol properties not supported in the IPA: cap, join, miterLimit
            };
            if (symbol.color) {
              symbolAttributes.strokeColor = symbol.color.toHex();
              symbolAttributes.strokeOpacity = 0.75;
            } else {
              symbolAttributes.strokeColor = "#00ff00";
              symbolAttributes.strokeOpacity = 0.75;
            }
            break;
          }
        }

        // HACK: at least return something if we get called with the wrong symbol type
        if (!symbolAttributes) {
          symbolAttributes = {
            strokeColor: "#00ff00",
            strokeOpacity: 0.75,
            strokeWeight: 1
          };
        }

        return symbolAttributes;
      },

      getAttributesForFillSymbol: function (symbol) {
        var symbolAttributes;

        if (symbol === undefined) {
          symbolAttributes = {
            strokeColor: "#00ff00",
            strokeOpacity: 0.75,
            strokeWeight: 1
          };
        } else {
          switch (symbol.type) {
          case 'simplefillsymbol':
            symbolAttributes = {
              strokeWeight: symbol.outline.width
                // SimpleFillSymbol properties not supported in the IPA: style, outline.style
            };
            if (symbol.outline.color) {
              symbolAttributes.strokeColor = symbol.outline.color.toHex();
              symbolAttributes.strokeOpacity = 0.75;
            }
            if (symbol.color) {
              symbolAttributes.fillColor = symbol.color.toHex();
              symbolAttributes.fillOpacity = 0.25;
            }
            break;
          case 'picturefillsymbol':
            symbolAttributes = {
              strokeWeight: symbol.outline.width,
              fillOpacity: 0.25
                // There is no equivalent for PictureFillSymbol in the IPA,
                // we will just draw the outline.
            };
            if (symbol.outline.color) {
              symbolAttributes.strokeColor = symbol.outline.color.toHex();
              symbolAttributes.strokeOpacity = 0.75;
            }
            break;
          }
        }
        return symbolAttributes;
      },

      /*
       * Utilities
       */
      getCacheBuster: function (ttlSecs) {
        return (Math.floor(new Date().getTime() / (1000 * ttlSecs)));
      },

      createProjectParameters: function (geometries, spatialReference) {
        var params = new ProjectParameters();
        params.geometries = geometries;
        params.outSR = spatialReference;
        return params;
      },

      setMapSelection: function (enableMapSelection) {
        if (this.selectLocationToggleButton.isPressed() !== enableMapSelection) {
          this.selectLocationToggleButton.setPressed(enableMapSelection);
        }
        this.map.setInfoWindowOnClick(!enableMapSelection);
        this.isSelectLocationToolEnabled = enableMapSelection;
        this.updateMapCursor();
      },

      getLayerIdsAndNames: function () {
        var layers = [];

        var layerIds = this.map.graphicsLayerIds;
        if (layerIds.length > 0) {
          dojo.forEach(layerIds, lang.hitch(this, function (layerId) {
            var layer = this.map.getLayer(layerId);
            layers.push({
              id: layerId,
              name: layer.name
            });
          }));
        }

        return layers;
      },

      updateMapCursor: function () {
        if (this.isSelectLocationToolEnabled) {
          this.map.setCursor(COMPASS_CURSOR);
        } else {
          this.map.setCursor(DEFAULT_CURSOR);
        }
      },

      getDebugInfo: function () {
        return {
          crosshairsSymbol: this.crosshairsSymbol,
          crosshairs: this._getCrosshairsDebugInfo(),
          footprint: this._getFootprintDebugInfo(),
          ipaView: this.ipaView,
          selectedUnits: this.selectedUnits,
          widgetOptions: this.widgetOptions,
          location: this.location,
          allWidgets: this._getAllWidgetDebugInfo()
        }
      },

      _getCrosshairsDebugInfo: function () {
        var debugInfo = {};
        Object.deepExtend(debugInfo, this._cherryPick(this.crosshairs, 'geometry.x'))
        Object.deepExtend(debugInfo, this._cherryPick(this.crosshairs, 'geometry.y'))
        Object.deepExtend(debugInfo, this._cherryPick(this.crosshairs, 'geometry.type'))
        Object.deepExtend(debugInfo, this._cherryPick(this.crosshairs, 'geometry.spatialReference.wkid'))
        return debugInfo;
      },

      _getFootprintDebugInfo: function () {
        var debugInfo = {};
        Object.deepExtend(debugInfo, this._cherryPick(this.footprint, 'geometry.rings'))
        Object.deepExtend(debugInfo, this._cherryPick(this.footprint, 'geometry.type'))
        Object.deepExtend(debugInfo, this._cherryPick(this.footprint, 'geometry.spatialReference.wkid'))
        return debugInfo;
      },

      _getAllWidgetDebugInfo: function () {
        var allWidgets = WidgetManager.getInstance().getAllWidgets();
        var widgetDebugInfo = [];
        dojo.forEach(allWidgets, lang.hitch(this, function (widget) {
          widgetDebugInfo.push({
            name: widget.name,
            class: widget.class,
            focused: widget.focused,
            folderUrl: widget.folderUrl,
            gid: widget.gid,
            inPanel: widget.inPanel,
            isController: widget.isController,
            isOnScreen: widget.isOnScreen,
            isThemeWidget: widget.isThemeWidget,
            started: widget.started,
            state: widget.state,
            supportMultiInstance: widget.supportMultiInstance
          })
        }));

        return widgetDebugInfo;
      },

      _cherryPick: function (obj, path) {
        // If the path has been specified as a string (like 'foo.bar.baz'), split it into an array.
        if (typeof(path) === 'string') {
          path = path.split('.');
        }

        var currentPath = path.shift();
        if (obj && currentPath) {
          var retval = {};
          var currentProperty = obj[currentPath];
          if (currentProperty instanceof Object) {
            retval[currentPath] = this._cherryPick(currentProperty, path);
          } else if (currentProperty !== undefined) {
            retval[currentPath] = currentProperty;
          }
        } else {
          var retval = obj;
        }

        return retval;
      }
    });
  }
);
