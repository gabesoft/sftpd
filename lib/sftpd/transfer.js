/*
 * Object used to create source and destination paths 
 * for a file.
 */

var path = require('path');

function Transfer (remote, local, log) {
    if (!(this instanceof Transfer)) { return new Transfer(dirs); }
    this.remote = remote;
    this.local  = local;
    this.log    = log;
}

module.exports = Transfer;

Transfer.prototype.paths = function(file) {
    if (file && file.indexOf(this.local) === 0) {
        return {
            src: file
          , dst: path.join(this.remote, file.replace(this.local, ''))
        };
    } else {
        this.log.error('invalid path ' + file);
        return null;
    }
};
