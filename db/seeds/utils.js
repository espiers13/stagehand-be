const bcrypt = require("bcrypt");

const saltRounds = process.env.NODE_ENV === "test" ? 1 : 10;

const hashUsersData = async (usersData) => {
  return Promise.all(
    usersData.map(async ({ username, email, password }) => {
      const password_hash = await bcrypt.hash(password, saltRounds);
      return { username, email, password_hash };
    }),
  );
};

module.exports = hashUsersData;
