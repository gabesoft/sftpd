var Client  = require('./sftp')
  , fs      = require('fs')
  , path    = require('path')
  , sprintf = require('underscore.string').sprintf
  , colors  = require('colors');

function Sftp (user, host, log) {
	if (!(this instanceof Sftp)) { return new Sftp(dirs); }
	this.client = new Client({
		username: user
	  , host: host
	  , autoconnect: false
	  , log: log
	});
	this.log  = log;
	this.host = host;
	this.user = user;
}

module.exports = Sftp;

Sftp.prototype.put = function(paths) {
	var sftp      = this.client
	  , self      = this
	  , log       = this.log
	  , remoteDir = path.dirname(paths.dst)
	  , file      = fs.readFileSync(paths.src, 'utf8');

	sftp.connect(function(connErr) {
		log.info(sprintf('connected to %s as %s', self.host, self.user));

		if (connErr) {
			log.error('failed to connect');
			log.error(connErr);
		} else {
			// TODO: create remote directories if they don't exist
			//       directories need to be created recursively

			sftp.writeFile(paths.dst, file, null, function(putErr) {
				if (putErr) {
					log.error('failed to write file');
					log.error(putErr);
					return;
				}

				// add date to log
				//log.info(paths.src.grey + ' -> '.blue + paths.dst);
				log.info('file uploaded on ' + (new Date() + '').yellow);
				log.info(' ⤹  '.red + paths.src.grey);
				log.info(' ⤷  '.red + paths.dst.grey);
				sftp.disconnect(function(dscErr) {
					if (dscErr) {
						log.error('failed to disconnect');
						log.error(dscErr);
					} else {
						log.info(sprintf('disconnected from %s', self.host));
					}
				});
			});
		}
	});
};
