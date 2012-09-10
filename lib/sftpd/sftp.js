var Client = require(__dirname + '/../../node_modules/node-sftp/lib/sftp.js')
  , fs     = require('fs');

function Sftp (user, host, log) {
    if (!(this instanceof Sftp)) { return new Sftp(dirs); }
    this.client = new Client({
        username: user
      , host: host
      , privateKey: '~/.ssh/id_rsa'
      , autoconnect: false
    });
    this.log  = log;
    this.host = host;
    this.user = user;
}

module.exports = Sftp;

Sftp.prototype.put = function(paths) {
    var sftp = this.client
      , self = this
      , log  = this.log
      , file = fs.readFileSync(paths.src, 'utf8');

    sftp.connect(function(connErr) {
        log.info('connected to ' + self.host);

        // TODO: batch files and send with one connect/disconnect
        if (connErr) {
            log.error('failed to connect', connErr);
        } else {

            sftp.writeFile(paths.dst, file, null, function(putErr) {
                if (putErr) {
                    log.error('failed to write file', putErr);
                }
                sftp.disconnect(function(dscErr) {
                    if (dscErr) {
                        log.error('failed to disconnect', dscErr);
                    } else {
                        log.info('disconnected', dscErr);
                    }
                });
            });
        }
    });
};
