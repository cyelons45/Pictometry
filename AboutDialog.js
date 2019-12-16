define(
  [
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/dom',
    'dojo/dom-class',
    'dojo/dom-geometry',
    'dojo/dom-style',
    'dojo/on',
    'dojo/query',
    'widgets/Pictometry/DebugDisplay',
    'dojo/NodeList-manipulate'
  ],

  function (declare, lang, dom, domClass, domGeometry, domStyle, on, query, debugDisplay) {
    const ABOUT_CONTAINER_ID = 'about_container';
    const ABOUT_POPUP_ID = 'about_popup';
    const CLOSE_BUTTON_ID = 'close_button';
    const VIEW_DEBUG_LINK_ID = 'view_debug_link';

    const TEST_BUILD_CONTENT_SELECTOR = '.test_build_content';
    const BUILD_TYPE_TEST = 0;
    const BUILD_TYPE_RELEASE = 1;
    const BUILD_TYPE_DEVELOPMENT = 2;

    var clazz = declare(null, {
      _containerNodeStyle: null,
      _popupNodeStyle: null,
      _closeButton: null,

      constructor: function (buildType) {
        this._containerNodeStyle = domStyle.getComputedStyle(ABOUT_CONTAINER_ID);
        this._popupNodeStyle = domStyle.getComputedStyle(ABOUT_POPUP_ID);
        on(dom.byId(CLOSE_BUTTON_ID), 'click', lang.hitch(this, function () {
          this.hide();
        }));
        this._buildType = buildType;

        on(dom.byId(VIEW_DEBUG_LINK_ID), 'click', lang.hitch(this, function () {
          debugDisplay.display();
        }));
      },

      show: function () {
        this._initializeTestBuildWarning();
        this._centerPopup();
        domClass.remove(ABOUT_CONTAINER_ID, 'hidden');
      },

      _initializeTestBuildWarning: function () {
        // If this is not a test build, remove the warning messages.
        if (this._buildType === BUILD_TYPE_RELEASE || this._buildType === BUILD_TYPE_DEVELOPMENT) {
          query(TEST_BUILD_CONTENT_SELECTOR).remove();
        }
      },

      _centerPopup: function () {
        var containerBox = domGeometry.getMarginBox(ABOUT_CONTAINER_ID, this._containerNodeStyle);
        var popupBox = domGeometry.getMarginBox(ABOUT_POPUP_ID, this._popupNodeStyle);

        popupBox.l = containerBox.w / 2 - popupBox.w / 2;
        popupBox.t = containerBox.h / 2 - popupBox.h / 2;

        domGeometry.setMarginBox(ABOUT_POPUP_ID, popupBox, this._popupNodeStyle);
      },

      hide: function () {
        domClass.add(ABOUT_CONTAINER_ID, 'hidden');
      }
    });

    clazz.BUILD_TYPE_TEST = BUILD_TYPE_TEST;
    clazz.BUILD_TYPE_RELEASE = BUILD_TYPE_RELEASE;
    clazz.BUILD_TYPE_DEVELOPMENT = BUILD_TYPE_DEVELOPMENT;

    return clazz;
  }
);
