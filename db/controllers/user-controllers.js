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

  fetchUserProductions(userId)
    .then((productions) => {
      res.status(200).send(productions);
    })
    .catch((err) => {
      next(err);
    });
};

exports.postNewProduction = (req, res, next) => {
  const production = req.body;
  const userId = req.user.user_id;

  createNewProduction(production, userId)
    .then((newProduction) => {
      res.status(201).send(newProduction);
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

exports.getProductionById = (req, res, next) => {
  const { production_id } = req.params;
  const user_id = req.user.user_id;

  if (isNaN(Number(production_id))) {
    return next({ status: 400, msg: "Bad request" });
  }

  fetchUserProductions(user_id).then((productions) => {
    const isMember = productions.some(
      (production) => production.id === Number(production_id),
    );

    if (!isMember) {
      return next({ status: 403, msg: "Forbidden" });
    }
  });

  return fetchProductionData(production_id)
    .then((data) => {
      console.log(data);
      res.status(200).send(data);
    })
    .catch((err) => {
      next(err);
    });
};

exports.updateProductionData = (req, res, next) => {
  const newData = req.body;
  const { production_id } = req.params;
  const { user_id } = req.user;

  if (isNaN(Number(production_id))) {
    return next({ status: 400, msg: "Bad request" });
  }

  if (Object.keys(newData).length === 0) {
    return next({ status: 400, msg: "Missing required fields" });
  }

  patchProductionData(newData, production_id, user_id)
    .then((updatedProduction) => {
      res.status(200).send(updatedProduction);
    })
    .catch((err) => {
      console.log(err);
      next(err);
    });
};

exports.deleteProduction = (req, res, next) => {
  const { user_id } = req.user;
  const { production_id } = req.params;

  if (isNaN(Number(production_id))) {
    return next({ status: 400, msg: "Bad request" });
  }

  removeProduction(user_id, production_id)
    .then(() => {
      res.status(204).send();
    })
    .catch((err) => {
      console.log(err);
      next(err);
    });
};
