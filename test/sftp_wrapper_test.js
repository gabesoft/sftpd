var should = require('should')
  , Sftp   = require('../lib/sftpd/sftp_wrapper');

function Log () { }
Log.prototype.error = console.error;
Log.prototype.info  = console.info;
Log.prototype.warn  = console.warn;
Log.prototype.debug = function(msg) { console.log('debug: ' + msg); };

describe('sftp_wrapper', function() {
    it('should create all directories in path (non root)', function(done) {
        var sftp = new Sftp('ftpuser', 'localhost', new Log());
        sftp.mkdir('a/b/c/d', function() {
            done();
        });
    });

    //it('should create all directories in path (root)', function(done) {
        //var sftp = new Sftp('ftpuser', 'localhost', new Log());
        //sftp.mkdir('/a/b/c/d', function() {
            //done();
        //});
    //});
});
