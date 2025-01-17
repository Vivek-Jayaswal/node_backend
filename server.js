const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

require("dotenv").config();

const { userDataValidator, isEmailValidate } = require("./utils/authUtils");
const userModel = require("./models/userModel");
const todoModels = require("./models/todoModel.js");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const mongodbSession = require("connect-mongodb-session")(session);
const PORT = process.env.PORT || 8000;

const app = express();

const store = new mongodbSession({
  uri: process.env.MONGO_URI,
  collection: "sessions",
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Database connected successfull");
  })
  .catch((err) => {
    console.log(err);
  });

// app.use(
//   cors({
//     origin: "https://vue-assesment-frontend.vercel.app",
//     methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
//     allowedHeaders: "Content-Type,Authorization",
//     credentials: true,
//   })
// );

app.use(
  cors({
    origin: "https://vue-assesment-frontend.vercel.app",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extends: true }));
// app.use(
//   session({
//     secret: process.env.SECRET_KEY,
//     store: store,
//     resave: false,
//     saveUninitialized: false,
//     cookie: {
//       secure: true,
//       httpOnly: true,
//       sameSite: "lax",
//     },
//   })
// );

app.use(
  session({
    secret: process.env.SECRET_KEY,
    store: store,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true, // Ensures the cookie is only sent over HTTPS
      httpOnly: true, // Prevents client-side JS from accessing the cookie
      sameSite: "lax" // Controls cross-site request behavior
    }
  })
);

app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    await userDataValidator({ name, email, password });
  } catch (error) {
    return res.status(400).json(error);
  }

  try {
    const userEmailEixst = await userModel.findOne({ email: email });
    if (userEmailEixst) {
      return res.status(400).json(`Email already exist : ${email}`);
    }

    const hashedPassword = await bcrypt.hash(
      password,
      Number(process.env.SALT)
    );

    const userObj = new userModel({
      name: name,
      email: email,
      password: hashedPassword,
    });

    const userDb = await userObj.save();
    return res.status(201).json({
      message: "User created successfully",
      data: userDb,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: error,
    });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  

  if (!email || !password)
    return res.status(400).json("Missing user credentials.");

  try {
    //find the user wth loginId
    let userDb = {};
    if (isEmailValidate({ key: email })) {
      userDb = await userModel.findOne({ email: email });
    }

    //check is user exist
    if (!userDb)
      return res.status(400).json("User not found, please register first.");

    //comapre password
    const isMatched = await bcrypt.compare(password, userDb.password);

    if (!isMatched) return res.status(400).json("Incorrect password");

    // req.session.isAuth = true;
    // req.session.user = {
    //   userId: userDb._id,
    //   email: userDb.email,
    // };

    req.session.isAuth = true;
    req.session.user = {
      userId: userDb["_id"],
      email: userDb["email"],
    };

    console.log(req.session);
    
    return res
      .status(200)
      .json({ message: "Login successful", isAuthenticated: true });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: error,
    });
  }
});

// check for user present in session or not for innovice and so many things
app.get("/auth/check-session", (req, res) => {
  console.log(req.session)
  
  if (req.session.isAuth) {
    return res.status(200).json({
      isAuthenticated: true,
      user: req.session.user,
    });
  }
  return res.status(401).json({ isAuthenticated: false });
});

app.post("/invoice", async (req, res) => {
  console.log("invoices calling");

  const { userData, companyData, transactionData } = req.body;
  const username = req.session.user.email;

  const todoObj = new todoModels({
    userData: userData,
    companyData: companyData,
    transactionData: transactionData,
    userEmail: username,
  });

  try {
    const todoDb = await todoObj.save();
    return res.send({
      status: 201,
      message: "Todo created successfully",
      data: todoDb,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
});

app.get("/get-all-data", async (req, res) => {
  const username = req.session.user.email;
  console.log("username", username);

  try {
    const todoList = await todoModels.find({ userEmail: username });
    if (todoList.length === 0) {
      return res.send({
        status: 204,
        message: "No Todo found",
      });
    }

    return res.status(200).json({
      message: "Read Success",
      data: todoList,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: error,
    });
  }
});

app.post("/auth/logout", (req, res) => {
  console.log("Logout API calling");

  console.log(req.session);

  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error", err); // Check if any error occurs during logout
      return res.status(500).json({
        message: "Failed to log out",
        error: err,
      });
    }
    console.log("Logout successful");
    return res.status(200).json({
      message: "Logged out successfully",
    });
  });
});

app.listen(PORT, () => {
  console.log(`server is up and runnug ${PORT}`);
});
