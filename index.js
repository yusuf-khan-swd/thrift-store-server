const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const productsCollection = client.db("thriftStore").collection("products");
    const ordersCollection = client.db("thriftStore").collection("orders");

    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const filter = { userEmail: decodedEmail };
      const user = await usersCollection.findOne(filter);

      if (user.userType !== "admin") {
        return res.status(401).send({ message: "Unauthorized access. User is not admin" });
      }

      next();
    };

    const verifySeller = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const filter = { userEmail: decodedEmail };
      const user = await usersCollection.findOne(filter);

      if (user.userType !== "seller") {
        return res.status(401).send({ message: "Unauthorized access. User is not Seller" });
      }
      next();
    };

    app.post("/users", async (req, res) => {
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

    app.get("/users", async (req, res) => {
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

    app.get("/usersType", verifyJWT, async (req, res) => {
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

    app.get("/categories", async (req, res) => {
      const query = {};
      const result = await categoriesCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/category/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { categoryId: id };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/seller-product", verifyJWT, verifySeller, async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });

    app.get("/seller-products", verifyJWT, verifySeller, async (req, res) => {
      const email = req.query.email;
      const query = { sellerEmail: email };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    app.put("/seller-product/:id", verifyJWT, verifySeller, async (req, res) => {
      const advertise = req.body.advertise;
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          advertised: !advertise
        }
      }

      const result = await productsCollection.updateOne(filter, updatedDoc, options);
      res.send(result);
    });

    app.delete("/seller-product/:id", verifyJWT, verifySeller, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(filter);
      res.send(result);
    });

    app.get("/all-sellers", verifyJWT, verifyAdmin, async (req, res) => {
      const query = { userType: 'seller' };
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    app.put("/all-sellers/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const verified = req.body.verified;

      let isVerified = "";
      if (verified) {
        isVerified = true;
      }
      else {
        isVerified = false;
      }

      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          userIsVerified: !isVerified
        }
      }

      const result = await usersCollection.updateOne(filter, updatedDoc, options);
      res.send(result);
    })

    app.delete("/all-sellers/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(filter);
      res.send(result);
    });

    app.get("/all-buyers", verifyJWT, verifyAdmin, async (req, res) => {
      const filter = { userType: "buyer" };
      const result = await usersCollection.find(filter).toArray();
      res.send(result);
    });

    app.delete("/all-buyers/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(filter);
      res.send(result);
    })

    app.get("/advertised", async (req, res) => {
      const query = { advertised: true, saleStatus: "available" };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/orders", verifyJWT, async (req, res) => {
      const order = req.body;
      const result = await ordersCollection.insertOne(order);
      res.send(result);
    });

    app.get("/orders", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const query = { buyerEmail: decodedEmail };
      const result = await ordersCollection.find(query).toArray();
      res.send(result);
    })

    app.delete("/orders/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await ordersCollection.deleteOne(query);
      res.send(result);
    });

    app.put("/reports/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          reported: true
        }
      }

      const result = await productsCollection.updateOne(filter, updatedDoc, options);
      res.send(result);
    });

    app.get("/reports", verifyJWT, verifyAdmin, async (req, res) => {
      const query = { reported: true };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/products/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
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
