/*
 * File system watch for changes.
 */

var EventEmitter = require('eventemitter2').EventEmitter2
  , fs           = require('fs')
  , _            = require('underscore')
  , sprintf      = require('underscore.string').sprintf
  , is           = require('is').is
  , util         = require('util')
  , exec         = require('child_process').exec
  , path         = require('path');

function FsWatch (opts) {
    if (!(this instanceof FsWatch)) { return new FsWatch(dirs); }

    var self = this;

    this.dirs          = opts.dirs;
    this.legacy        = opts.legacy;
    this.includeHidden = opts.includeHidden;
    this.log           = opts.log;
    this.isWindows     = process.platform === 'win32';
    this.noWatch       = (process.platform !== 'win32') || !fs.watch;
    this.watchFile     = (process.platform === 'darwin') ? fs.watchFile : fs.watch;
    this.watchWorks    = true;
    this.delay         = opts.delay || 0;
    this.change        = this.changeFunction();
    this.watched       = [];
    this.lastDate      = +(opts.lastDate || new Date());
    this.timeout       = 1000; // 1 second
    this.restartTimer  = null;

    this.ignored = (opts.ignored || []).map(function(x) {
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

    if (_.isString(this.dirs) && this.dirs.indexOf(',') !== -1) {
        this.dirs = this.dirs.split(',');
    }
    if (_.isString(this.dirs)) {
        this.dirs = [this.dirs];
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

FsWatch.prototype.startWatch = function() {
    this.watched = [];
    this.start();
};

FsWatch.prototype.start = function() {
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
                    self.setTimeout(self.start, self.timeout);
                }, self.delay);
                return;
            }
            if (self.noWatch) {
                self.setTimeout(self.start, self.timeout);
            }
        });
    } else {
        self.changedSince(self.lastDate, function(files) {
            files = files.filter(self.ignore);
            if (files.length) {
                // how many of these nested setTimeout are necessary?
                self.setTimeout(function() {
                    files.forEach(function(file) {
                        self.emit('change', file);
                    });
                    self.lastDate = +new Date();
                    self.setTimeout(self.start, self.timeout);
                }, self.delay);
            } else {
                self.setTimeout(self.start, self.timeout);
            }
        });

    }
};

FsWatch.prototype.stop = function() {
    // stop watch
};

FsWatch.prototype.changeFunction = function() {
    var self = this;

    if (this.noWatch) {
        return function(last, cb) {
            //self.log.warn('change A');
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
            //self.log.warn('change B'); 
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
