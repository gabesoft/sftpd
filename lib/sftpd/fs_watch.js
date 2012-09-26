/*
 * File system watcher.
 * Pretty much an encapsulation of the watch functionality 
 * from nodemon (https://github.com/remy/nodemon)
 */

var EventEmitter = require('eventemitter2').EventEmitter2
  , SilentLog    = require('./silent_log')
  , fs           = require('fs')
  , _            = require('underscore')
  , sprintf      = require('underscore.string').sprintf
  , is           = require('is').is
  , util         = require('util')
  , exec         = require('child_process').exec
  , path         = require('path')
  , isDarwin     = process.platform === 'darwin'
  , isWindows    = process.platform === 'win32';

function Checker (log) { 
    if (!(this instanceof Checker)) { return new Checker(log); }
    this.log = log || new SilentLog();
}

Checker.prototype.check = function(cb) {
    var tmpDir = isWindows ? process.env.TEMP : process.env.TMPDIR || '/tmp'
      , name   = path.join(tmpDir, 'fs_watch_check')
      , file   = fs.openSync(name, 'w')
      , self   = this;

    this.cb      = cb;
    this.changed = false;

    if (!file) {
        self.log.error('Unable to write to the temp directory. Ensure the temp directory is writable.');
        cb(true);
        return;
    }

    fs.watch(file, function(ev, name) {
        if (self.changed) { return; }
        self.changed = true;
        cb(true);
    });

    fs.writeSync(file, '1');
    fs.unlinkSync(name);

    setTimeout(function() { self.verify(); }, 250);
};

Checker.prototype.verify = function() {
    if (!this.changed) {
        this.cb(false);
    }
};

function FsWatch (opts) {
    if (!(this instanceof FsWatch)) { return new FsWatch(opts); }

    var self = this;

    this.dirs          = opts.dirs;
    this.legacy        = opts.legacy;
    this.includeHidden = opts.includeHidden;
    this.log           = opts.log || new SilentLog();
    this.noWatch       = !isWindows || !fs.watch;
    this.watchFile     = isDarwin ? fs.watchFile : fs.watch;
    this.watchWorks    = true;
    this.delay         = opts.delay || 0;
    this.watched       = [];
    this.lastDate      = +(opts.lastDate || new Date());
    this.timeout       = 1000; // 1 second
    this.restartTimer  = null;
    this.change        = null;
    this.ignored       = (opts.ignored || []).map(function(x) {
        return is.regexp(x) ? x : new RegExp(x);
    });

    this.ignore = function(file) { 
        var i   = 0
          , len = self.ignored.length;
        for (i = 0; i < len; i++) {
            if (self.ignored[i].test(file)) {
                return false;
            }
        }
        return true;
    };

    if (_.isString(this.dirs)) {
        this.dirs = this.dirs.split(',');
    }
    this.dirs = this.dirs.map(function(dir) {
        return path.resolve(dir);
    });
}

module.exports = FsWatch;

util.inherits(FsWatch, EventEmitter);

FsWatch.prototype.clearTimeout = function() {
    if (this.restartTimer) {
        clearTimeout(this.restartTimer);
    }
};

FsWatch.prototype.setTimeout = function(fn, timeout) {
    this.clearTimeout();
    this.restartTimer = setTimeout(_.bind(fn, this), timeout);
};

FsWatch.prototype.startWatch = function(cb) {
    var self = this
      , ch   = new Checker(self.log);

    this.watched = [];

    if (this.noWatch) {
        exec('find -L /dev/null -type f -mtime -1s -print', function(err, stdout, stderr) {
            if (err) {
                if (!fs.watch) {
                    self.log.error('File watching is not supported.');
                    cb(false);
                } else {
                    self.noWatch = false;
                    ch.check(function(success) {
                        self.watchWorks = success;
                        self.change = self.changeFunction();
                        self._start();
                        cb(true);
                    });
                }
            } else {
                self.change = self.changeFunction();
                self._start();
                cb(true);
            }
        });
    } else {
        ch.check(function(success) {
            self.watchWorks = success;
            self.change = self.changeFunction();
            self._start();
            cb(true);
        });
    }
};

