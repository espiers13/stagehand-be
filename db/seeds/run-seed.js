const data = require("../data/dev-data/index.js");
const seed = require("./seed.js");
const db = require("../index.js");

const runSeed = () => {
  return seed(data).then(() => db.end());
};

runSeed();
