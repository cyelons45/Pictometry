define(
  [
    'dojo/_base/declare',
    'libs/storejs/store',
    'widgets/Pictometry/DebugDisplay'
  ],

  function (declare, store, debugDisplay) {
    var PICTOMETRY_STORE_NAME_ROOT = 'Pictometry.Widget';

    return declare(null, {
      constructor: function (storeName, defaultSettings) {
        this.storeName = PICTOMETRY_STORE_NAME_ROOT + '.' + storeName;
        this.localSettings = (defaultSettings !== undefined ? defaultSettings : {});
        this._loadLocalSettings();

        debugDisplay.addParticipant(this, 'LocalStorage');
      },

      _loadLocalSettings: function () {
        var temp = store.get(this.storeName);
        if (temp !== undefined) {
          this.localSettings = temp;
        }
      },

      getProperty: function (propertyName) {
        return this.localSettings[propertyName];
      },

      setProperty: function (propertyName, value) {
        this.localSettings[propertyName] = value;
        store.set(this.storeName, this.localSettings);
      },

      getDebugInfo: function () {
        return {
          storeName: this.storeName,
          localSettings: this.localSettings
        }
      }

    });
  }
);

