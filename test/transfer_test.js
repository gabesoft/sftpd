var should   = require('should')
  , Transfer = require('../lib/sftpd/transfer');

function Log () { }
Log.prototype.error = console.error;
Log.prototype.info  = console.info;
Log.prototype.warn  = console.warn;
Log.prototype.debug = function(msg) { console.log('debug: ' + msg); };

describe('transfer', function() {
    var sut = new Transfer('/a/b/c', '/a/e/f/d', new Log());
    it('should generate source and destination paths for a file', function() {
        var f1 = '/a/e/f/d/f1.js'
          , f2 = '/a/e/f/d/p/f2.js';
        sut.paths(f1).should.eql({ src: f1, dst: '/a/b/c/f1.js' });
        sut.paths(f2).should.eql({ src: f2, dst: '/a/b/c/p/f2.js' });
    });

    it('should return null on invalid paths', function() {
        var f1 = '/a/e/f/f1';
        should.not.exist(sut.paths(f1));
    });
});