FsWatch.prototype._start = function() {
    var self = this;

    if ((self.noWatch || self.watchWorks) && !self.legacy) {
        self.change(self.lastDate, function(files) {
            files = files.filter(self.ignore);
            if (files.length > 0) {
                self.setTimeout(function() {
                    files.forEach(function(file) {
                        self.emit('change', file);
                    });
                    self.lastDate = +new Date();
                    self.setTimeout(self._start, self.timeout);
                }, self.delay);
            } else if (self.noWatch) {
                self.setTimeout(self._start, self.timeout);
            }
        });
    } else {
        self.changedSince(self.lastDate, function(files) {
            files = files.filter(self.ignore);
            if (files.length) {
                self.setTimeout(function() {
                    files.forEach(function(file) {
                        self.emit('change', file);
                    });
                    self.lastDate = +new Date();
                    self.setTimeout(self._start, self.timeout);
                }, self.delay);
            } else {
                self.setTimeout(self._start, self.timeout);
            }
        });
    }
};

FsWatch.prototype.stopWatch = function() {
    // TODO: implement
};

FsWatch.prototype.changeFunction = function() {
    var self = this;

    if (this.noWatch) {
        return function(last, cb) {
            var commands = []
              , changed  = [];
            self.dirs.forEach(function(dir) {
                var cmd = sprintf('find -L "%s" -type f -mtime -%ss -print'
                    , dir
                    , ((+new Date() - last)/1000|0));
                commands.push(cmd);
            });

            exec(commands.join(';'), function(err, stdout, stderr) {
                var files = stdout.split(/\n/);
                files.pop();
                cb(files.map(path.normalize));
            });
        };
    } else if (watchWorks) {
        return function(last, cb) {
            var watch = function(err, dir) {
                    try {
                        fs.watch(dir, { persistent: false }, function(ev, fileName) {
                            var filePath = path.join(dir, fileName);
                            cb([filePath]);
                        });

                        fs.readdir(dir, function(err, files) {
                            if (err) { return; }
                            files
                               .map(function(file) { return path.join(dir, file); })
                               .filter(self.ignored)
                               .forEach(function(file) {
                                    if (self.watched.indexOf(file) === -1) {
                                        self.watched.push(file);
                                        fs.stat(file, function(err, stat) {
                                            if (!err && stat) {
                                                if (stat.isDirectory()) {
                                                    fs.realpath(file, watch);
                                                }
                                            }
                                        });
                                    }
                                });
                        });
                    } catch (e) {
                        if (e.code === 'EMFILE') {
                            self.log.error('EMFILE: Watching too many files.');
                        }
                    }
                };

            self.dirs.forEach(function(dir) {
                fs.realpath(dir, watch);
            });
        };
    } else {
        return function() {
            self.log.error('malfunction');
        };
    }
};

FsWatch.prototype.changedSince = function(time, dir, cb) {
    cb  = cb ? cb : dir;
    dir = dir && !_.isFunction(dir) ? [dir] : dirs;

    var changed = []
      , self    = this
      , log     = this.log
      , len     = dir.length
      , todo    = 0
      , done    = function() {
            todo--;
            if (todo === 0) {
                callback(changed);
            }
        };

    dir.forEach(function(d) {
        todo++;
        fs.readdir(d, function(err, files) {
            if (err) {
                log.error(err);
                return;
            }

            files.forEach(function(f) {
                if (self.includeHidden || (!self.includeHidden && f.indexOf('.') !== 0)) {
                    todo++;
                    f = path.resolve(path.join(d, f));
                    fs.stat(f, function(err, stat) {
                        if (stat) {
                            if (stat.isDirectory()) {
                                todo++;
                                self.changedSince(time, f, function(sub) {
                                    if (sub.length) {
                                        changed = changed.concat(sub);
                                    } 
                                    done();
                                });
                            } else if (stat.mtime > time) {
                                changed.push(f);
                            }
                        }
                        done();
                    });
                }
            });

            done();
        });
    });
};
