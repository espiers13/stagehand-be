const { fetchUserProductions } = require("../models/user-models.js");

const {
  fetchRehearsalsByProduction,
  createNewRehearsal,
  updateRehearsal,
  removeRehearsal,
  fetchSchedule,
} = require("../models/rehearsal-models");

exports.getRehearsalsByProduction = (req, res, next) => {
  const { production_id } = req.params;
  const userId = req.user.user_id;

  fetchUserProductions(userId).then((productions) => {
    const isMember = productions.some(
      (production) => production.id === Number(production_id),
    );

    if (!isMember) {
      return next({ status: 403, msg: "Forbidden" });
    }
  });

  fetchRehearsalsByProduction(production_id, userId)
    .then((data) => {
      res.status(200).send(data);
    })
    .catch((err) => {
      next(err);
    });
};

exports.postNewRehearsal = (req, res, next) => {
  const { production_id } = req.params;
  const rehearsalData = req.body;
  const userId = req.user.user_id;

  createNewRehearsal(production_id, rehearsalData, userId)
    .then((data) => {
      res.status(201).send(data);
    })
    .catch((err) => {
      if (err.code === "23505") {
        res.status(403).send({ msg: "Forbidden" });
      }
      if (err.code === "23502") {
        res.status(400).send({ msg: "Bad request" });
      }
      next(err);
    });
};

exports.patchRehearsal = (req, res, next) => {
  const userId = req.user.user_id;
  const { rehearsal_id, production_id } = req.params;
  const newData = req.body;

  updateRehearsal(rehearsal_id, production_id, userId, newData)
    .then((data) => {
      res.status(200).send(data);
    })
    .catch((err) => {
      next(err);
    });
};

exports.deleteRehearsal = (req, res, next) => {
  const { rehearsal_id, production_id } = req.params;
  const userId = req.user.user_id;

  removeRehearsal(production_id, rehearsal_id, userId)
    .then(() => {
      res.status(204).send();
    })
    .catch((err) => {
      next(err);
    });
};

exports.getUserSchedule = (req, res, next) => {
  const userId = req.user.user_id;

  fetchSchedule(userId)
    .then((data) => {
      res.status(200).send(data);
    })
    .catch((err) => {
      next(err);
    });
};
