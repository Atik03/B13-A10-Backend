const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

dotenv.config();

const uri = process.env.MONGODB_URI;

const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const db = client.db("booknestDB");
    const usersCollection = db.collection("users");
    const booksCollection = db.collection("books");
    const deliveriesCollection = db.collection("deliveries");
    const reviewsCollection = db.collection("reviews");
    const transactionsCollection = db.collection("transactions");

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // Create User
    app.post("/users", async (req, res) => {
      try {
        const user = req.body;

        // Email already exists?
        const existingUser = await usersCollection.findOne({
          email: user.email,
        });

        if (existingUser) {
          return res.status(200).send({
            success: true,
            message: "User already exists",
          });
        }

        user.createdAt = new Date();

        const result = await usersCollection.insertOne(user);

        res.send({
          success: true,
          message: "User Created Successfully",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    app.get("/users", async (req, res) => {
      try {
        const result = await usersCollection
          .find()
          .sort({ createdAt: -1 })
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    app.get("/users/:email", async (req, res) => {
      try {
        const email = req.params.email;

        const result = await usersCollection.findOne({
          email,
        });

        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // Update User Role
    app.patch("/users/role/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { role } = req.body;

        // Validation
        const validRoles = ["user", "librarian", "admin"];

        if (!validRoles.includes(role)) {
          return res.status(400).send({
            success: false,
            message: "Invalid role",
          });
        }

        const query = {
          _id: new ObjectId(id),
        };

        const updateDoc = {
          $set: {
            role,
          },
        };

        const result = await usersCollection.updateOne(query, updateDoc);

        res.send({
          success: true,
          message: "User role updated successfully",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // Delete User
    app.delete("/users/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const result = await usersCollection.deleteOne({
          _id: new ObjectId(id),
        });

        res.send({
          success: true,
          message: "User deleted successfully",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // Get Users By Role
    app.get("/users-role/:role", async (req, res) => {
      try {
        const role = req.params.role;

        const result = await usersCollection.find({ role }).toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // Check User Exists
    app.get("/user-exists/:email", async (req, res) => {
      try {
        const email = req.params.email;

        const user = await usersCollection.findOne({
          email,
        });

        res.send({
          exists: !!user,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // start Books API

    // Add Book

    app.post("/books", async (req, res) => {
      try {
        const book = req.body;

        book.status = "Pending";

        book.availability =
          Number(book.quantity) > 0 ? "Available" : "Unavailable";

        book.createdAt = new Date();

        const result = await booksCollection.insertOne(book);

        res.send({
          success: true,
          message: "Book Added Successfully",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // Get all Books
    app.get("/books", async (req, res) => {
      try {
        const {
          search = "",
          category,
          availability,
          minFee,
          maxFee,
          sort = "latest",
          page = 1,
          limit = 8,
        } = req.query;

        const query = {
          status: "Published",
        };

        if (search) {
          query.title = {
            $regex: search,
            $options: "i",
          };
        }

        if (category) {
          query.category = category;
        }

        if (availability) {
          query.availability = availability;
        }

        if (minFee || maxFee) {
          query.deliveryFee = {};

          if (minFee) query.deliveryFee.$gte = Number(minFee);

          if (maxFee) query.deliveryFee.$lte = Number(maxFee);
        }

        let sortOption = {
          createdAt: -1,
        };

        if (sort === "low") {
          sortOption = {
            deliveryFee: 1,
          };
        }

        if (sort === "high") {
          sortOption = {
            deliveryFee: -1,
          };
        }

        const skip = (Number(page) - 1) * Number(limit);

        const books = await booksCollection
          .find(query)
          .sort(sortOption)
          .skip(skip)
          .limit(Number(limit))
          .toArray();

        const total = await booksCollection.countDocuments(query);

        res.send({
          books,
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: Number(page),
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // Get single Books
    // app.get("/books", async (req, res) => {
    //   try {
    //     const {
    //       search = "",
    //       category,
    //       availability,
    //       status,
    //       minFee,
    //       maxFee,
    //       page = 1,
    //       limit = 8,
    //     } = req.query;

    //     const query = {};

    //     // Search
    //     if (search) {
    //       query.title = {
    //         $regex: search,
    //         $options: "i",
    //       };
    //     }

    //     // Category
    //     if (category) {
    //       query.category = category;
    //     }

    //     // Availability
    //     if (availability) {
    //       query.availability = availability;
    //     }

    //     // Status
    //     if (status) {
    //       query.status = status;
    //     }

    //     // Fee Range
    //     if (minFee || maxFee) {
    //       query.deliveryFee = {};

    //       if (minFee) query.deliveryFee.$gte = Number(minFee);

    //       if (maxFee) query.deliveryFee.$lte = Number(maxFee);
    //     }

    //     const skip = (Number(page) - 1) * Number(limit);

    //     const books = await booksCollection
    //       .find(query)
    //       .sort({ createdAt: -1 })
    //       .skip(skip)
    //       .limit(Number(limit))
    //       .toArray();

    //     const total = await booksCollection.countDocuments(query);

    //     res.send({
    //       books,
    //       total,
    //       currentPage: Number(page),
    //       totalPages: Math.ceil(total / limit),
    //     });
    //   } catch (error) {
    //     res.status(500).send({
    //       success: false,
    //       message: error.message,
    //     });
    //   }
    // });

    // Get Single Book
    app.get("/books/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const result = await booksCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!result) {
          return res.status(404).send({
            success: false,
            message: "Book not found",
          });
        }

        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // Get Books By Librarian

    app.get("/librarian-books/:email", async (req, res) => {
      try {
        const email = req.params.email;

        const books = await booksCollection
          .find({
            librarianEmail: email,
          })
          .sort({
            createdAt: -1,
          })
          .toArray();

        res.send(books);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // Update Book
    app.patch("/books/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updatedBook = req.body;

        delete updatedBook._id;

        // Auto Update Availability
        if (updatedBook.quantity !== undefined) {
          updatedBook.availability =
            Number(updatedBook.quantity) > 0 ? "Available" : "Unavailable";
        }

        const result = await booksCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: updatedBook,
          },
        );

        res.send({
          success: true,
          message: "Book updated successfully",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // Delete Book
    app.delete("/books/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const result = await booksCollection.deleteOne({
          _id: new ObjectId(id),
        });

        res.send({
          success: true,
          message: "Book deleted successfully",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // Approve Book
    app.patch("/books/publish/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const result = await booksCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              status: "Published",
            },
          },
        );

        res.send({
          success: true,
          message: "Book Published",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // Unpublish Book
    app.patch("/books/unpublish/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const result = await booksCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              status: "Unpublished",
            },
          },
        );

        res.send({
          success: true,
          message: "Book Unpublished",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // Update Availability
    app.patch("/books/availability/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const { availability } = req.body;

        const result = await booksCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              availability,
            },
          },
        );

        res.send({
          success: true,
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // Librarian Books
    app.get("/my-books/:email", async (req, res) => {
      try {
        const email = req.params.email;

        const result = await booksCollection
          .find({
            ownerEmail: email,
          })
          .sort({
            createdAt: -1,
          })
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // Pending Books
    app.get("/pending-books", async (req, res) => {
      try {
        const result = await booksCollection
          .find({
            status: "Pending Approval",
          })
          .sort({
            createdAt: -1,
          })
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // featured-books
    app.get("/featured-books", async (req, res) => {
      try {
        const result = await booksCollection
          .find({
            status: "Published",
          })
          .sort({
            createdAt: -1,
          })
          .limit(6)
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // categories-books
    app.get("/categories", async (req, res) => {
      try {
        const result = await booksCollection.distinct("category", {
          status: "Published",
        });

        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // admin/books
    app.get("/admin/books", async (req, res) => {
      try {
        const result = await booksCollection
          .find()
          .sort({
            createdAt: -1,
          })
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // book-stats
    app.get("/book-stats/:email", async (req, res) => {
      try {
        const email = req.params.email;

        const total = await booksCollection.countDocuments({
          ownerEmail: email,
        });

        const published = await booksCollection.countDocuments({
          ownerEmail: email,
          status: "Published",
        });

        const pending = await booksCollection.countDocuments({
          ownerEmail: email,
          status: "Pending Approval",
        });

        const unpublished = await booksCollection.countDocuments({
          ownerEmail: email,
          status: "Unpublished",
        });

        res.send({
          total,
          published,
          pending,
          unpublished,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
