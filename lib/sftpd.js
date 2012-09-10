var flatiron = require('flatiron')
  , colors   = require('colors')
  , fs       = require('fs')
  , path     = require('path')
  , util     = require('util')
  , commands = require('./sftpd/commands.js')
  , sftpd    = flatiron.app;

module.exports = sftpd;

sftpd.config.file({ 
    file: path.join(__dirname, 'config', 'config.json') 
});

sftpd.use(flatiron.plugins.cli, {
    version: true
  , usage: [
        ''
      , ''
      , 'SFTP DEPLOY'.cyan
      , ''
      , ''
      , 'Usage:'.cyan.underline
      , ''
      , 'sftp command <user> <server> <remote dir> <local dir(s)>'.yellow
      , ''
      , 'Commands:'.cyan.underline
      , ''
      , 'sftp watch <user> <server> <rdir> <ldirs>'.yellow
      , '   - watch one or more directories and deploy all updated files'
      , 'sftp sync <user> <server> <rdir> <ldirs>'.yellow
      , '   - synchronize local and remote directories'
      , 'sftp upload <user> <server> <rdir> <ldirs> <date>'.yellow
      , '   - upload all files changed since the given date'
      , ''
    ]
});

sftpd.commands = commands;

process.on('uncaughtException', function(err) {
    util.log('uncaught exception');
    util.error(err);
    util.error(err.stack);
});