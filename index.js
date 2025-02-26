const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const uri = `mongodb+srv://SmartHRX:${process.env.DB_PASS}@cluster0.swu9d.mongodb.net/?retryWrites=true&w=majority`;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kzh2i.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // await client.connect();

    const userCollection = client.db("SmartHRX").collection("users");
    const workCollection = client.db("SmartHRX").collection("work");

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })

    app.get("/work", async (req, res) => {
    const workLogs = await workCollection.find({ userId: req.userId }).toArray();
    res.json(workLogs);
  });

  // Add Work Log
  app.post("/work", async (req, res) => {
    const { task, hoursWorked, date,email } = req.body;
    const newWork = { userId: req.userId, task, hoursWorked, date ,email};
    const result = await workCollection.insertOne(newWork);
    res.status(201).json(result);
  });
    
  
    // Update Work Log
    app.put("/work/:id", async (req, res) => {
      console.log("Request body:", req.body);
      console.log("Work log ID:", req.params.id);
    
      const { task, hoursWorked, date } = req.body;
      const updatedWork = await workCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { task, hoursWorked, date } }
      );
      if (updatedWork.modifiedCount > 0) {
        res.json({ message: "Work log updated" });
      } else {
        res.status(404).json({ message: "Work log not found" });
      }
    });
  
    // Delete Work Log
    app.delete("/work/:id", async (req, res) => {
      const result = await workCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount > 0) {
        res.json({ message: "Work log deleted" });
      } else {
        res.status(404).json({ message: "Work log not found" });
      }
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('boss is sitting')
})

app.listen(port, () => {
  console.log(`Bistro boss is sitting on port ${port}`);
})