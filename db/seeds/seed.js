const db = require("../connection.js");
const format = require("pg-format");
const hashUsersData = require("./utils.js");

const seed = ({
  usersData,
  productionsData,
  companyMembersData,
  rehearsalsData,
  rehearsalAttendanceData,
}) => {
  return db
    .query(`DROP TABLE IF EXISTS rehearsal_attendance;`)
    .then(() => db.query(`DROP TABLE IF EXISTS rehearsals;`))
    .then(() => db.query(`DROP TABLE IF EXISTS company_members;`))
    .then(() => db.query(`DROP TABLE IF EXISTS productions;`))
    .then(() => db.query(`DROP TABLE IF EXISTS users;`))
    .then(() => {
      return db.query(`
        CREATE TABLE users(
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL);`);
    })
    .then(() => {
      return db.query(`
        CREATE TABLE productions(
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        created_by INT REFERENCES users(id) ON DELETE CASCADE,
        venue VARCHAR(255) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL);`);
    })
    .then(() => {
      return db.query(`
        CREATE TABLE company_members(
        id SERIAL PRIMARY KEY,
        production_id INT REFERENCES productions(id) ON DELETE CASCADE,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(255) NOT NULL);`);
    })
    .then(() => {
      return db.query(`
        CREATE TABLE rehearsals(
        id SERIAL PRIMARY KEY,
        production_id INT REFERENCES productions(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        location VARCHAR(255) NOT NULL,
        notes TEXT,
        called INT[] DEFAULT '{}');`);
    })
    .then(() => {
      return db.query(`CREATE TABLE rehearsal_attendance(
  id SERIAL PRIMARY KEY,
  rehearsal_id INT REFERENCES rehearsals(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  confirmed BOOLEAN DEFAULT false,
  UNIQUE(rehearsal_id, user_id));`);
    })
    .then(() => {
      return hashUsersData(usersData);
    })
    .then((hashedUsersData) => {
      const insertUsersString = format(
        "INSERT INTO users (username, email, password_hash) VALUES %L RETURNING *;",
        hashedUsersData.map(({ username, email, password_hash }) => [
          username,
          email,
          password_hash,
        ]),
      );
      return db.query(insertUsersString);
    })
    .then(() => {
      const insertProductionsString = format(
        "INSERT INTO productions (title, created_by, venue, start_date, end_date) VALUES %L RETURNING *;",
        productionsData.map(
          ({ title, created_by, venue, start_date, end_date }) => [
            title,
            created_by,
            venue,
            start_date,
            end_date,
          ],
        ),
      );
      return db.query(insertProductionsString);
    })
    .then(() => {
      const insertCompanyMembersString = format(
        "INSERT INTO company_members (production_id, user_id, role) VALUES %L RETURNING *;",
        companyMembersData.map(({ production_id, user_id, role }) => [
          production_id,
          user_id,
          role,
        ]),
      );
      return db.query(insertCompanyMembersString);
    })
    .then(() => {
      const insertRehearsalsString = format(
        "INSERT INTO rehearsals (production_id, date, start_time, end_time, location, notes, called) VALUES %L RETURNING *;",
        rehearsalsData.map(
          ({
            production_id,
            date,
            start_time,
            end_time,
            location,
            notes,
            called,
          }) => [
            production_id,
            date,
            start_time,
            end_time,
            location,
            notes,
            `{${called.join(",")}}`,
          ],
        ),
      );
      return db.query(insertRehearsalsString);
    })
    .then(() => {
      const insertRehearsalAttendanceString = format(
        "INSERT INTO rehearsal_attendance (rehearsal_id, user_id, confirmed) VALUES %L RETURNING *;",
        rehearsalAttendanceData.map(({ rehearsal_id, user_id, confirmed }) => [
          rehearsal_id,
          user_id,
          confirmed,
        ]),
      );
      return db.query(insertRehearsalAttendanceString);
    });
};

module.exports = seed;
