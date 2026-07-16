const {
  fetchMembersByProduction,
  createNewCompanyMember,
  removeCompanyMember,
  updateCompanyMemberAdmin,
} = require("../models/company-member-models.js");

const { sendPasswordResetEmail } = require("../utils/mailer.js");

exports.getMembersByProduction = (req, res, next) => {
  const { production_id } = req.params;
  const userId = req.user.user_id;

  fetchMembersByProduction(production_id, userId)
    .then((data) => {
      res.status(200).send(data);
    })
    .catch((err) => {
      next(err);
    });
};

exports.postNewCompanyMember = (req, res, next) => {
  const { production_id } = req.params;
  const userId = req.user.user_id;
  const newMember = req.body;

  createNewCompanyMember(production_id, userId, newMember)
    .then((data) => {
      res.status(201).send(data);
    })
    .catch((err) => {
      next(err);
    });
};

exports.deleteCompanyMember = (req, res, next) => {
  const { production_id, member_id } = req.params;
  const userId = req.user.user_id;

  removeCompanyMember(production_id, member_id, userId)
    .then(() => {
      res.status(204).send();
    })
    .catch((err) => {
      next(err);
    });
};

exports.patchCompanyMemberAdmin = (req, res, next) => {
  const { production_id, member_id } = req.params;
  const { admin } = req.body;
  const userId = req.user.user_id;
  console.log(userId);

  if (typeof admin !== "boolean") {
    return next({ status: 400, msg: "Bad request" });
  }

  updateCompanyMemberAdmin(production_id, member_id, userId, admin)
    .then((updatedMember) => {
      res.status(200).send(updatedMember);
    })
    .catch((err) => {
      next(err);
    });
};
