
function Log () { }
Log.prototype.error = console.error;
Log.prototype.info  = console.info;
Log.prototype.warn  = console.warn;
Log.prototype.debug = function(msg) { console.log('debug: ' + msg); };

module.exports = Log;
