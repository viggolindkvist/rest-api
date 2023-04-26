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
//Så länge man har en bearer token kan man även ändra andra users
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
app.post("/users", function (req, res) {
  let passwordhash = hash(req.body.password);
  var sql = `INSERT INTO users (username, password, age) VALUES ('${req.body.username}', '${passwordhash}', '${req.body.age}')`;
  con.query(sql, function (err, result, fields) {
    if (err) throw err;
    let answer = {
      username: `${req.body.username}`,
      password: `${passwordhash}`,
      age: `${req.body.age}`,
      id: result.insertId,
    };
    res.json(answer);
  });
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
      let token = jwt.sign(payload, "signeradochklar");
      res.json({
        answer: answer,
        token: token,
      });
      return;
    } else {
      res.status(418).send("unauthorized");
    }
  });
});

//Show Users + if id = me => send info from user token
app.get("/users/me", function (req, res) {
  let userInfo = authorization(req, res);
  if (userInfo != false) {
    let token = authorization(req, res);
    res.json(token);
  }
});

app.get("/users/:specifier", function (req, res) {
  let userInfo = authorization(req, res);
  if (userInfo != false) {
    let specifier = req.params.specifier;
    let isnum = /^\d+$/.test(specifier);
    let token = authorization(req, res);
    if (isnum) {
      var sql = "SELECT * FROM users WHERE id = " + specifier;
      con.query(sql, function (err, result, fields) {
        if (err) throw err;
        res.json(result);
      });
    } else {
      res.json(token);
    }
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
app.put("/users/:id", function (req, res) {
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
