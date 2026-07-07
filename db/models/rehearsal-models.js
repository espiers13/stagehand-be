const db = require("../connection");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { sendRehearsalNotificationEmail } = require("../utils/mailer.js");

const saltRounds = 10;

exports.fetchRehearsalsByProduction = (production_id, userId) => {
  return db
    .query(`SELECT * FROM rehearsals WHERE production_id = $1`, [production_id])
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

  let productionTitle;

  return db
    .query(`SELECT * FROM productions WHERE id = $1 AND created_by = $2`, [
      production_id,
      userId,
    ])
    .then(({ rows }) => {
      if (rows.length === 0) {
        return Promise.reject({ status: 403, msg: "Forbidden" });
      }
      productionTitle = rows[0].title;

      return db
        .query(
          `INSERT INTO rehearsals (production_id, date, start_time, end_time, location, scenes, notes, called) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;`,
          [
            production_id,
            date,
            start_time,
            end_time,
            location,
            scenes,
            notes,
            called,
          ],
        )
        .then(({ rows }) => {
          return rows[0];
        });
    })
    .then((newRehearsal) => {
      if (called.length === 0) return newRehearsal;

      return db
        .query(`SELECT email FROM users WHERE id = ANY($1)`, [called])
        .then(({ rows }) => {
          const emails = rows.map((row) => row.email);
          return sendRehearsalNotificationEmail(
            emails,
            newRehearsal,
            productionTitle,
            "added",
          ).then(() => newRehearsal);
        });
    });
};

exports.updateRehearsal = (rehearsal_id, production_id, userId, newData) => {
  const updatedFields = Object.keys(newData);
  const updatedValues = Object.values(newData);

  const setClause = updatedFields
    .map((field, index) => `${field} = $${index + 1}`)
    .join(", ");

  const queryString = `UPDATE rehearsals SET ${setClause} WHERE id = $${updatedFields.length + 1} AND production_id = $${updatedFields.length + 2} RETURNING *;`;

  let productionTitle;

  return db
    .query(`SELECT * FROM productions WHERE id = $1 AND created_by = $2`, [
      production_id,
      userId,
    ])
    .then(({ rows }) => {
      if (rows.length === 0) {
        return Promise.reject({ status: 403, msg: "Forbidden" });
      }
      productionTitle = rows[0].title;

      return db
        .query(queryString, [...updatedValues, rehearsal_id, production_id])
        .then(({ rows }) => {
          if (rows.length === 0) {
            return Promise.reject({ status: 403, msg: "Forbidden" });
          }
          return rows[0];
        });
    })
    .then((updatedRehearsal) => {
      const called = updatedRehearsal.called;
      if (called.length === 0) return updatedRehearsal;

      return db
        .query(`SELECT email FROM users WHERE id = ANY($1)`, [called])
        .then(({ rows }) => {
          const emails = rows.map((row) => row.email);
          return sendRehearsalNotificationEmail(
            emails,
            updatedRehearsal,
            productionTitle,
            "updated",
          ).then(() => updatedRehearsal);
        });
    });
};

exports.removeRehearsal = (production_id, rehearsal_id, userId) => {
  return db
    .query(`SELECT * FROM productions WHERE id = $1 AND created_by = $2`, [
      production_id,
      userId,
    ])
    .then(({ rows }) => {
      if (rows.length === 0) {
        return Promise.reject({ status: 403, msg: "Forbidden" });
      }
      return db.query(
        `DELETE FROM rehearsals WHERE production_id = $1 AND id = $2;`,
        [production_id, rehearsal_id],
      );
    });
};

exports.fetchSchedule = (userId) => {
  return db
    .query(
      `SELECT rehearsals.*, productions.title
       FROM rehearsals
       JOIN productions ON productions.id = rehearsals.production_id
       WHERE $1 = ANY(rehearsals.called);`,
      [userId],
    )
    .then(({ rows }) => {
      return rows;
    });
};
