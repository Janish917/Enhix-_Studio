const express = require("express");
const router = express.Router();

const User = require("../models/User");

router.post("/register", async (req, res) => {
  try {

    const { username, email, password } = req.body;

    const newUser = await User.create({
      username,
      email,
      password
    });

    res.status(201).json({
      message: "User registered successfully",
      user: newUser
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }
});

module.exports = router;