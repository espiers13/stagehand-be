const bcrypt = require("bcrypt");

const saltRounds = process.env.NODE_ENV === "test" ? 1 : 10;

const hashUsersData = async (usersData) => {
  return Promise.all(
    usersData.map(async ({ name, username, email, password }) => {
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      return [name, username, email, hashedPassword];
    }),
  );
};

module.exports = hashUsersData;
