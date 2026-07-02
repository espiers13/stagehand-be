const { Pool } = require("pg");

const ENV = process.env.NODE_ENV || "development";
require("dotenv").config({
  path: `${__dirname}/../.env.${ENV}`,
});

const config = {};

if (process.env.DATABASE_URL) {
  config.connectionString = process.env.DATABASE_URL;
  config.ssl = { rejectUnauthorized: false };
} else {
  config.database = process.env.PGDATABASE;
}

if (!config.database && !config.connectionString) {
  throw new Error("PGDATABASE or DATABASE_URL not set");
}

module.exports = new Pool(config);
