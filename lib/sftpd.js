var flatiron = require('flatiron')
  , eyes     = require('eyes')
  , winston  = require('winston')
  , colors   = require('colors')
  , fs       = require('fs')
  , path     = require('path')
  , util     = require('util')
  , commands = require('./sftpd/commands.js')
  , app      = flatiron.app;

module.exports = app;

//app.config.use('file', { 
    //file: path.join(__dirname, '../config', 'config.json') 
//});

app.use(flatiron.plugins.cli, {
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

app.commands = commands;

process.on('uncaughtException', function(err) {
    util.log('uncaught exception');
    util.error(err);
    util.error(err.stack);
});

console.log(app.plugins);

var broadway = require('broadway');
//console.log(br.plugins.log);

//app.use(br.plugins.log, { 
//console: { level: 'debug' }
//, file: { filename: 'tmplog.log', level: 'debug' }
//});

//app.init();

//app.log.loggers.default.level = 'debug';

//app.config.load(function(err, data) {
    //app.use(broadway.plugins.log, app.config.get('log'));
//});

//eyes.inspect(app.config.get('log'), 'LOG');
//eyes.inspect(app.log);

//app.start();

//app.config.set('log:hello', '123');
//app.config.save('config.tmp.json', function(err, data) {
//console.log(err, data);
//});

//app.log.loggers.default.level = 'debug';
//app.log.loggers.default.transports.console.level = 'debug';
