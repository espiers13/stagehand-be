const db = require("../connection");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const saltRounds = 10;

exports.fetchProductionData = (production_id) => {
  return db
    .query(`SELECT * FROM productions WHERE id = $1`, [production_id])
    .then(({ rows }) => {
      if (rows.length === 0) {
        return Promise.reject({
          status: 404,
          msg: "Production not found",
        });
      }
      return rows[0];
    });
};

exports.patchProductionData = (newData, production_id, user_id) => {
  const updatedFields = Object.keys(newData);
  const updatedValues = Object.values(newData);

  const setClause = updatedFields
    .map((field, index) => `${field} = $${index + 1}`)
    .join(", ");

  const queryString = `UPDATE productions SET ${setClause} WHERE id = $${
    updatedFields.length + 1
  } AND created_by = $${updatedFields.length + 2} RETURNING *;`;

  return db
    .query(queryString, [...updatedValues, production_id, user_id])
    .then(({ rows }) => {
      if (rows.length === 0) {
        return Promise.reject({
          status: 403,
          msg: "Forbidden",
        });
      }
      return rows[0];
    });
};

exports.removeProduction = (user_id, production_id) => {
  return db
    .query(`SELECT * FROM productions WHERE id = $1 AND created_by = $2`, [
      production_id,
      user_id,
    ])
    .then(({ rows }) => {
      if (rows.length === 0) {
        return Promise.reject({ status: 403, msg: "Forbidden" });
      }
      return db.query(`DELETE FROM productions WHERE id = $1`, [production_id]);
    });
};

exports.createNewProduction = (production, userId) => {
  const { title, venue, production_dates, scenes } = production;

  return db
    .query(
      `INSERT INTO productions (title, venue, production_dates, scenes, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, venue, production_dates, scenes ?? 0, userId],
    )
    .then(({ rows }) => {
      return rows[0];
    });
};
