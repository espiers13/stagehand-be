const db = require("../connection");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const saltRounds = 10;

exports.fetchUserByCredentials = (email, password) => {
  return db
    .query(`SELECT * FROM users WHERE email = $1`, [email])
    .then(({ rows }) => {
      if (rows.length === 0) {
        return Promise.reject({ status: 401, msg: "User not found" });
      }

      const user = rows[0];

      return bcrypt
        .compare(password, user.password_hash)
        .then((isMatch) => {
          if (!isMatch) {
            return Promise.reject({
              status: 401,
              msg: "Invalid password",
            });
          }

          const token = jwt.sign(
            { user_id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "1h" },
          );

          const { password_hash: _, ...userWithoutPassword } = user;

          return { user: userWithoutPassword, token };
        })
        .catch((err) => {
          throw err;
        });
    });
};

exports.createNewUser = (username, email, password) => {
  return bcrypt.hash(password, saltRounds).then((hashedPassword) => {
    const queryString = `INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING *;`;
    const values = [username, email, hashedPassword];

    return db
      .query(queryString, values)
      .then(({ rows }) => {
        const user = rows[0];
        const token = jwt.sign(
          { user_id: user.id, email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: "1h" },
        );
        const { password_hash, ...userWithoutPassword } = user;
        return { user: userWithoutPassword, token };
      })
      .catch((err) => {
        if (err.code === "23505" && err.constraint === "users_email_key") {
          return Promise.reject({
            status: 409,
            msg: "Email already exists",
          });
        }
        if (err.code === "23505" && err.constraint === "users_username_key") {
          return Promise.reject({
            status: 409,
            msg: "Username already exists",
          });
        }
        throw err;
      });
  });
};

exports.fetchUserById = (userId) => {
  return db
    .query(`SELECT id, username, email FROM users WHERE id = $1`, [userId])
    .then(({ rows }) => {
      return rows[0];
    });
};

exports.fetchUserProductions = (userId) => {
  return db
    .query(
      `SELECT DISTINCT productions.title, productions.venue, productions.start_date, productions.end_date, productions.id
       FROM productions
       LEFT JOIN company_members ON company_members.production_id = productions.id
       WHERE productions.created_by = $1
          OR company_members.user_id = $1`,
      [userId],
    )
    .then(({ rows }) => {
      return rows;
    });
};

exports.updateUserPassword = (userId, currentPassword, newPassword) => {
  return db
    .query(`SELECT id, password_hash FROM users WHERE id = $1`, [userId])
    .then(({ rows }) => {
      if (rows.length === 0) {
        return Promise.reject({ status: 401, msg: "User not found" });
      }
      const user = rows[0];
      return bcrypt
        .compare(currentPassword, user.password_hash)
        .then((isMatch) => {
          if (!isMatch) {
            return Promise.reject({ status: 401, msg: "Invalid password" });
          }
          return bcrypt.hash(newPassword, saltRounds).then((hashedPassword) => {
            return db
              .query(
                `UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id, username, email;`,
                [hashedPassword, user.id],
              )
              .then(({ rows }) => rows[0]);
          });
        });
    });
};

exports.removeUser = (userId, currentPassword) => {
  return db
    .query(`SELECT id, password_hash FROM users WHERE id = $1`, [userId])
    .then(({ rows }) => {
      if (rows.length === 0) {
        return Promise.reject({ status: 401, msg: "User not found" });
      }
      const user = rows[0];
      return bcrypt
        .compare(currentPassword, user.password_hash)
        .then((isMatch) => {
          if (!isMatch) {
            return Promise.reject({ status: 401, msg: "Invalid password" });
          }
          return db.query(`DELETE FROM users WHERE id = $1 RETURNING *;`, [
            userId,
          ]);
        });
    });
};

exports.createResetToken = (email) => {
  return db
    .query(`SELECT id FROM users WHERE email = $1`, [email])
    .then(({ rows }) => {
      if (rows.length === 0) {
        return null;
      }

      const userId = rows[0].id;
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      return db
        .query(
          `UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3 RETURNING id`,
          [token, expires, userId],
        )
        .then(() => {
          return { token };
        });
    });
};

exports.resetPasswordWithToken = (token, newPassword) => {
  return db
    .query(`SELECT id, reset_token_expires FROM users WHERE reset_token = $1`, [
      token,
    ])
    .then(({ rows }) => {
      if (rows.length === 0) {
        return Promise.reject({ status: 401, msg: "Invalid or expired token" });
      }

      const user = rows[0];
      const isExpired = new Date(user.reset_token_expires) < new Date();

      if (isExpired) {
        return Promise.reject({ status: 401, msg: "Invalid or expired token" });
      }

      return bcrypt.hash(newPassword, saltRounds).then((hashedPassword) => {
        return db.query(
          `UPDATE users
           SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL
           WHERE id = $2`,
          [hashedPassword, user.id],
        );
      });
    });
};
