const db = require("../db/connection.js");
const seed = require("../db/seeds/seed");
const testData = require("../db/seeds/data/test-data/index.js");
const request = require("supertest");
const app = require("../app.js");
require("jest-sorted");

beforeEach(() => {
  return seed(testData);
});
afterAll(() => {
  return db.end();
});

// AUTH ROUTES

// LOGIN USER

describe("POST /api/login - Authenticate user", () => {
  test("Status 200: returns user data when correct username and password are given", () => {
    return request(app)
      .post("/api/login")
      .send({ email: "sarah@stagehand.com", password: "Password123!" })
      .expect(200)
      .then(({ body }) => {
        expect(body.user).toMatchObject({
          id: 1,
          username: "sarah_director",
          email: "sarah@stagehand.com",
        });
        expect(body).toHaveProperty("token");
      });
  });

  test("Status 401: Invalid password", () => {
    const credentials = {
      email: "sarah@stagehand.com",
      password: "notthepassword",
    };
    return request(app)
      .post("/api/login")
      .send(credentials)
      .expect(401)
      .then(({ body }) => {
        expect(body.msg).toEqual("Invalid password");
      });
  });

  test("Status 401: User doesn't exist", () => {
    const credentials = {
      username: "notauser",
      password: "notthepassword",
    };
    return request(app)
      .post("/api/login")
      .send(credentials)
      .expect(401)
      .then(({ body }) => {
        expect(body.msg).toEqual("User not found");
      });
  });
});

// CREATE NEW USER

describe("POST /api/register - Create new user", () => {
  test("Status 201: returns new user data when valid details are given", () => {
    return request(app)
      .post("/api/register")
      .send({
        email: "newuser@stagehand.com",
        username: "new_user",
        password: "Password123!",
      })
      .expect(201)
      .then(({ body }) => {
        expect(body.user).toMatchObject({
          id: expect.any(Number),
          username: "new_user",
          email: "newuser@stagehand.com",
        });
        expect(body.user).not.toHaveProperty("password_hash");
        expect(body).toHaveProperty("token");
      });
  });

  test("Status 409: email already in use", () => {
    return request(app)
      .post("/api/register")
      .send({
        email: "sarah@stagehand.com",
        username: "sarah_duplicate",
        password: "Password123!",
      })
      .expect(409)
      .then(({ body }) => {
        expect(body.msg).toEqual("Email already exists");
      });
  });

  test("Status 409: username already in use", () => {
    return request(app)
      .post("/api/register")
      .send({
        email: "different@stagehand.com",
        username: "sarah_director",
        password: "Password123!",
      })
      .expect(409)
      .then(({ body }) => {
        expect(body.msg).toEqual("Username already exists");
      });
  });
});

// PRODUCTION ROUTES

// GET ALL PRODUCTIONS

// POST NEW PRODUCTION

// GET PRODUCTION BY ID

// PATCH PRODUCTION BY ID - EDIT TITLE, DATES, COMPANY MEMBERS, VENUE

// DELETE PRODUCTION BY ID

// COMPANY MEMBER ROUTES

// GET ALL COMPANY MEMBERS BY PRODUCTION ID

// POST NEW COMPANY MEMBER TO PRODUCTION BY EMAIL

// DELETE COMPANY MEMBER BY ID

// REHEARSAL ROUTES

// GET ALL REHEARSALS BY PRODUCTION ID

// POST NEW REHEARSAL TO PRODUCTION BY ID

// PATCH REHEARSAL BY ID - EDIT DATE, TIME, LOCATION, NOTES

// GET ALL REHEARSALS BY USER_ID

// DELETE A REHEARSAL BY ID

// CALL ROUTES

// GET ALL CALLS BY REHEARSAL ID

// POST NEW USER TO REHEARSAL BY ID

// DELETE USER FROM REHEARSAL BY ID

// PATCH - CONFIRM OR UNCONFIRM USER ATTENDANCE BY REHEARSAL ID AND USER ID
