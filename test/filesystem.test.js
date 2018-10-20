var mocha = require("mocha"),
  assert = require("assert");

var request = require("supertest"),
  __fs = require("fs");
Fs = require("fake-fs");

var express = require("express"),
  app = express(),
  exposefs = require("../index");
app.use("/", exposefs({ backend: "filesystem", basepath: "/" }));

var fs = null;
describe("Filesystem", function() {
  beforeEach(function() {
    fs = new Fs();
    fs.patch();
  });

  afterEach(function() {
    fs.unpatch();
  });

  describe("GET", function() {
    context("/directory", function() {
      it("returns the content of directory", function(done) {
        var content = ["foo", "bar"];
        content.forEach(function(f) {
          fs.dir("/" + f);
        });

        request(app)
          .get("/")
          .expect(200, JSON.stringify(content), done);
      });
    });

    context("/file", function() {
      beforeEach(function() {
        this.content = "content of file";
        fs.file("/file", this.content);
        this.imageContent = Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          "base64"
        ).toString("ascii");
        fs.file("/image.png", this.imageContent);
        this.statContent = JSON.stringify(fs.statSync("/file"));
      });

      it("returns the content of file", function(done) {
        request(app)
          .get("/file")
          .expect("Content-Type", /application\/octet-stream/)
          .expect(200, this.content, done);
      });

      it("returns the content of image file", function(done) {
        request(app)
          .get("/image.png")
          .expect("Content-Type", /image\/png/)
          .expect(200, this.imageContent, done);
      });

      context("?stat", function() {
        it("returns the stat of a file", function(done) {
          request(app)
            .get("/file?stat")
            .expect("Content-Type", /application\/json/)
            .expect(200, this.statContent, done);
        });
      });
    });
  });

  describe("POST", function() {
    context("/directory/", function() {
      it("creates a directory", function(done) {
        request(app)
          .post("/directory/")
          .expect(201)
          .end(function() {
            assert(fs.statSync("/directory").isDirectory());
            done();
          });
      });
    });

    context("/file", function(done) {
      beforeEach(function() {
        fs.unpatch();
      });

      it("creates a file", function(done) {
        var file = "/tmp/.exposefs_tmp_file";
        var data = "deleteme";

        request(app)
          .post(file)
          .send(data)
          .expect(201, function() {
            assert.equal(__fs.readFileSync(file), data);
            __fs.unlinkSync(file);
            done();
          });
      });
    });
  });

  describe("PUT", function() {
    beforeEach(function() {
      fs.unpatch();
    });

    it("appends data to a file", function(done) {
      var file = "/tmp/.exposefs_tmp_file";
      __fs.writeFileSync(file, "foo");

      request(app)
        .put(file)
        .send("bar")
        .expect(200, function() {
          assert.equal("foobar", __fs.readFileSync(file).toString());
          __fs.unlinkSync(file);
          done();
        });
    });
  });

  describe("DELETE", function() {
    it("removes file", function(done) {
      fs.file("/file");
      request(app)
        .delete("/file")
        .expect(200, function() {
          assert.equal(fs.existsSync("/file"), false);
          done();
        });
    });
  });
});
