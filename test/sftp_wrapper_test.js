var should = require('should')
  , _      = require('underscore')
  , fs     = require('fs')
  , path   = require('path')
  , temp   = require('temp')
  , async  = require('async')
  , Log    = require('./log')
  , SftpW   = require('../lib/sftpd/sftp_wrapper');

describe('sftp_wrapper', function() {
    var sftp = new SftpW('ftpuser', 'localhost', new Log());

    it('should create all directories in path (non root)', function(done) {
        sftp.mkdir('a/b/c/d', function() {
            done();
        });
    });

    it('should upload multiple files', function(done) {
        var data = 'temp data';
        async.forEach(_.range(5), function(e, cb) {
            temp.open('sftp_test',  function(err, info) {
                fs.write(info.fd, data);
                fs.close(info.fd, function(err) {
                    sftp.put({
                        src: info.path
                      , dst: path.join('tmp', path.basename(info.path))
                    }, cb);
                });
            });
        }, function(err) {
            sftp.bye(function(err2) { done(err || err2); });
        });
    });
});
