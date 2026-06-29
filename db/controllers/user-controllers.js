const {
  fetchUserByCredentials,
  createNewUser,
} = require("../models/user-models.js");

exports.loginUser = (req, res, next) => {
  const { email, password } = req.body;

  fetchUserByCredentials(email, password)
    .then((userData) => {
      res.status(200).send(userData);
    })
    .catch((err) => {
      next(err);
    });
};

exports.registerUser = (req, res, next) => {
  const { username, email, password } = req.body;

  createNewUser(username, email, password)
    .then((userData) => {
      res.status(201).send(userData);
    })
    .catch((err) => {
      next(err);
    });
};
