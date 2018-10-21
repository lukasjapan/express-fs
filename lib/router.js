var express = require("express");
var p = require("path");
var querystring = require("querystring");
var mime = require("mime-types");
var fs = require("fs");

module.exports = function(options) {
  var router = new express.Router();
  if (!options) options = {};
  var basepath = p.resolve(options.basepath || ".");
  if (basepath == "/") basepath = "";

  // convert to sane output format
  var makeStat = function(rawStats) {
    return {
      isBlockDevice: rawStats.isBlockDevice(),
      isCharacterDevice: null,
      isDirectory: rawStats.isDirectory(),
      isFIFO: rawStats.isFIFO(),
      isFile: rawStats.isFile(),
      isSocket: rawStats.isSocket(),
      isSymbolicLink: rawStats.isSymbolicLink(),
      uid: rawStats.uid,
      gid: rawStats.gid,
      size: rawStats.size,
      blksize: rawStats.blksize,
      blocks: rawStats.blocks,
      atime: rawStats.atime,
      mtime: rawStats.mtime,
      ctime: rawStats.ctime,
      birthtime: rawStats.birthtime
    };
  };

  router.use(function(req, res, next) {
    req.target = querystring.unescape(req.path);
    var path = p.resolve(basepath + req.target);
    if (path.substr(0, basepath.length) != basepath) {
      res.status(403).send("Forbidden");
    } else {
      next();
    }
  });

  router.get("*", function(req, res) {
    var query = req.query;
    var path = p.resolve(basepath + req.target);

    if (!fs.existsSync(path)) {
      res.status(404).send("Not found.");
      return;
    }

    var stat = makeStat(fs.statSync(path));

    if (query.stat !== undefined) {
      res.json(stat);
      return;
    }

    if (stat.isDirectory) {
      var result = {};
      fs.readdirSync(path).forEach(function(file) {
        var filePath = path.replace(/\/$/, "") + "/" + file;
        var rawStats = fs.statSync(filePath);
        result[file] = makeStat(rawStats);
      });
      res.json(result);
      return;
    }

    if (stat.isFile && query.follow) {
      // if (options.follow !== undefined) {
      //   res.writeHead(200, {
      //     "Content-Type": "text/event-stream",
      //     "Cache-Control": "no-cache",
      //     Connection: "keep-alive"
      //   });
      //   res.write(data, "\n");
      //   fn = backend.follow(req.target, options, res);
      //   res.socket.on("close", fn);
      // }
      // return;
      // follow: function(path, options, res) {
      //   path = basepath + path;
      //   var tail = new Tail(path);
      //   tail.on("line", function(data) {
      //     res.write(data + "\n");
      //   });
      //   return tail.unwatch;
      // },
    }

    if (stat.isFile) {
      var contentType = mime.lookup(path) || "application/octet-stream";
      res.header("Content-Type", contentType);

      var s = fs.createReadStream(path);
      s.on("error", function(error) {
        console.log("Caught", error);
        throw error;
      });
      s.pipe(res);
      return;
    }

    res.status(500).json("Not implemented.");
  });

  router.post("*", function(req, res) {
    var query = req.query;
    var path = p.resolve(basepath + req.target);
    var flags = query.flags || "w";
    var mode = query.mode;

    if (req.target.endsWith("/")) {
      fs.mkdirSync(path, mode);
      var stat = makeStat(fs.statSync(path));
      res.status(201).json(stat);
      return;
    }

    var s = fs.createWriteStream(path, { flags: flags, mode: mode });

    req
      .pipe(s)
      .on("error", function(e) {
        res.status(401).json(e);
      })
      .on("close", function() {
        res.status(201).json(fs.statSync(path));
      });
  });

  router.put("*", function(req, res) {
    var path = p.resolve(basepath + req.target);

    var s = fs.createWriteStream(path, { flags: "a" });

    req
      .pipe(s)
      .on("error", function(e) {
        res.status(401).json(e);
      })
      .on("close", function() {
        res.status(200).json(fs.statSync(path));
      });
  });

  router.patch("*", function(req, res) {
    var path = p.resolve(basepath + req.target);
    var now = new Date();
    fs.utimes(basepath + path, now, now, fn);
    res.json(fs.statSync(path));
  });

  router.delete("*", function(req, res) {
    var path = p.resolve(basepath + req.target);
    fs.unlinkSync(path);
    res.send("Deleted.");
  });

  return router;
};
