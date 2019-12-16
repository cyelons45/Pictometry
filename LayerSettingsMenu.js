define([
    'dojo/_base/declare',
    'dojo/dom',
    'dojo/dom-construct',
    'dojo/query',
    'dojo/_base/array',
    'widgets/Pictometry/SlidePanel',
    'dijit/form/CheckBox',
    'dojo/domReady!'
  ],

  function (declare, dom, domConstruct, query, array, SlidePanel, CheckBox) {

    var LAYER_SETTINGS_ID = 'layer_settings_menu';
    var MENU_CONTENTS_CLASS = '.menu_contents';

    return declare(SlidePanel, {

      layerconfig: null,

      "-chains-": {
        constructor: "manual"
      },

      constructor: function (layerConfig) {
        var node = dom.byId(LAYER_SETTINGS_ID);
        this.inherited(arguments, [node, SlidePanel.DockLocations.BOTTOM]);

        this.layerConfig = layerConfig;
        this._initializeMenu();
        this.resize();
      },

      _initializeMenu: function () {
        var layers = this.layerConfig.getLayers();
        array.forEach(layers, function (layer) {
          if (layer.userConfigurable) {
            this.addLayer(layer);
          }
        }, this);

        // Make sure the items in the menu can't be tabbed to while the menu is hidden.
        this._removeMenuItemsFromTabOrder();
      },

      toggleMenuVisibility: function () {
        if (this.isOpen) {
          this.close();
        } else {
          this.open();
        }
      },

      addLayer: function (layer) {
        // Grab a local reference to layerConfig so it gets included in the onClick handler closure.
        var layerConfig = this.layerConfig;

        var checkBoxWidget = new CheckBox({
          checked: layer.enabled,
          onClick: function () {
            layerConfig.setLayerEnabled(layer.id, this.checked);
          }
        });

        var html =
          '<div class="menu_item">' +
          '  <label for="' + checkBoxWidget.id + '">' + layer.name + '</label>' +
          '</div>';

        var contentsNode = query(MENU_CONTENTS_CLASS, LAYER_SETTINGS_ID)[0];
        var containerNode = domConstruct.place(html, contentsNode);
        domConstruct.place(checkBoxWidget.domNode, containerNode, 'first');
        checkBoxWidget.startup();
      }

    });
  }
);
