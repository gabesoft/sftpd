var Client  = require('./sftp')
  , fs      = require('fs')
  , path    = require('path')
  , async   = require('async')
  , sprintf = require('underscore.string').sprintf
  , colors  = require('colors')

  , prepareDirs = function(dir) {
        var root = new RegExp('^' + path.sep).test(dir);
        var dirs = dir
               .split(path.sep)
               .filter(Boolean)
               .reduce(function(acc, d) {
                    acc.push(path.join(acc[acc.length - 1], d));
                    return acc;
                }, [ root ? path.sep : '' ]);

        dirs.shift(0);

        return dirs;
    };

function SftpWrapper (user, host, log) {
    if (!(this instanceof SftpWrapper)) { return new SftpWrapper(dirs); }
    var self = this;

    this.client = new Client({
        username: user
      , host: host
      , autoconnect: false
      , log: log
    });
    this.log  = log;
    this.host = host;
    this.user = user;

    this.client.on('connect', function() {
        self.log.info(sprintf('connected to %s as %s', self.host, self.user));
    });
    this.client.on('disconnect', function() {
        self.log.info(sprintf('disconnected from %s', self.host));
    });
}

module.exports = SftpWrapper;

SftpWrapper.prototype.connect = function(cb) {
    var sftp = this.client
      , log  = this.log
      , self = this;

    sftp.connect(function(err) {
        if (err) {
            log.error('failed to connect');
            log.error(err);
        } else {
            cb(err);
        }
    });

};

SftpWrapper.prototype.put = function(paths, cb) {
    var sftp      = this.client
      , self      = this
      , log       = this.log
      , remoteDir = path.dirname(paths.dst)
      , file      = fs.readFileSync(paths.src, 'utf8')
      , logerr    = function(err) {
            log.error('failed to write file');
            log.error(err);
        }
      , loginfo = function() {
            log.info('file uploaded on ' + (new Date() + '').yellow);
            log.info(' ⤹  '.red + paths.src.grey);
            log.info(' ⤷  '.red + paths.dst.grey);
        };

    cb = cb || function() {};

    this.connect(function() {
        sftp.writeFile(paths.dst, file, null, function(err) {
            if (err) {
                logerr(err);
                self.mkdir(path.dirname(paths.dst), function() {
                    sftp.writeFile(paths.dst, file, null, function(err) {
                        if (err) { 
                            logerr(err);
                        } else { 
                            loginfo();
                        }
                        sftp.disconnect(cb);
                    });
                });
            } else {
                loginfo();
                sftp.disconnect(cb);
            }
        });
    });
};

SftpWrapper.prototype.mkdir = function(dir, cb) {
    var sftp = this.client
      , self = this
      , log  = this.log
      , dirs = prepareDirs(dir)
      , fns = dirs.map(function(d) {
            return function(cb) {
                sftp.mkdir(d, null, cb);
            };
        });

    this.connect(function() {
        async.series(fns, function(err) {
            if (err) {
                log.error('failed to create directory ' + dir);
                log.error(err);
            } else {
                log.info('directory created on ' + (new Date() + '').yellow);
                log.info('    ' + dir.grey);
            }
            cb(err);
        });
    });
};
