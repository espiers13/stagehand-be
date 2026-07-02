const testUsers = [
  {
    username: "sarah_director",
    email: "sarah@stagehand.com",
    password: "Password123!",
  },
  {
    username: "tom_actor",
    email: "tom@stagehand.com",
    password: "Password123!",
  },
  {
    username: "priya_actor",
    email: "priya@stagehand.com",
    password: "Password123!",
  },
  {
    username: "marcus_sm",
    email: "marcus@stagehand.com",
    password: "Password123!",
  },
  {
    username: "jess_actor",
    email: "jess@stagehand.com",
    password: "Password123!",
  },
  {
    username: "reset_test_user",
    email: "reset@stagehand.com",
    password: "Password123!",
    reset_token: "valid-test-token",
    reset_token_expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
  {
    username: "expired_reset_user",
    email: "expired@stagehand.com",
    password: "Password123!",
    reset_token: "expired-test-token",
    reset_token_expires: new Date(Date.now() - 60 * 60 * 1000),
  },
];

module.exports = testUsers;
