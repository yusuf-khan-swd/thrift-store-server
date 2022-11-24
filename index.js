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

async function run() {
  try {
    const usersCollection = client.db("thriftStore").collection("users");

    app.post("/user", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/user", async (req, res) => {
      const email = req.query.email;
      const query = { userEmail: email };
      const result = await usersCollection.findOne(query);
      res.send({ result });
    });

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1d' })
      res.send({ token });
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
