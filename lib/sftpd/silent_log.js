
function SilentLog () {
    if (!(this instanceof SilentLog)) { return new SilentLog(dirs); }
}

module.exports = SilentLog;

SilentLog.prototype.error = function() { };
SilentLog.prototype.info  = function() { };
SilentLog.prototype.warn  = function() { };
SilentLog.prototype.debug = function() { };
