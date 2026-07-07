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

  const queryString = `UPDATE productions SET ${setClause} WHERE id = ${production_id} AND created_by = ${user_id} RETURNING id, title, created_by, venue, 
 TO_CHAR(start_date, 'YYYY-MM-DD') as start_date,
 TO_CHAR(end_date, 'YYYY-MM-DD') as end_date;`;

  return db.query(queryString, updatedValues).then(({ rows }) => {
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
  const { title, venue, start_date, end_date } = production;

  return db
    .query(
      `
    INSERT INTO productions (title, venue, start_date, end_date, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, venue, start_date, end_date, userId],
    )
    .then(({ rows }) => {
      return rows[0];
    });
};
