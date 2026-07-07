const {
  fetchProductionData,
  patchProductionData,
  removeProduction,
  createNewProduction,
} = require("../models/production-models.js");

const { fetchUserProductions } = require("../models/user-models.js");

const { sendPasswordResetEmail } = require("../utils/mailer.js");

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
