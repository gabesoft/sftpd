/**
 * @package node-sftp
 * @copyright  Copyright(c) 2011 Ajax.org B.V. <info AT ajax.org>
 * @author Fabian Jakobs <fabian AT ajax DOT org>
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/ajaxorg/node-sftp/blob/master/LICENSE MIT License
 */

var child_process = require("child_process");
var fs = require("fs");
var uuid = function(len, radix) {
        var i,
            chars = exports.uuid.CHARS,
            uuid = [],
            rnd = Math.random;
        radix = radix || chars.length;

        if (len) {
            // Compact form
            for (i = 0; i < len; i++)
                uuid[i] = chars[0 | rnd() * radix];
        }
        else {
            // rfc4122, version 4 form
            var r;
            // rfc4122 requires these characters
            uuid[8] = uuid[13] = uuid[18] = uuid[23] = "-";
            uuid[14] = "4";

            // Fill in random data. At i==19 set the high bits of clock sequence as
            // per rfc4122, sec. 4.1.5
            for (i = 0; i < 36; i++) {
                if (!uuid[i]) {
                    r = 0 | rnd() * 16;
                    uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r & 0xf];
                }
            }
        }

        return uuid.join("");
    };

var DEFAULT_TMPDIR = (function() {
        var value,
            def = "/tmp",
            envVars = ["TMPDIR", "TMP", "TEMP"],
            i = 0,
            l = envVars.length;
        for(; i < l; ++i) {
            value = process.env[envVars[i]];
            if (value)
                return fs.realpathSync(value).replace(/\/+$/, "");
        }
        return fs.realpathSync(def).replace(/\/+$/, "");
    })();

exports.buildArgs = function(prvkeyFile, host) {
    var args = [
            "-o", "PasswordAuthentication=no",
            "-o", "IdentityFile=" + prvkeyFile,
            "-o", "UserKnownHostsFile=/dev/null",
            "-o", "StrictHostKeyChecking=no",
            // force pseudo terminal to make sure that the remote process is killed
            // when the local ssh process is killed
            "-t", "-t",
            //"-o", "IdentitiesOnly=yes", // this breaks some ssh servers
            "-o", "BatchMode=yes"
        ];
    if (host)
        args.push(host);
    return args;
};

exports.spawnWithKeyFile = function(prvkeyFile, host, command, args) {
    var sshArgs = exports.buildArgs(prvkeyFile, host);

    var args = sshArgs.concat(command ? [command] : []).concat(args || []);
    console.log("executing: ssh " + args.join(" "));

    return child_process.spawn("ssh", args);
};

exports.writeKeyFile = function(prvkey, callback) {
    var filename = DEFAULT_TMPDIR + "/" + uuid();
    fs.writeFile(filename, prvkey, function(err) {
        if (err)
            return callback(err);

        fs.chmod(filename, 0600, function(err) {
            callback(err, filename);
        });
    });
};

exports.writeKeyFiles = function(prvkey, pubkey, callback) {
    var filename = DEFAULT_TMPDIR + "/" + uuid();
    fs.writeFile(filename, prvkey, function(err) {
        if (err)
            return callback(err);

        fs.chmod(filename, 0600, function(err) {
            fs.writeFile(filename + ".pub", pubkey, function(err) {
                if (err)
                    return callback(err);

                fs.chmod(filename + ".pub", 0600, function(err) {
                    callback(err, filename);
                });
            });
        });
    });
};

exports.spawn = function(prvkey, host, command, args, callback) {
    exports.writeKeyFile(prvkey, function(err, filename) {
        var child = exports.spawnWithKeyFile(filename, host, command, args);

        child.on("exit", function(code) {
            fs.unlink(filename, function() {});
        });

        callback(null, child);
    });
};

exports.exec = function(prvkey, host, command, args, callback) {
    exports.spawn(prvkey, host, command, args, function(err, child) {
        if (err)
            return callback(err);

        var out = err = "";

        child.stdout.on("data", function (data) {
            out += data;
        });

        child.stderr.on("data", function (data) {
            err += data;
        });

        child.on("exit", function(code) {
            callback(code, out, err);
        });
    });
};

exports.generateKeyPair = function(email, callback) {
    var filename = DEFAULT_TMPDIR + "/" + uuid();
    var phrase = "";

    var command = "ssh-keygen -t rsa " +
            "-f \"" + filename + "\" " +
            "-P \"" + phrase   + "\" " +
            "-C \"" + email  + "\" ";

    child_process.exec(command, function (err, stdout, stderr) {
        if (err)
            return callback(err);

        fs.readFile(filename + ".pub", function (err, pubkey) {
            if (err)
                return callback(err);

            fs.readFile(filename, function (err, prvkey) {
                if (err)
                    return callback(error);

                fs.unlink(filename + ".pub", function() {
                    fs.unlink(filename, function() {
                        callback(null, pubkey.toString(), prvkey.toString());
                    });
                });

            });
        });
    });
};

exports.validateSSHKey = function(prvkey, host, callback) {
    exports.exec(prvkey, host, "", [], function(err, stdout, stderr) {
        //console.log("out >> " + stdout)
        //console.log("err >> " + stderr)
        //console.log(err)
        callback(null, !stderr.match(/Permission denied \(.*publickey/));
    });
};
