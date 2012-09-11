var commands = module.exports
  , eyes     = require('eyes')
  , _        = require('underscore')
  , FsWatch  = require('./fs_watch')
  , Transfer = require('./transfer')
  , Sftp     = require('./sftp');

commands.watch = function(user, server, rdir, ldirs, callback) {
    console.log('watch', server, rdir, ldirs);
    this.log.info('watching ' + ldirs);

    // todo: deal with logs (should not be passed through)
    var sftp  = new Sftp(user, server, this.log)
      , self  = this
      , trans = new Transfer(rdir, process.cwd(), this.log)
      , watch = new FsWatch({
            dirs: ldirs
          , legacy: false
          , includeHidden: true
          , log: this.log
          , ignored: [ /\.git\// ]
        });

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

commands.sync = function(user, server, rdir, ldirs, callback) {
    console.log('syncing');
};

commands.upload = function(user, server, rdir, ldirs, date, callback) {
    console.log('upload', arguments);
};
