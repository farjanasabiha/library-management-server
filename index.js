const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

// Middleware setup
app.use(cors({ origin: ["http://localhost:5173"], credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Cookie options for JWT
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jtwnv2k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// // Logger middleware
// const logger = (req, res, next) => {
//   console.log("Request Log:", req.method, req.url);
//   next();
// };

// Main function to run server and MongoDB connection
async function run() {
  try {
    await client.connect();
    const bookCollection = client.db("bookDB").collection("book");
    const borrowedBookCollection = client
      .db("bookDB")
      .collection("borrowedBook");
    const bookCategoryCollection = client
      .db("bookDB")
      .collection("book-categories");

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log(user, "jwt User");
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365",
      });
      console.log( token)
      res.cookie('token', token, cookieOptions).send({ success: true });
    });

    // JWT verification middleware
    const verifyToken = (req, res, next) => {
      const token = req.cookies.token;
      if (!token) {
        return res.status(401).send({ message: "Unauthorized Access" });
      }
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Unauthorized Access" });
        }
        req.user = decoded;
      });
      next();
    };

    // Routes
    app.get("/bookCategories", async (req, res) => {
      const result = await bookCategoryCollection.find().toArray();
      res.send(result);
    });

    app.get("/allBooks", verifyToken, async (req, res) => {
      const { email } = req.query;
      console.log(email, req.user.email);
      if (req.user.email !== email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      const books = await borrowedBookCollection
        .find({ borrowedEmail: email })
        .toArray();
      // const books = await bookCollection.find().toArray();
      res.send(books);
    });

    app.get("/getCategoryBooks/:categoryName", async (req, res) => {
      const categoryName = req.params.categoryName;
      const books = await bookCollection
        .find({ category: categoryName })
        .toArray();
      res.send(books);
    });

    app.get("/bookDetails/:id", async (req, res) => {
      const id = req.params.id;
      const book = await bookCollection.findOne({ _id: new ObjectId(id) });
      res.send(book);
    });

    app.post("/logout", async (req, res) => {
      console.log(req.body);
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });

    app.post("/books", async (req, res) => {
      const newBook = req.body;
      const result = await bookCollection.insertOne(newBook);
      res.send(result);
    });

    app.put("/updateBooks/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const result = await bookCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...data } }
      );
      res.send(result);
    });

    app.get("/getBorrowBooks/:email", async (req, res) => {
      const email = req.params.email;
      const books = await borrowedBookCollection
        .find({ borrowedEmail: email })
        .toArray();
      res.send(books);
    });

    app.delete("/returnBooks/:id", async (req, res) => {
      const id = req.params.id;
      const previousBookId = req.query.previousBookId;

      const mainBook = await bookCollection.findOne({
        _id: new ObjectId(previousBookId),
      });
      if (!mainBook) {
        return res.status(404).send({ message: "Book not found" });
      }

      await bookCollection.updateOne(
        { _id: new ObjectId(previousBookId) },
        {
          $set: { quantity_of_books: parseInt(mainBook.quantity_of_books) + 1 },
        }
      );

      const response = await borrowedBookCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(response);
    });

    app.put("/bookDetails/:id", async (req, res) => {
      const bookData = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };

      const book = await bookCollection.findOne(filter);
      if (!book) {
        return res.status(404).send({ message: "Book not found" });
      }

      await borrowedBookCollection.insertOne(bookData);
      await bookCollection.updateOne(filter, {
        $set: { quantity_of_books: parseInt(book.quantity_of_books) - 1 },
      });

      res.send({ message: "Book borrowed successfully" });
    });

    console.log("Connected to MongoDB!");
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running!");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
