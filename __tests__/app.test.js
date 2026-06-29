const db = require("../db/index");
const seed = require("../db/seeds/seed");
const testData = require("../db/data/test-data/index.js");
const request = require("supertest");
const app = require("../app.js");
require("jest-sorted");

jest.mock("../utils/mailer", () => ({
  messages: {
    create: jest.fn().mockResolvedValue({ id: "test-id", message: "Queued" }),
  },
}));

beforeEach(() => {
  return seed(testData);
});
afterAll(() => {
  return db.end();
});
