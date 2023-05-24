const port = 3000;
const express = require("express");
const app = express();
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

var mysql = require("mysql");
var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "restapi",
});

//funktion för att autentisera en användare
function authorization(req, res) {
  let authHeader = req.headers["authorization"];
  if (authHeader == undefined) {
    res.status(418).send("auth-header is missing");
    return false;
  }
  let token = authHeader.slice(7);
  let decoded;
  try {
    decoded = jwt.verify(token, "signeradochklar");
    return decoded;
  } catch (err) {
    console.log(err);
    res.status(401).send("Invalid auth token");
    return decoded;
  }
}

var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

function hash(data) {
  const hash = crypto.createHash("sha256");
  hash.update(data);
  return hash.digest("hex");
}

app.get("/", (req, res) => {
  res.sendfile(__dirname + "/index.html");
});

//Add new User
app.post("/user", function (req, res) {
  let passwordhash = hash(req.body.password);
  var checkUsernameSql = "SELECT * FROM users WHERE username = ?";
  con.query(checkUsernameSql, [req.body.username], function (err, result) {
    if (err) {
      res.status(500).send("Internal Server Error");
      return;
    }
    if (result.length > 0) {
      res.status(409).send("Username already exists");
      return;
    }
    var insertUserSql =
      "INSERT INTO users (username, password, age) VALUES (?, ?, ?)";
    con.query(
      insertUserSql,
      [req.body.username, passwordhash, req.body.age],
      function (err, result) {
        if (err) {
          res.status(500).send("Internal Server Error");
          return;
        }
        let answer = {
          username: req.body.username,
          password: passwordhash,
          age: req.body.age,
          id: result.insertId,
        };
        res.json(answer);
      }
    );
  });
});

//Delete User by id
app.delete("/user/:id", function (req, res) {
  let userInfo = authorization(req, res);
  if (userInfo !== false) {
    var sqlCheck = "SELECT * FROM `users` WHERE `id` = " + req.params.id;
    con.query(sqlCheck, function (err, result) {
      if (err) {
        res.status(500).send("Internal Server Error");
        return;
      }
      if (result.length === 0) {
        res.status(204).send("No Content found");
        return;
      }
      var sqlDelete = "DELETE FROM `users` WHERE `id` = " + req.params.id;
      con.query(sqlDelete, function (err, result) {
        if (err) {
          res.status(500).send("Internal Server Error");
          return;
        }
        res.status(200).send("Accepted, User was deleted");
      });
    });
  } else {
    res.status(418).send("Unauthorized");
  }
});

//Login
app.post("/login", function (req, res) {
  let hashpassword = hash(req.body.password);
  let sql =
    "SELECT * FROM `users` WHERE `username` = " + "'" + req.body.username + "'";
  con.query(sql, function (err, result, fields) {
    if (err) throw err;
    let data = result[0];
    if (hashpassword == data.password) {
      let answer = {
        username: `${req.body.username}`,
        age: `${data.age}`,
        id: data.id,
      };
      let payload = {
        sub: req.body.id,
        name: req.body.username,
      };
      let token = jwt.sign(payload, "signeradochklar", {
        expiresIn: "2h", //expires in 2 hours
      });
      res.json({
        //        answer: answer,        "Din inloggningsroute (POST /login) returnerar inte information om användaren i klartext utan en tidsbegränsad JWT (token)"
        token: token,
      });
      return;
    } else {
      res.status(418).send("unauthorized");
    }
  });
});

//Show Users + if id = me => send info from user token
app.get("/user/me", function (req, res) {
  let userInfo = authorization(req, res);
  if (userInfo != false) {
    let token = authorization(req, res);
    res.json(token);
  }
});

app.get("/user/:identifier", function (req, res) {
  let userInfo = authorization(req, res);
  if (userInfo !== false) {
    var identifier = req.params.identifier;
    var sql = "SELECT * FROM users WHERE id = ? OR username = ?";
    con.query(sql, [identifier, identifier], function (err, result, fields) {
      if (err) {
        res.status(500).send("Internal Server Error");
        return;
      }
      if (result.length === 0) {
        res.status(404).send("User Not Found");
        return;
      }
      res.json(result);
    });
  }
});

app.get("/users", function (req, res) {
  let userInfo = authorization(req, res);
  if (userInfo != false) {
    let ageQuery;
    req.query.age ? (ageQuery = req.query.age) : (ageQuery = "%");
    var sql = `SELECT * FROM users WHERE age LIKE '${ageQuery}'`;
    con.query(sql, function (err, result, fields) {
      if (err) throw err;
      res.json(result);
    });
  }
});

//Update User
app.put("/user/:id", function (req, res) {
  let userInfo = authorization(req, res);
  if (userInfo != false) {
    let passwordhash = hash(req.body.password);
    let sql = `UPDATE users SET username = '${req.body.username}', password = '${passwordhash}', age = '${req.body.age}' WHERE id = '${req.params.id}'`;
    con.query(sql, function (err, result, fields) {
      if (err) throw err;
      let updatedUser = {
        username: `${req.body.username}`,
        password: `${passwordhash}`,
        age: `${req.body.age}`,
        id: `${req.params.id}`,
      };
      res.json(updatedUser);
    });
  }
});

// Listening to port :]
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
