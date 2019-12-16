/* jshint maxlen:false */

define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/dom',
    'dojo/dom-style',
    'dojo/dom-construct',
    'dojo/query',
    'dijit/form/RadioButton',
    'dijit/form/CheckBox',
    'widgets/Pictometry/SlidePanel',
    'dojo/i18n!widgets/Pictometry/nls/strings.js',
    'dojo/domReady!'
  ],

  function (declare, lang, dom, domStyle, domConstruct, query, RadioButton, CheckBox, SlidePanel, strings) {

    var SETTINGS_MENU_ID = 'settings_menu';
    var MENU_CONTENTS_CLASS = '.menu_contents';

    return declare(SlidePanel, {

      menuNode: null,
      contentsNode: null,
      computedStyle: null,
      widgetOptions: null,
      globalConfig: null,
      menuItems: null,

      "-chains-": {
        constructor: "manual"
      },

      constructor: function (widgetOptions, globalConfig) {
        this.menuNode = dom.byId(SETTINGS_MENU_ID);
        this.contentsNode = query(MENU_CONTENTS_CLASS, SETTINGS_MENU_ID)[0];

        this.computedStyle = domStyle.getComputedStyle(this.menuNode);
        this.inherited(arguments, [this.menuNode, SlidePanel.DockLocations.BOTTOM]);

        this.widgetOptions = widgetOptions;
        this.globalConfig = globalConfig;
        this._initializeMenu();
        this.resize();
        this.containerNode.style.visibility = 'visible';
      },

      isMenuEmpty: function () {
        return !this.menuItems || this.menuItems.length === 0;
      },

      _initializeMenu: function () {
        // Build all of the the things in the menu.
        this.menuItems = [];
        this._initializeUnitsMenuSection();
        this._initializeMapOptionsMenuSection();

        // Add them to the DOM.
        this.menuItems.forEach(function (x) {
          domConstruct.place(x, this.contentsNode);
        }, this);

        // Make sure the items in the menu can't be tabbed to while the menu is hidden.
        this._removeMenuItemsFromTabOrder();
      },

      _initializeUnitsMenuSection: function () {
        if (this.globalConfig.userSettings.selectUnits) {
          this.menuItems.push(this._createSectionHeader(strings.units));
          this.menuItems.push(this._createUnitsRadioButton('english', strings.english));
          this.menuItems.push(this._createUnitsRadioButton('metric', strings.metric));
        }
      },

      _initializeMapOptionsMenuSection: function () {
        var tempMenuItems = [];

        if (this.globalConfig.userSettings.configFootprint) {
          tempMenuItems.push(this._createCheckBox(
            'showLocation', strings.showLocation, this.widgetOptions.getShowLocation(),
            lang.hitch(this.widgetOptions, function (checked) {
              this.setShowLocation(checked);
            })
          ));
          tempMenuItems.push(this._createCheckBox(
            'showFootprint', strings.showFootprint, this.widgetOptions.getShowFootprint(),
            lang.hitch(this.widgetOptions, function (checked) {
              this.setShowFootprint(checked);
            })
          ));
        }

        if (this.globalConfig.userSettings.imageToMapSync) {
          tempMenuItems.push(this._createCheckBox(
            'autoPan', strings.autoPan, this.widgetOptions.getAutoPan(),
            lang.hitch(this.widgetOptions, function (checked) {
              this.setAutoPan(checked);
            })
          ));
        }

        if (tempMenuItems.length > 0) {
          this.menuItems.push(this._createSectionHeader(strings.mapOptions));
          this.menuItems = this.menuItems.concat(tempMenuItems);
        }
      },

      _createSectionHeader: function (text) {
        return domConstruct.toDom(
          '<div class="menu_item menu_section_header gray_gradient">' +
          '<span>' + text + '</span>' +
          '</div>');
      },

      _createUnitsRadioButton: function (units, label) {
        var buttonGroup = 'units_group';
        var selected = this._areUnitsSelected(units);
        return this._createRadioButton(buttonGroup, units, label, selected, lang.hitch(this, function () {
          this.widgetOptions.setUnits(units);
          this.emit("unitsSet", {});
        }));
      },

      _areUnitsSelected: function (units) {
        return this.widgetOptions.getUnits() === units;
      },

      _createRadioButton: function (name, id, label, checked, onClickHandler) {
        var button = new RadioButton({
          name: name,
          id: id,
          value: id,
          checked: checked,
          onClick: onClickHandler
        });

        var menuItemNode = this._createMenuItem(button);
        button.placeAt(menuItemNode);
        this._createLabel(id, label, menuItemNode);

        return menuItemNode;
      },

      _createCheckBox: function (id, label, checked, onClickHandler) {
        var checkBox = new CheckBox({
          id: id,
          name: id,
          value: id,
          checked: checked,
          onClick: function () {
            onClickHandler(this.checked);
          }
        });

        var menuItemNode = this._createMenuItem(checkBox);
        checkBox.placeAt(menuItemNode);
        this._createLabel(id, label, menuItemNode);

        return menuItemNode;
      },

      _createLabel: function (id, label, menuItemNode) {
        domConstruct.place('<label for="' + id + '">' + label + '</label>', menuItemNode);
      },

      _createMenuItem: function (menuItemContents) {
        var menuItemNode = domConstruct.toDom('<div class="menu_item"></div>');
        menuItemContents.placeAt(menuItemNode);
        return menuItemNode;
      },

      _createMenuItemDom: function (id, label) {
        domConstruct.place(
          '<div class="menu_item">' +
          '<input id="' + id + '"/>' +
          '<label for="' + id + '">' + label + '</label>' +
          '</div>',
          this.menuNode);
      },

      toggleMenuVisibility: function () {
        if (this.isOpen) {
          this.close();
        } else {
          this.open();
        }
      },

      resize: function () {
        this.inherited(arguments);
      }
    });
  }
);
