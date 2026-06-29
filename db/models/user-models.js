const db = require("../connection");
const bcrypt = require("bcrypt");
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
