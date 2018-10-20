var express = require("express");
var path = require("path");
var querystring = require("querystring");
var mime = require("mime-types");
var fs = require("fs");

module.exports = function(options) {
  var router = new express.Router();
  if (!options) options = {};
  var basepath = options.basepath || ".";
  if (basepath == "/") basepath = "";

  router.use(function(req, res, next) {
    req.target = querystring.unescape(req.path);
    next();
  });

  router.get("*", function(req, res) {
    var query = req.query;
    var path = basepath + req.target;

    if (!fs.existsSync(path)) {
      res.status(404).send("Not found.");
      return;
    }

    var stat = fs.statSync(path);

    if (query.stat !== undefined) {
      res.json(stat);
      return;
    }

    if (stat.isDirectory()) {
      res.json(fs.readdirSync(path));
      return;
    }

    if (stat.isFile() && query.follow) {
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

    if (stat.isFile()) {
      var contentType = mime.lookup(path) || "application/octet-stream";
      res.header("Content-Type", contentType);

      var s = fs.createReadStream(path);
      s.on("error", function(error) {
        console.log("Caught", error);
      });
      s.pipe(res);
      return;
    }

    res.status(500).json("Not implemented.");
  });

  router.post("*", function(req, res) {
    var query = req.query;
    var path = basepath + req.target;
    var flags = query.flags || "w";
    var mode = query.mode;

    if (path.charAt(path.length - 1) == "/") {
      path = path.substr(0, path.length - 1);
      fs.mkdirSync(path, mode);
      res.status(201).json(fs.statSync(path));
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
    var path = basepath + req.target;

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
    var path = basepath + req.target;
    var now = new Date();
    fs.utimes(basepath + path, now, now, fn);
    res.json(fs.statSync(path));
  });

  router.delete("*", function(req, res) {
    var path = basepath + req.target;
    fs.unlinkSync(path);
    res.send("Deleted.");
  });

  return router;
};
