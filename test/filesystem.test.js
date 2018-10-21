var mocha = require("mocha");
var assert = require("assert");

var request = require("supertest");
var fs = require("fs");
var mockFs = require("mock-fs");

var express = require("express");
var app = express();
var expressRestFs = require("../index");

app.use("/", expressRestFs({ basepath: "" }));

describe("Filesystem", function() {
  beforeEach(function() {
    mockFs({});
  });

  afterEach(function() {
    mockFs.restore();
  });

  describe("GET", function() {
    context("/directory", function() {
      it("returns the content of directory", function(done) {
        var folders = ["bar", "foo"];
        folders.forEach(fs.mkdirSync);
        var files = ["file"];
        files.forEach(function(f) {
          fs.writeFileSync(f, "content of file");
        });

        request(app)
          .get("/")
          .expect("Content-Type", /application\/json/)
          .expect(200)
          .end(function(err, res) {
            if (err) throw err;
            assert.notStrictEqual(
              Object.keys(res.body),
              folders.concat(files).sort()
            );
            assert.ok(res.body.bar.isDirectory);
            assert.ok(!res.body.bar.isFile);
            assert.ok(res.body.file.isFile);
            assert.ok(!res.body.file.isDirectory);
            done();
          });
      });
    });

    context("No file", function() {
      it("returns a 404 error", function(done) {
        request(app)
          .get("/non-existing-file")
          .expect("Content-Type", /text\/html/)
          .expect(404, "Not found.", done);
      });
    });

    context("/file", function() {
      beforeEach(function() {
        this.content = "content of file";
        fs.writeFileSync("file", this.content);
      });

      it("returns the content of file", function(done) {
        request(app)
          .get("/file")
          .expect("Content-Type", /application\/octet-stream/)
          .expect(200, this.content, done);
      });

      context("?stat", function() {
        it("returns the stat of a file", function(done) {
          request(app)
            .get("/file?stat")
            .expect("Content-Type", /application\/json/)
            .expect(200)
            .end(function(err, res) {
              if (err) throw err;
              assert.ok(res.body.isFile);
              assert.ok(!res.body.isDirectory);
              done();
            });
        });
      });
    });

    context("/image.png", function() {
      it("returns the content of image file", function(done) {
        var content = Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          "base64"
        ).toString("ascii");
        fs.writeFileSync("image.png", content);

        request(app)
          .get("/image.png")
          .expect("Content-Type", /image\/png/)
          .expect(200, content, done);
      });
    });

    describe("POST", function() {
      context("/directory/", function() {
        it("creates a directory", function(done) {
          request(app)
            .post("/directory/")
            .expect(201)
            .end(function(err) {
              if (err) throw err;
              assert(fs.statSync("directory").isDirectory());
              done();
            });
        });
      });

      context("/file", function(done) {
        it("creates a file", function(done) {
          var content = "content of input file";

          request(app)
            .post("/file")
            .send(content)
            .expect(201)
            .end(function(err) {
              if (err) throw err;
              assert.equal(fs.readFileSync("file"), content);
              done();
            });
        });
      });
    });

    describe("PUT", function() {
      it("appends data to a file", function(done) {
        var content = "content of file";
        var append = " bar";
        fs.writeFileSync("file", content);

        request(app)
          .put("/file")
          .send(append)
          .expect(200)
          .end(function(err) {
            if (err) throw err;
            assert.equal(content + append, fs.readFileSync("file").toString());
            done();
          });
      });
    });

    describe("DELETE", function() {
      it("removes file", function(done) {
        fs.writeFileSync("file", "to be deleted");
        assert.equal(fs.existsSync("file"), true);
        request(app)
          .delete("/file")
          .expect(200)
          .end(function(err) {
            if (err) throw err;
            assert.equal(fs.existsSync("file"), false);
            done();
          });
      });
    });
  });
});
