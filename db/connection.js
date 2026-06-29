const { Pool } = require("pg");
require("dotenv").config();

const config = {};

if (process.env.DATABASE_URL) {
  config.connectionString = process.env.DATABASE_URL;
  config.ssl = { rejectUnauthorized: false };
} else {
  config.database = process.env.PGDATABASE;
}

module.exports = new Pool(config);
