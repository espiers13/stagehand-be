const db = require("../connection");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const saltRounds = 10;

exports.fetchRehearsalsByProduction = (production_id, userId) => {
  return db
    .query(`SELECT * FROM rehearsals WHERE production_id = ${production_id}`)
    .then(({ rows }) => {
      return rows;
    });
};

exports.createNewRehearsal = (production_id, rehearsalData, userId) => {
  const {
    date,
    start_time,
    end_time,
    location,
    notes = "",
    scenes = [],
    called = [],
  } = rehearsalData;

  return db
    .query(`SELECT * FROM productions WHERE id = $1 AND created_by = $2`, [
      production_id,
      userId,
    ])
    .then(({ rows }) => {
      if (rows.length === 0) {
        return Promise.reject({ status: 403, msg: "Forbidden" });
      }
      return db
        .query(
          `INSERT INTO rehearsals (date, start_time, end_time, location, scenes, notes, called) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;`,
          [date, start_time, end_time, location, scenes, notes, called],
        )
        .then(({ rows }) => {
          return rows[0];
        });
    });
};
