// isFunction checks to see if the object that was passed in is a function object.  It was taken 
// from http://jsperf.com/alternative-isfunction-implementations/4.
var isFunction = function (object) {
  var getClass = {}.toString;
  return object && getClass.call(object) === '[object Function]';
};

define(function () {
  return isFunction;
});
