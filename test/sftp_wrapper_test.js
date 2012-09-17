var should = require('should')
  , Log    = require('./log')
  , Sftp   = require('../lib/sftpd/sftp_wrapper');

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
