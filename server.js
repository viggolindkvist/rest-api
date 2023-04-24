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
//Så länge man är inloggad kan man även ändra andra users 
function authorization(req, res) {
  let authHeader = req.headers["authorization"];
  if (authHeader == undefined) {
    res.status(418).send("auth-header is missing");
    return false
  }
  let token = authHeader.slice(7);
  let decoded;
  try {
    decoded = jwt.verify(token, "signeradochklar");
  } catch (err) {
    console.log(err);
    res.status(401).send("Invalid auth token");
    return decoded 
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

//Show Users
app.get("/users/:id", function (req, res) {
  var sql = "SELECT * FROM users WHERE id = " + req.params.id;
  con.query(sql, function (err, result, fields) {
    if (err) throw err;
    res.json(result);
  });
});
app.get("/users", function (req, res) {
  let ageQuery;
  req.query.age ? (ageQuery = req.query.age) : (ageQuery = "%");
  var sql = `SELECT * FROM users WHERE age LIKE '${ageQuery}'`;
  con.query(sql, function (err, result, fields) {
    if (err) throw err;
    res.json(result);
  });
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

/*Update User, försök 1 att kolla att id existerar 
app.put("/users/:id", function (req, res) {
  let numberOfRows = `COUNT()`
  con.query(numberOfRows, function (err, fields) {
    if (err) throw err;
  });
  if (numberOfRows >= req.params.id) {
    let sql = `UPDATE users SET username = '${req.body.username}', password = '${req.body.password}', age = '${req.body.age}' WHERE id = '${req.params.id}'`;
    con.query(sql, function (err, result, fields) {
      if (err) throw err;
      let updatedUser = {
        username: `${req.body.username}`,
        password: `${req.body.password}`,
        age: `${req.body.age}`,
        id: result.insertId,
      };
      res.json(updatedUser);
    });

  } else {
    res.status(400).send('Angivet ID existerar ej.')
  };
});*/

// Listening to port :]
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
