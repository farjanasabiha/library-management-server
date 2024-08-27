const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jtwnv2k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const bookCollection = client.db("bookDB").collection("book");
    const borrowedBookCollection = client
      .db("bookDB")
      .collection("borrowedBook");

    const bookCategoryCollection = client
      .db("bookDB")
      .collection("book-categories");

    app.get("/bookCategories", async (req, res) => {
      const cursor = bookCategoryCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/allBooks", async (req, res) => {
      const cursor = bookCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/getCategoryBooks/:categoryName", async (req, res) => {
      const categoryName = req.params.categoryName;
      console.log(categoryName);
      const cursor = bookCollection.find({ category: categoryName });
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/bookDetails/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookCollection.findOne(query);
      res.send(result);
    });

    app.post("/books", async (req, res) => {
      const newList = req.body;
      const result = await bookCollection.insertOne(newList);
      res.send(result);
    });

    app.put("/updateBooks/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const data = req.body;
      const updateDoc = {
        $set: {
          ...data,
        },
      };
      const result = await bookCollection.updateOne(filter, updateDoc);
      return res.send(result);
    });

    app.get("/getBorrowBooks/:email", async (req, res) => {
      const email = req.params.email;
      const response = await borrowedBookCollection.find({ borrowedEmail: email }).toArray();
      return res.send(response)
    });

    app.delete("/returnBooks/:id", async (req, res) => {
      const id = req.params.id;
      const previousBookId = req.query.previousBookId;
      console.log(id, "Hello", previousBookId);
      const mainBook = await bookCollection.findOne({_id : new ObjectId(previousBookId)})
      const updateDoc = {
        $set: {
          quantity_of_books: parseInt(mainBook.quantity_of_books) + 1,
        },
      }
      const result = await bookCollection.updateOne(
        { _id: new ObjectId(previousBookId) },
        updateDoc
      );

      const response = await borrowedBookCollection.deleteOne({
        _id: new ObjectId(id)
      });
      return res.send(response)
    });

    app.put("/bookDetails/:id", async (req, res) => {
      const bookData = req.body;
      console.log(bookData);
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const findData = await bookCollection.findOne(filter);
      const updateBookData = {
        $set: {
          ...bookData,
        },
      };
      const response = await borrowedBookCollection.insertOne(bookData);
      const updateDoc = {
        $set: {
          quantity_of_books: parseInt(findData.quantity_of_books) - 1,
        },
      };
      const result = await bookCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    console.log("Connected to MongoDB!");
  } finally {
    // Do not close the client connection if you're using it persistently
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running!");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});