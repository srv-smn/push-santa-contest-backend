const express = require("express");
const router = new express.Router();

const userController = require('../controllers/users')

router
  .route("/add-user-details")
  .post(userController.createUser);


module.exports = router