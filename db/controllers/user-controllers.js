const {
  fetchUserByCredentials,
  createNewUser,
  fetchUserById,
  fetchUserProductions,
  createNewProduction,
  updateUserPassword,
  removeUser,
  createResetToken,
  resetPasswordWithToken,
  fetchProductionData,
  patchProductionData,
  removeProduction,
  fetchUsernameById,
} = require("../models/user-models.js");

const { sendPasswordResetEmail } = require("../utils/mailer.js");

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

exports.getUsernameById = (req, res, next) => {
  const { id } = req.params;
  fetchUserById(id)
    .then((user) => {
      if (!user) {
        res.status(404).send({ msg: "User not found" });
      }
      res.status(200).send({ username: user.username });
    })
    .catch((err) => {
      if (err.code === "22P02") {
        res.status(400).send({ msg: "Bad request" });
      }
      next(err);
    });
};

exports.getLoggedInUser = (req, res, next) => {
  const userId = req.user.user_id;

  fetchUserById(userId)
    .then((user) => {
      res.status(200).send({ user });
    })
    .catch((err) => {
      next(err);
    });
};

exports.getUserProductions = (req, res, next) => {
  const userId = req.user.user_id;

  console.log(userId);

  fetchUserProductions(userId)
    .then((productions) => {
      res.status(200).send(productions);
    })
    .catch((err) => {
      next(err);
    });
};

exports.changePassword = (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.user_id;

  if (!currentPassword || !newPassword) {
    return next({ status: 400, msg: "Missing required fields" });
  }

  updateUserPassword(userId, currentPassword, newPassword)
    .then(() => {
      res.status(200).send({ msg: "Password updated successfully" });
    })
    .catch((err) => {
      next(err);
    });
};

exports.deleteUser = (req, res, next) => {
  const userId = req.user.user_id;
  const { currentPassword } = req.body;

  if (!currentPassword) {
    return next({ status: 400, msg: "Missing required fields" });
  }

  removeUser(userId, currentPassword)
    .then(() => {
      res.status(204).send();
    })
    .catch(next);
};

exports.forgotPassword = (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next({ status: 400, msg: "Missing required fields" });
  }

  createResetToken(email)
    .then((result) => {
      if (result) {
        return sendPasswordResetEmail(email, result.token);
      }
    })
    .then(() => {
      res.status(200).send({ msg: "Password reset email sent" });
    })
    .catch(next);
};

exports.resetPassword = (req, res, next) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return next({ status: 400, msg: "Missing required fields" });
  }

  resetPasswordWithToken(token, newPassword)
    .then(() => {
      res.status(200).send({ msg: "Password reset successfully" });
    })
    .catch((err) => {
      next(err);
    });
};
