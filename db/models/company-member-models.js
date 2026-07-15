const db = require("../connection");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const {
  sendExistingMemberAddedEmail,
  sendNewMemberInviteEmail,
} = require("../utils/mailer.js");

const { isProductionAdmin } = require("../models/auth-models.js");

const { generateTempPassword } = require("../utils/temp-password.js");

const saltRounds = 10;

exports.fetchMembersByProduction = (production_id, userId) => {
  return db
    .query(
      `SELECT company_members.user_id, users.username, company_members.role, company_members.admin
       FROM company_members
       JOIN users ON users.id = company_members.user_id
       WHERE company_members.production_id = $1`,
      [production_id],
    )
    .then(({ rows }) => {
      if (rows.length === 0) {
        return Promise.reject({
          status: 403,
          msg: "Forbidden",
        });
      }

      const isMember = rows.some((row) => row.user_id === userId);

      if (isMember) {
        return rows;
      }

      return db
        .query(`SELECT id FROM productions WHERE id = $1 AND created_by = $2`, [
          production_id,
          userId,
        ])
        .then(({ rows: productionRows }) => {
          if (productionRows.length === 0) {
            return Promise.reject({
              status: 403,
              msg: "Forbidden",
            });
          }
          return rows;
        });
    });
};

exports.createNewCompanyMember = (production_id, userId, newMember) => {
  const { email, role, admin } = newMember;
  let productionTitle;

  return isProductionAdmin(userId, production_id).then((isAdmin) => {
    if (!isAdmin) {
      return Promise.reject({ status: 403, msg: "Forbidden" });
    }

    return db
      .query(`SELECT title FROM productions WHERE id = $1`, [production_id])
      .then(({ rows }) => {
        if (rows.length === 0) {
          return Promise.reject({ status: 404, msg: "Production not found" });
        }
        productionTitle = rows[0].title;
        return db.query(`SELECT id, username FROM users WHERE email = $1`, [
          email,
        ]);
      })
      .then(({ rows }) => {
        if (rows.length > 0) {
          const newUserId = rows[0].id;
          return db
            .query(
              `INSERT INTO company_members (production_id, user_id, role, admin) VALUES ($1, $2, $3, $4) RETURNING *`,
              [production_id, newUserId, role, admin ?? false],
            )
            .then(({ rows: [newCompanyMember] }) => {
              return sendExistingMemberAddedEmail(email, productionTitle).then(
                () => newCompanyMember,
              );
            });
        }

        const username = email.split("@")[0];
        const tempPassword = generateTempPassword();

        return bcrypt.hash(tempPassword, 10).then((hashedPassword) => {
          return db
            .query(
              `INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username`,
              [username, email, hashedPassword],
            )
            .then(({ rows: [newUser] }) => {
              return db
                .query(
                  `INSERT INTO company_members (production_id, user_id, role, admin) VALUES ($1, $2, $3, $4) RETURNING *`,
                  [production_id, newUser.id, role, admin ?? false],
                )
                .then(({ rows: [newCompanyMember] }) => {
                  return sendNewMemberInviteEmail(
                    email,
                    newUser.id,
                    productionTitle,
                  ).then(() => newCompanyMember);
                });
            });
        });
      });
  });
};

exports.removeCompanyMember = (production_id, member_id, userId) => {
  return isProductionAdmin(userId, production_id).then((isAdmin) => {
    if (!isAdmin) {
      return Promise.reject({ status: 403, msg: "Forbidden" });
    }
    return db.query(
      `DELETE FROM company_members WHERE production_id = $1 AND user_id = $2;`,
      [production_id, member_id],
    );
  });
};

exports.updateCompanyMemberAdmin = (
  production_id,
  member_id,
  userId,
  admin,
) => {
  return isProductionAdmin(userId, production_id).then((isAdmin) => {
    if (!isAdmin) {
      return Promise.reject({ status: 403, msg: "Forbidden" });
    }
    return db
      .query(
        `UPDATE company_members SET admin = $1 WHERE production_id = $2 AND user_id = $3 RETURNING *`,
        [admin, production_id, member_id],
      )
      .then(({ rows }) => {
        if (rows.length === 0) {
          return Promise.reject({ status: 404, msg: "Member not found" });
        }
        return rows[0];
      });
  });
};
