const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Decode JWT
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    console.log(decoded);
    req.decoded = decoded;
    next();
  });
}

//MongoDb Add
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.teba24n.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// Connect to MongoDb
async function run() {
  try {
    const postsCollection = client.db("friendkitbook").collection("posts");
    const usersCollection = client.db("friendkitbook").collection("users");
    const commentCollection = client.db("friendkitbook").collection("comments");
    const likesCollection = client.db("friendkitbook").collection("likes");
    // // Verify Admin
    // const verifyAdmin = async (req, res, next) => {
    //   const decodedEmail = req.decoded.email;
    //   const query = { email: decodedEmail };
    //   const user = await usersCollection.findOne(query);

    //   if (user?.role !== "admin") {
    //     return res.status(403).send({ message: "forbidden access" });
    //   }
    //   console.log("Admin true");
    //   next();
    // };

    // Save user email & generate JWT
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;

      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );

      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
      });
      console.log(result);
      res.send({ result, token });
    });

    // Get All User
    app.get("/users", async (req, res) => {
      const users = await usersCollection.find({}).toArray();
      res.send(users);
    });

    // Get A Single User
    app.get("/user/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.decoded.email;

      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send(user);
    });

    // get all posts
    app.get("/posts", async (req, res) => {
      const post = await postsCollection.find({}).toArray();
      res.send(post);
    });

    // Get All posts for host
    app.get("/posts/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.decoded.email;

      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = {
        "seller.email": email,
      };
      const cursor = postsCollection.find(query);
      const posts = await cursor.toArray();
      res.send(posts);
    });

    // Post A post
    app.post("/posts", verifyJWT, async (req, res) => {
      const post = req.body;
      console.log(post);
      const result = await postsCollection.insertOne(post);
      res.send(result);
    });

    // // Delete a post
    // app.delete("/posts/:id", verifyJWT, async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: ObjectId(id) };
    //   const result = await postsCollection.deleteOne(query);
    //   res.send(result);
    // });

    // Get Single post
    app.get("/post/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const post = await postsCollection.findOne(query);
      res.send(post);
    });
    // update a post
    app.put("/post/:id", verifyJWT, async (req, res) => {
      const { id } = req.params;
      try {
        const result = await postsCollection.updateOne(
          { _id: id },
          { $set: req.body }
        );
        console.log(result);
        if (result.matchedCount) {
          res.send({
            success: true,
            message: "Update Succesfully",
          });
        } else {
          res.send({
            success: false,
            error: "could not Update the product",
          });
        }
      } catch (error) {
        console.log(error.name, error.message);
        res.send({
          success: false,
          error: error.message,
        });
      }
    });

    //post a comment
    app.post("/comments", verifyJWT, async (req, res) => {
      const comment = req.body;
      console.log(comment);
      const result = await commentCollection.insertOne({ comment });
      res.send(result);
    });
    // get all comment for a post
    app.get("/comment/:id", async (req, res) => {
      const id = req.params.id;
      const query = { "comment._id": id };
      const cursor = commentCollection.find(query);
      const comments = await cursor.toArray();
      res.send(comments);
    });
    // post a like
    app.post("/likes", verifyJWT, async (req, res) => {
      const like = req.body;
      console.log(like);
      const result = await likesCollection.insertOne({ like });
      res.send(result);
    });
    // get all likes for a post
    app.get("/likes/:id", async (req, res) => {
      const id = req.params.id;
      const query = { "like._id": id };
      const cursor = likesCollection.find(query);
      const likes = await cursor.toArray();
      res.send(likes);
    });

    // dislike a post
    app.delete("/likes/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { "like._id": id };
      const result = await likesCollection.deleteOne(query);
      res.send(result);
    });
  } catch (error) {
    console.log(error);
  }
}

run().catch((err) => console.error(err));

app.get("/", (req, res) => {
  res.send("Friendkitbook Server is running...");
});

app.listen(port, () => {
  console.log(`Server is running...on ${port}`);
});
