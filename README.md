## ExpressRestFs

Mount your filesystem on a url within an express application.

## Features

- Paths are translated directly into URLs
- Browsers can open documents correctly (Content-type header)

## Usage

`./bin/expose [path] [port]` will serve path (~ by default) at port (8000 by default).

As _expressRestFs_ has been built as an express middleware, you can use it in your existing express application.

```javascript
var express = require("express");
var app = express();

var expressRestFs = require("express-rest-fs");

app.use("/fs", expressRestFs({ basepath: "/home/" }));

/* your routing definition */

app.listen(8000);
```

The code above will serve your `home` directory under `/fs` url.

## Exposed API

| action                     | verb     | operation | note                           |
| -------------------------- | -------- | --------- | ------------------------------ |
| List Directory             | `GET`    | readdir   |
| Retrieve file              | `GET`    | read      |
| Stat file                  | `GET`    | stat      | must use `?stat`               |
| Create File                | `POST`   | write     |
| Create Directory           | `POST`   | mkdir     | file name must finish with `/` |
| Append to File             | `PUT`    | write     |
| Update file timestamps     | `PATCH`  | utimes    |
| Remove a file or directory | `DELETE` | unlink    |

## TODO:

- Read-only mode (Maybe Permissions in general)
- Testing
- Rethink status codes/responses
- Caching headers
- Resume
- ...
