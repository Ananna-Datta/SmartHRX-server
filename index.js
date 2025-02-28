require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");

const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kzh2i.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();

    const userCollection = client.db("SmartHRX").collection("users");
    const workCollection = client.db("SmartHRX").collection("work");
    const payrollCollection = client.db("SmartHRX").collection("payroll");
    const paymentCollection = client.db("SmartHRX").collection("payments");
    const contactCollection = client.db("SmartHRX").collection("contactMessages");


    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    })

    // const verifyToken = (req, res, next) => {
    //   console.log('inside verify token', req.headers.authorization);
    //   if (!req.headers.authorization) {
    //     return res.status(401).send({ message: 'unauthorized access' });
    //   }
    //   const token = req.headers.authorization.split(' ')[1];
    //   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    //     if (err) {
    //       return res.status(401).send({ message: 'unauthorized access' })
    //     }
    //     req.decoded = decoded;
    //     next();
    //   })
    // }

    // const verifyAdmin = async (req, res, next) => {
    //   const email = req.decoded.email;
    //   const query = { email: email };
    //   const user = await userCollection.findOne(query);
    //   const isAdmin = user?.role === 'admin';
    //   if (!isAdmin) {
    //     return res.status(403).send({ message: 'forbidden access' });
    //   }
    //   next();
    // }
    // const verifyHR = async (req, res, next) => {
    //   const email = req.decoded.email;
    //   const query = { email: email };
    //   const user = await userCollection.findOne(query);
    //   const isHR = user?.role === 'HR';
    //   if (!isHR) {
    //     return res.status(403).send({ message: 'forbidden access' });
    //   }
    //   next();
    // }

    // app.get('/users/admin/:email',async (req, res) => {
    //   const email = req.params.email;

    //   if (email !== req.decoded.email) {
    //     return res.status(403).send({ message: 'forbidden access' })
    //   }

    //   const query = { email: email };
    //   const user = await userCollection.findOne(query);
    //   let admin = false;
    //   if (user) {
    //     admin = user?.role === 'admin';
    //   }
    //   res.send({ admin });
    // })
    // app.get('/users/HR/:email', async (req, res) => {
    //   const email = req.params.email;

    //   if (email !== req.decoded.email) {
    //     return res.status(403).send({ message: 'forbidden access' })
    //   }

    //   const query = { email: email };
    //   const user = await userCollection.findOne(query);
    //   let HR = false;
    //   if (user) {
    //     HR = user?.role === 'HR';
    //   }
    //   res.send({ HR });
    // })


    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const user = await userCollection.findOne({ email });
    
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
    
        res.json(user);
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.patch("/users/verify/:id", async (req, res) => {
      const { id } = req.params;
      const { isVerified } = req.body;
      const result = await userCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { isVerified } }
      );
      res.json(result);
    });
    

    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    app.patch('/users/HR/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'HR'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })

    app.get("/work", async (req, res) => {
      const workLogs = await workCollection
        .find({ userId: req.userId })
        .toArray();
      res.json(workLogs);
    });

    app.get("/work/:email", async (req, res) => {
      const { email } = req.params;  // Get email from route params
    
      try {
        // Assuming workCollection is the collection that holds the work logs
        const workLogs = await workCollection
          .find({ email: email })  // Find work logs by email
          .toArray();
    
        if (workLogs.length === 0) {
          return res.status(404).json({ message: "No work logs found for this email." });
        }
    
        res.json(workLogs);  // Return the work logs
      } catch (error) {
        res.status(500).json({ message: "An error occurred while fetching work logs." });
      }
    });
    

    // Add Work Log
    app.post("/work", async (req, res) => {
      const { task, hoursWorked, date, email } = req.body;
      const newWork = { userId: req.userId, task, hoursWorked, date, email };
      const result = await workCollection.insertOne(newWork);
      res.status(201).json(result);
    });

    app.post("/payroll", async (req, res) => {
      try {
        const { employeeId, salary, month, year, status,name,email,designation } = req.body;
        
        if (!employeeId || !salary || !month || !year) {
          return res.status(400).json({ message: "Missing required fields" });
        }
        const newPayroll = {
          employeeId: new ObjectId(employeeId),
          salary,
          month,
          year,
          name,
          email,
          designation,
          status: status || "Pending",
          createdAt: new Date(),
        };
    
        const result = await payrollCollection.insertOne(newPayroll);
    
        res.status(201).json({ message: "Payroll entry created", result });
      } catch (error) {
        console.error("Error processing payroll:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });
    app.get("/payroll", async (req, res) => {
      const payrolls = await payrollCollection.find().toArray();
      res.json(payrolls);
    });


   app.patch("/users/salary/:id", async (req, res) => {
     try {
       const { id } = req.params;
       const { salary } = req.body;
   
       // Check if salary is a valid number
       if (!salary || isNaN(salary) || salary <= 0) {
         return res.status(400).json({ message: "Invalid salary value" });
       }
   
       // Update the user's salary
       const result = await userCollection.updateOne(
         { _id: new ObjectId(id) },
         { $set: { salary } }  // Update only the salary field
       );
   
       if (result.modifiedCount > 0) {
         return res.json({ message: "Salary updated successfully" });
       } else {
         return res.status(404).json({ message: "User not found" });
       }
     } catch (error) {
       console.error("Error updating salary:", error);
       return res.status(500).json({ message: "Internal Server Error" });
     }
   });
   

   app.post("/messages", async (req, res) => {
    const { email, message } = req.body;
  
    // Validate that email and message are provided
    if (!email || !message) {
      return res.status(400).json({ message: "Email and message are required" });
    }
  
    try {
      // Insert the message into the MongoDB collection
      const result = await contactCollection.insertOne({
        email,
        message,
        timestamp: new Date(),
      });
  
      res.status(200).json({ message: "Message sent successfully!" });
    } catch (error) {
      console.error("Error submitting message:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
  

    app.get("/details/:id", async (req, res) => {
      try {
        const id = req.params.id;
        // console.log(id);
    
        // Use find to retrieve all matching documents (an array of results)
        const result = await payrollCollection.find({ employeeId: new ObjectId(id) }).toArray();
    
        if (result.length === 0) {
          return res.status(404).send({ message: "Details not found" });
        }
    
        res.send(result);  // Sends an array of results
      } catch (error) {
        res.status(500).send("Error fetching details.");
      }
    });
    
    app.get("/payment/:email", async (req, res) => {
      try {
        const email = req.params.email;
    
        // Find all payroll records for the given email
        const userPayments = await payrollCollection.find({ email }).toArray();
    
        if (!userPayments.length) {
          return res.status(404).json({ message: "No payment history found" });
        }
    
        res.json(userPayments);
      } catch (error) {
        console.error("Error fetching payment history:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
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
      const result = await workCollection.deleteOne({
        _id: new ObjectId(req.params.id),
      });
      if (result.deletedCount > 0) {
        res.json({ message: "Work log deleted" });
      } else {
        res.status(404).json({ message: "Work log not found" });
      }
    });
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, 'amount inside the intent')

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });
    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);

      //  carefully delete each item from the cart
      console.log('payment info', payment);
      const query = {
        _id: {
          $in: payment.cartIds.map(id => new ObjectId(id))
        }
      };

      const deleteResult = await cartCollection.deleteMany(query);

      res.send({ paymentResult, deleteResult });
    })
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("boss is running");
});

app.listen(port, () => {
  console.log(`Smarthrx is sitting on port ${port}`);
}); 