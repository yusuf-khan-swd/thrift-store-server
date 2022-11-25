const { MongoClient, ServerApiVersion } = require('mongodb');
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tjl9nwy.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(403).send({ message: 'Forbidden access! header is missing' })
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(401).send({ message: 'Unauthorized access! Token is not valid' });
    }

    req.decoded = decoded;
    next();
  })
};

async function run() {
  try {
    const usersCollection = client.db("thriftStore").collection("users");
    const categoriesCollection = client.db("thriftStore").collection("categories");

    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const filter = { userEmail: decodedEmail };
      const user = await usersCollection.findOne(filter);

      if (user.userType !== "admin") {
        return res.status(401).send({ message: "Unauthorized access. User is not admin" });
      }

      next();
    };

    app.post("/user", async (req, res) => {
      const user = req.body;
      const email = user.userEmail;

      const filter = { userEmail: email };
      const isUserRegister = await usersCollection.findOne(filter);
      console.log(isUserRegister);

      if (!isUserRegister) {
        const result = await usersCollection.insertOne(user);
        return res.send({
          success: true,
          data: result
        });
      }
      else {
        res.send({
          success: false,
          message: `${user.userName} you already have an account. Please login`
        })
      }

    });

    app.get("/user", async (req, res) => {
      const email = req.query.email;
      const query = { userEmail: email };
      const result = await usersCollection.findOne(query);
      res.send({ result });
    });

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      console.log(email);
      const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1d' })
      res.send({ token });
    });

    app.get("/accountType", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.query.email;

      if (email !== decodedEmail) {
        return res.status(403).send({ message: 'Forbidden access! Email is not matched' });
      }

      const filter = { userEmail: decodedEmail };
      const result = await usersCollection.findOne(filter);
      res.send({ result });
    });

    app.post("/categories", verifyJWT, verifyAdmin, async (req, res) => {
      const category = req.body;
      const result = await categoriesCollection.insertOne(category);
      res.send(result);
    });

  }
  finally {

  }
};

run().catch(console.log);

app.get("/", (req, res) => {
  res.send("Thrift store server is running");
});

app.listen(port, () => {
  console.log(`Thrift store server is running on port ${port}`);
});
