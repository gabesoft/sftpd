var commands = module.exports
  , eyes     = require('eyes')
  , _        = require('underscore')
  , fs       = require('fs')
  , async    = require('async')
  , path     = require('path')
  , FsWatch  = require('./fs_watch')
  , Transfer = require('./transfer')
  , Sftp     = require('./sftp_wrapper');

commands.watch = function(user, server, rdir, ldirs, callback) {
    var sftp  = new Sftp(user, server, this.log)
      , self  = this
      , trans = new Transfer(rdir, process.cwd(), this.log)
      , watch = new FsWatch({
            dirs: ldirs.split(',')
          , legacy: false
          , includeHidden: true
          , log: this.log
          , ignored: [ /\.git\// ]
        });

    self.log.info('watching         ' + ldirs.cyan);

    watch.on('change', function(file) {
        self.log.info('change detected ' + file);
        sftp.put(trans.paths(file));
    });
    watch.on('rename', function(file) {
        self.log.info('rename detected ' + file);
    });
    watch.on('add', function(file) {
        self.log.info('add detected ' + file);
    });
    watch.on('delete', function(file) {
        self.log.info('delete detected ' + file);
    });
    watch.startWatch(function(success) {
        if (!success) { process.exit(1); }
    });
};

function sync (app, sftp, trans, dir, callback) {
    fs.stat(dir, function(err, stats) {
        if (err) { return callback(err); }

        if (stats.isFile()) {
            syncFile(app, sftp, trans, path.resolve(dir), callback);
        } else {
            syncDirectory(app, sftp, trans, path.resolve(dir), callback);
        }
    });
}

function syncFile (app, sftp, trans, file, callback) {
    sftp.put(trans.paths(file), callback);
}

function syncDirectory (app, sftp, trans, dir, callback) {
    app.log.info('reading directory ' + dir.grey);

    fs.readdir(dir, function(err, list) {
        if (err) { return app.log.error(err); }

        var pending = list.length;

        list.forEach(function(file) {
            file = path.resolve(path.join(dir, file));
            fs.stat(file, function(err, stats) {
                if (stats && stats.isDirectory()) {
                    sync(app, sftp, trans, file, function(err) {
                        pending = pending - 1;
                        if (pending <= 0) { callback(err); }
                    });
                } else {
                    syncFile(app, sftp, trans, file, function(err) {
                        pending = pending - 1;
                        if (pending <= 0) { callback(err); }
                    });
                }
            });
        });
    });
}

// todo: allow --basedir <dir> --skip <regex>
commands.sync = function(user, server, rdir, ldirs, callback) {
    var sftp  = new Sftp(user, server, this.log)
      , trans = new Transfer(rdir, process.cwd(), this.log)
      , self  = this;

    sftp.connect(function() {
        ldirs = ldirs.split(',').map(path.resolve);
        async.forEach(ldirs, function(dir, cb) {
            sync(self, sftp, trans, dir, cb);
        }, function(err) {
            sftp.disconnect(callback || function() {});
        });
    });
};

commands.upload = function(user, server, rdir, ldirs, date, callback) {
    console.log('upload', arguments);
};
