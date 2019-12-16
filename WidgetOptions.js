define(
  [
    'dojo/_base/declare',
    'widgets/Pictometry/LocalStorage'
  ],

  function (declare, LocalStorage) {
    var OPTIONS_STORE_NAME = 'Options';

    return declare(null, {
      constructor: function (defaultSettings) {
        this.localStorage = new LocalStorage(OPTIONS_STORE_NAME, defaultSettings);
      },

      getUnits: function () {
        return this.localStorage.getProperty('units');
      },

      setUnits: function (units) {
        this.localStorage.setProperty('units', units);
      },

      getShowFootprint: function () {
        return this.localStorage.getProperty('showFootprint');
      },

      setShowFootprint: function (showFootprint) {
        this.localStorage.setProperty('showFootprint', showFootprint);
      },

      getShowLocation: function () {
        return this.localStorage.getProperty('showLocation');
      },

      setShowLocation: function (showLocation) {
        this.localStorage.setProperty('showLocation', showLocation);
      },

      getAutoPan: function () {
        return this.localStorage.getProperty('autoPan');
      },

      setAutoPan: function (autoPan) {
        this.localStorage.setProperty('autoPan', autoPan);
      }
    });
  }
);
