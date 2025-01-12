const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const { userDataValidator, isEmailValidate } = require("./utils/authUtils");
const userModel = require("./models/userModel");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const mongodbSession = require("connect-mongodb-session")(session);

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

app.use(express.json());
app.use(express.urlencoded({ extends: true }));
app.use(
  session({
    secret: process.env.SECRET_KEY,
    store: store,
    resave: false,
    saveUninitialized: false,
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

    req.session.isAuth = true;
    req.session.user = {
      userId: userDb._id,
      email: userDb.email,
    };
    return res.status(200).json("login successfull");
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: error,
    });
  }
});

app.listen(8000, () => {
  console.log("server is up and runnug");
});
