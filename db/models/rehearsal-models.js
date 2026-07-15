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
  let rehearsalId;

  return db
    .query(
      `SELECT
  productions.*,
  COALESCE(
    ARRAY_AGG(company_members.user_id) FILTER (WHERE company_members.user_id IS NOT NULL),
    '{}'
  ) AS company_member_ids
FROM productions
LEFT JOIN company_members
  ON company_members.production_id = productions.id
WHERE productions.id = $1 AND productions.created_by = $2
GROUP BY productions.id`,
      [production_id, userId],
    )
    .then(({ rows }) => {
      if (rows.length === 0) {
        return Promise.reject({ status: 403, msg: "Forbidden" });
      }
      productionTitle = rows[0].title;
      const companyMembers = rows[0].company_member_ids;

      if (called.length === 0) {
        companyMembers.forEach((member) => {
          called.push(member);
        });
      } else {
        const allValid = called.every((userId) =>
          companyMembers.includes(userId),
        );

        if (!allValid) {
          return Promise.reject({ status: 400, msg: "Bad request" });
        }
      }

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
          rehearsalId = rows[0].id;
          return rows[0];
        });
    })
    .then((newRehearsal) => {
      if (called.length === 0) return newRehearsal;

      called.forEach((companyMember) => {
        return db.query(
          `
        INSERT INTO rehearsal_attendance (rehearsal_id, user_id, confirmed) VALUES ($1, $2, $3);`,
          [rehearsalId, companyMember, true],
        );
      });

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

exports.fetchCalls = (userId, rehearsalId, productionId) => {
  return db
    .query(`SELECT * FROM productions WHERE id = $1 AND created_by = $2`, [
      productionId,
      userId,
    ])
    .then(({ rows }) => {
      if (rows.length === 0) {
        return Promise.reject({ status: 403, msg: "Forbidden" });
      }

      return db
        .query(
          `SELECT user_id, confirmed FROM rehearsal_attendance WHERE rehearsal_id = $1`,
          [rehearsalId],
        )
        .then(({ rows }) => {
          if (rows.length === 0) {
            return Promise.reject({ status: 403, msg: "Forbidden" });
          }
          return rows;
        });
    });
};

exports.createCall = (userId, rehearsalId, productionId, companyMember) => {
  return db
    .query(`SELECT * FROM productions WHERE id = $1 AND created_by = $2`, [
      productionId,
      userId,
    ])
    .then(({ rows }) => {
      if (rows.length === 0) {
        return Promise.reject({ status: 403, msg: "Forbidden" });
      }

      return db
        .query(`SELECT called FROM rehearsals WHERE id = $1`, [rehearsalId])
        .then(({ rows }) => {
          if (rows.length === 0) {
            return Promise.reject({ status: 403, msg: "Forbidden" });
          }
          const { called } = rows[0];
          called.push(companyMember);

          return db.query(
            `UPDATE rehearsals SET called = $1 WHERE id = $2 RETURNING *;`,
            [called, rehearsalId],
          );
        })
        .then(({ rows }) => {
          return db
            .query(
              `INSERT INTO rehearsal_attendance (user_id, rehearsal_id, confirmed) VALUES ($1, $2, $3) RETURNING *;`,
              [companyMember, rehearsalId, true],
            )
            .then(({ rows }) => {
              return rows[0];
            });
        });
    });
};

exports.removeCall = (userId, rehearsalId, productionId, companyMember) => {
  return db
    .query(`SELECT * FROM productions WHERE id = $1 AND created_by = $2`, [
      productionId,
      userId,
    ])
    .then(({ rows }) => {
      if (rows.length === 0) {
        return Promise.reject({ status: 403, msg: "Forbidden" });
      }

      return db
        .query(`SELECT called FROM rehearsals WHERE id = $1`, [rehearsalId])
        .then(({ rows }) => {
          if (rows.length === 0) {
            return Promise.reject({ status: 403, msg: "Forbidden" });
          }
          const { called } = rows[0];
          const index = called.indexOf(companyMember);
          if (index === -1) {
            return Promise.reject({ status: 404, msg: "Not found" });
          }
          called.splice(index, 1);

          return db
            .query(
              `DELETE FROM rehearsal_attendance WHERE rehearsal_id = $1 AND user_id = $2`,
              [rehearsalId, companyMember],
            )
            .then(() => {
              return db
                .query(
                  `UPDATE rehearsals SET called = $1 WHERE id = $2 RETURNING *;`,
                  [called, rehearsalId],
                )
                .then(({ rows }) => {
                  return rows[0];
                });
            });
        });
    });
};

exports.updateAttendance = (userId, rehearsalId, productionId, confirmed) => {
  return db
    .query(
      `
    UPDATE rehearsal_attendance SET confirmed = $1 WHERE user_id = $2 AND rehearsal_id = $3 RETURNING *;`,
      [confirmed, userId, rehearsalId],
    )
    .then(({ rows }) => {
      if (rows.length === 0) {
        return Promise.reject({ status: 404, msg: "Not found" });
      }
      return rows[0];
    });
};
