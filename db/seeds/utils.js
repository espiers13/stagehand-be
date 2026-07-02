const bcrypt = require("bcrypt");

const saltRounds = process.env.NODE_ENV === "test" ? 1 : 10;

const hashUsersData = async (usersData) => {
  return Promise.all(
    usersData.map(
      async ({
        username,
        email,
        password,
        reset_token,
        reset_token_expires,
      }) => {
        const password_hash = await bcrypt.hash(password, saltRounds);
        return {
          username,
          email,
          password_hash,
          reset_token: reset_token || null,
          reset_token_expires: reset_token_expires || null,
        };
      },
    ),
  );
};

module.exports = hashUsersData;
