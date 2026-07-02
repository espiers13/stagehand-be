const db = require("../db/connection.js");
const seed = require("../db/seeds/seed");
const testData = require("../db/seeds/data/test-data/index.js");
const request = require("supertest");
const app = require("../app.js");
require("jest-sorted");
const jwt = require("jsonwebtoken");

jest.mock("../db/utils/mailer.js", () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(),
}));

beforeEach(() => {
  sendPasswordResetEmail.mockClear();
});

const { sendPasswordResetEmail } = require("../db/utils/mailer.js");

beforeEach(() => {
  return seed(testData);
});
afterAll(() => {
  return db.end();
});

// AUTH ROUTES

// LOGIN USER

describe("POST /api/login", () => {
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

describe("POST /api/register", () => {
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

// GET LOGGED IN USER INFO

describe("GET /api/user", () => {
  test("200: responds with the logged-in user's data", () => {
    const token = jwt.sign(
      { user_id: 1, username: "sarah_director" },
      process.env.JWT_SECRET,
    );

    return request(app)
      .get("/api/user")
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .then(({ body }) => {
        expect(body.user).toMatchObject({
          email: "sarah@stagehand.com",
          id: 1,
          username: "sarah_director",
        });
        expect(body.user).not.toHaveProperty("password");
      });
  });

  test("401: no token provided", () => {
    return request(app)
      .get("/api/user")
      .expect(401)
      .then(({ body }) => {
        expect(body.msg).toBe("No token provided");
      });
  });

  test("401: invalid token", () => {
    return request(app)
      .get("/api/user")
      .set("Authorization", "Bearer not.a.valid.token")
      .expect(401)
      .then(({ body }) => {
        expect(body.msg).toBe("Invalid or expired token");
      });
  });

  test("401: expired token", () => {
    const expiredToken = jwt.sign(
      { user_id: 1, username: "sarah_director" },
      process.env.JWT_SECRET,
      { expiresIn: -10 },
    );

    return request(app)
      .get("/api/user")
      .set("Authorization", `Bearer ${expiredToken}`)
      .expect(401);
  });
});

// GET PRODUCTIONS BY USER_ID

describe("GET /api/user/productions", () => {
  test("Status 200: responds with array of objects of productions user has created", () => {
    const token = jwt.sign(
      { user_id: 1, username: "sarah_director" },
      process.env.JWT_SECRET,
    );

    return request(app)
      .get("/api/user/productions")
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .then(({ body }) => {
        expect(body).toMatchObject([
          {
            title: "A Midsummer Night's Dream",
            venue: "The Lowry Studio, Salford",
            start_date: "2026-08-31T23:00:00.000Z",
            end_date: "2026-09-13T23:00:00.000Z",
          },
        ]);
      });
  });

  test("Status 200: responds with an array of productions user is linked to", () => {
    const token = jwt.sign(
      { user_id: 3, username: "priya_actor" },
      process.env.JWT_SECRET,
    );
    return request(app)
      .get("/api/user/productions")
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .then(({ body }) => {
        expect(body).toMatchObject([
          {
            title: "A Midsummer Night's Dream",
            venue: "The Lowry Studio, Salford",
            start_date: "2026-08-31T23:00:00.000Z",
            end_date: "2026-09-13T23:00:00.000Z",
          },
        ]);
      });
  });
});

// CHANGE PASSWORD WHEN LOGGED IN

describe("PATCH /api/user/password", () => {
  test("status 200: successfully updates password when current password is correct", () => {
    const token = jwt.sign(
      { user_id: 1, username: "sarah_director" },
      process.env.JWT_SECRET,
    );

    return request(app)
      .patch("/api/user/password")
      .send({
        currentPassword: "Password123!",
        newPassword: "newSecurePassword456",
      })
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .then(({ body }) => {
        expect(body.msg).toBe("Password updated successfully");
      });
  });

  test("status 401: rejects when current password is incorrect", () => {
    const token = jwt.sign(
      { user_id: 1, username: "sarah_director" },
      process.env.JWT_SECRET,
    );

    return request(app)
      .patch("/api/user/password")
      .send({
        currentPassword: "wrongPassword",
        newPassword: "newSecurePassword456",
      })
      .set("Authorization", `Bearer ${token}`)
      .expect(401)
      .then(({ body }) => {
        expect(body.msg).toBe("Invalid password");
      });
  });

  test("status 401: no token provided", () => {
    return request(app)
      .patch("/api/user/password")
      .send({
        currentPassword: "Password123!",
        newPassword: "newSecurePassword456",
      })
      .expect(401);
  });

  test("status 400: missing newPassword in request body", () => {
    const token = jwt.sign(
      { user_id: 1, username: "sarah_director" },
      process.env.JWT_SECRET,
    );

    return request(app)
      .patch("/api/user/password")
      .send({
        currentPassword: "Password123!",
      })
      .set("Authorization", `Bearer ${token}`)
      .expect(400)
      .then(({ body }) => {
        expect(body.msg).toBe("Missing required fields");
      });
  });

  test("only updates the requesting user's own password, scoped via token not body", () => {
    const token = jwt.sign(
      { user_id: 1, username: "sarah_director" },
      process.env.JWT_SECRET,
    );

    return request(app)
      .patch("/api/user/password")
      .send({
        currentPassword: "Password123!",
        newPassword: "newSecurePassword456",
        user_id: 2,
      })
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .then(({ body }) => {
        expect(body.msg).toBe("Password updated successfully");
      });
  });
});

// DELETE USER
describe("DELETE /api/user", () => {
  test("status 204: successfully deletes the logged-in user's account", () => {
    const token = jwt.sign(
      { user_id: 1, username: "sarah_director" },
      process.env.JWT_SECRET,
    );

    return request(app)
      .delete("/api/user")
      .send({ currentPassword: "Password123!" })
      .set("Authorization", `Bearer ${token}`)
      .expect(204);
  });

  test("status 401: rejects when current password is incorrect", () => {
    const token = jwt.sign(
      { user_id: 1, username: "sarah_director" },
      process.env.JWT_SECRET,
    );

    return request(app)
      .delete("/api/user")
      .send({ currentPassword: "wrongPassword" })
      .set("Authorization", `Bearer ${token}`)
      .expect(401)
      .then(({ body }) => {
        expect(body.msg).toBe("Invalid password");
      });
  });

  test("status 401: no token provided", () => {
    return request(app)
      .delete("/api/user")
      .send({ currentPassword: "Password123!" })
      .expect(401);
  });

  test("status 400: missing currentPassword in request body", () => {
    const token = jwt.sign(
      { user_id: 1, username: "sarah_director" },
      process.env.JWT_SECRET,
    );

    return request(app)
      .delete("/api/user")
      .send({})
      .set("Authorization", `Bearer ${token}`)
      .expect(400)
      .then(({ body }) => {
        expect(body.msg).toBe("Missing required fields");
      });
  });

  test("only deletes the requesting user's own account, scoped via token not body", () => {
    const token = jwt.sign(
      { user_id: 1, username: "sarah_director" },
      process.env.JWT_SECRET,
    );

    return request(app)
      .delete("/api/user")
      .send({ currentPassword: "Password123!", user_id: 2 })
      .set("Authorization", `Bearer ${token}`)
      .expect(204);
  });
});

// FORGOT PASSWORD
describe("POST /api/forgot-password", () => {
  test("status 200: sends a reset email when the email exists", () => {
    return request(app)
      .post("/api/forgot-password")
      .send({ email: "sarah@stagehand.com" })
      .expect(200)
      .then(({ body }) => {
        expect(body.msg).toBe("Password reset email sent");
        expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
      });
  });

  test("status 200: responds the same way even when the email doesn't exist (no user enumeration)", () => {
    return request(app)
      .post("/api/forgot-password")
      .send({ email: "doesnotexist@stagehand.com" })
      .expect(200)
      .then(({ body }) => {
        expect(body.msg).toBe("Password reset email sent");
        expect(sendPasswordResetEmail).not.toHaveBeenCalled();
      });
  });

  test("status 400: missing email in request body", () => {
    return request(app)
      .post("/api/forgot-password")
      .send({})
      .expect(400)
      .then(({ body }) => {
        expect(body.msg).toBe("Missing required fields");
      });
  });
});

// RESET PASSWORD
describe("POST /api/reset-password", () => {
  test("200: resets the password when token is valid and unexpired", () => {
    return request(app)
      .post("/api/reset-password")
      .send({ token: "valid-test-token", newPassword: "newSecurePassword456" })
      .expect(200)
      .then(({ body }) => {
        expect(body.msg).toBe("Password reset successfully");
      });
  });

  test("status 401: rejects an invalid token", () => {
    return request(app)
      .post("/api/reset-password")
      .send({ token: "not-a-real-token", newPassword: "newSecurePassword456" })
      .expect(401)
      .then(({ body }) => {
        expect(body.msg).toBe("Invalid or expired token");
      });
  });

  test("status 401: rejects an expired token", () => {
    return request(app)
      .post("/api/reset-password")
      .send({
        token: "expired-test-token",
        newPassword: "newSecurePassword456",
      })
      .expect(401)
      .then(({ body }) => {
        expect(body.msg).toBe("Invalid or expired token");
      });
  });

  test("status 400: missing newPassword in request body", () => {
    return request(app)
      .post("/api/reset-password")
      .send({ token: "valid-test-token" })
      .expect(400)
      .then(({ body }) => {
        expect(body.msg).toBe("Missing required fields");
      });
  });

  test("token cannot be reused after a successful reset", () => {
    return request(app)
      .post("/api/reset-password")
      .send({ token: "valid-test-token", newPassword: "newSecurePassword456" })
      .expect(200)
      .then(() => {
        return request(app)
          .post("/api/reset-password")
          .send({
            token: "valid-test-token",
            newPassword: "anotherPassword789",
          })
          .expect(401);
      });
  });
});

// PRODUCTION ROUTES

// POST NEW PRODUCTION

describe("POST /api/productions", () => {
  test("Status 201: returns new production data", () => {
    const token = jwt.sign(
      { user_id: 1, username: "sarah_director" },
      process.env.JWT_SECRET,
    );

    const newProduction = {
      title: "Nuns of Fury",
      venue: "Edinburgh Fringe",
      start_date: "2026-08-01",
      end_date: "2026-08-24",
    };

    return request(app)
      .post("/api/productions")
      .send(newProduction)
      .set("Authorization", `Bearer ${token}`)
      .expect(201)
      .then(({ body }) => {
        expect(body).toMatchObject({
          id: 2,
          title: "Nuns of Fury",
          created_by: 1,
          venue: "Edinburgh Fringe",
          start_date: "2026-07-31T23:00:00.000Z",
          end_date: "2026-08-23T23:00:00.000Z",
        });
      });
  });
});

// GET PRODUCTION BY ID

describe("GET /api/productions/:production_id", () => {
  test("Status 200: returns a production object matching the id passed through", () => {
    const token = jwt.sign(
      { user_id: 1, username: "sarah_director" },
      process.env.JWT_SECRET,
    );

    return request(app)
      .get("/api/productions/1")
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .then(({ body }) => {
        expect(body).toMatchObject({
          id: 1,
          title: "A Midsummer Night's Dream",
        });
      });
  });

  test("Status 200: returns production when user is a company member but not the creator", () => {
    const token = jwt.sign(
      { user_id: 2, username: "tom_actor" },
      process.env.JWT_SECRET,
    );

    return request(app)
      .get("/api/productions/1")
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .then(({ body }) => {
        expect(body).toMatchObject({
          id: 1,
          title: "A Midsummer Night's Dream",
        });
      });
  });

  test("Status 400: returns appropriate error when id is not a number", () => {
    const token = jwt.sign(
      { user_id: 1, username: "sarah_director" },
      process.env.JWT_SECRET,
    );

    return request(app)
      .get("/api/productions/notanumber")
      .set("Authorization", `Bearer ${token}`)
      .expect(400)
      .then(({ body }) => {
        expect(body.msg).toBe("Bad request");
      });
  });

  test("Status 401: no token provided", () => {
    return request(app)
      .get("/api/productions/1")
      .expect(401)
      .then(({ body }) => {
        expect(body.msg).toBe("No token provided");
      });
  });

  test("Status 403: user is not a member of the production", () => {
    const token = jwt.sign(
      { user_id: 99, username: "uninvited_user" },
      process.env.JWT_SECRET,
    );

    return request(app)
      .get("/api/productions/1")
      .set("Authorization", `Bearer ${token}`)
      .expect(403)
      .then(({ body }) => {
        expect(body.msg).toBe("Forbidden");
      });
  });
});

// PATCH PRODUCTION BY ID - EDIT TITLE, DATES, COMPANY MEMBERS, VENUE

describe("PATCH /api/productions/:production_id", () => {
  test("Status 200: successfully updates venue when creator makes edits", () => {
    const token = jwt.sign(
      { user_id: 1, username: "sarah_director" },
      process.env.JWT_SECRET,
    );

    return request(app)
      .patch("/api/productions/1")
      .send({ venue: "53Two" })
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .then(({ body }) => {
        expect(body).toMatchObject({
          id: 1,
          venue: "53Two",
        });
      });
  });

  test("Status 200: successfully updates title", () => {
    const token = jwt.sign(
      { user_id: 1, username: "sarah_director" },
      process.env.JWT_SECRET,
    );

    return request(app)
      .patch("/api/productions/1")
      .send({ title: "A Midsummer Night's Dream - Revised" })
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .then(({ body }) => {
        expect(body).toMatchObject({
          id: 1,
          title: "A Midsummer Night's Dream - Revised",
        });
      });
  });

  test("Status 200: successfully updates dates", () => {
    const token = jwt.sign(
      { user_id: 1, username: "sarah_director" },
      process.env.JWT_SECRET,
    );

    return request(app)
      .patch("/api/productions/1")
      .send({ start_date: "2026-10-01", end_date: "2026-10-14" })
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .then(({ body }) => {
        expect(body).toMatchObject({
          id: 1,
          start_date: "2026-10-01",
          end_date: "2026-10-14",
        });
      });
  });

  test("Status 200: successfully updates multiple fields at once", () => {
    const token = jwt.sign(
      { user_id: 1, username: "sarah_director" },
      process.env.JWT_SECRET,
    );

    return request(app)
      .patch("/api/productions/1")
      .send({ venue: "53Two", title: "Nuns of Fury" })
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .then(({ body }) => {
        expect(body).toMatchObject({
          id: 1,
          venue: "53Two",
          title: "Nuns of Fury",
        });
      });
  });

  test("Status 403: company member who is not the creator cannot edit", () => {
    const token = jwt.sign(
      { user_id: 2, username: "tom_actor" },
      process.env.JWT_SECRET,
    );

    return request(app)
      .patch("/api/productions/1")
      .send({ venue: "53Two" })
      .set("Authorization", `Bearer ${token}`)
      .expect(403)
      .then(({ body }) => {
        expect(body.msg).toBe("Forbidden");
      });
  });

  test("Status 403: user with no connection to the production cannot edit", () => {
    const token = jwt.sign(
      { user_id: 99, username: "uninvited_user" },
      process.env.JWT_SECRET,
    );

    return request(app)
      .patch("/api/productions/1")
      .send({ venue: "53Two" })
      .set("Authorization", `Bearer ${token}`)
      .expect(403)
      .then(({ body }) => {
        expect(body.msg).toBe("Forbidden");
      });
  });

  test("Status 400: no valid fields provided in request body", () => {
    const token = jwt.sign(
      { user_id: 1, username: "sarah_director" },
      process.env.JWT_SECRET,
    );

    return request(app)
      .patch("/api/productions/1")
      .send({})
      .set("Authorization", `Bearer ${token}`)
      .expect(400)
      .then(({ body }) => {
        expect(body.msg).toBe("Missing required fields");
      });
  });

  test("Status 400: invalid production_id", () => {
    const token = jwt.sign(
      { user_id: 1, username: "sarah_director" },
      process.env.JWT_SECRET,
    );

    return request(app)
      .patch("/api/productions/notanumber")
      .send({ venue: "53Two" })
      .set("Authorization", `Bearer ${token}`)
      .expect(400)
      .then(({ body }) => {
        expect(body.msg).toBe("Bad request");
      });
  });

  test("Status 401: no token provided", () => {
    return request(app)
      .patch("/api/productions/1")
      .send({ venue: "53Two" })
      .expect(401)
      .then(({ body }) => {
        expect(body.msg).toBe("No token provided");
      });
  });
});

// DELETE PRODUCTION BY ID

describe("DELETE /api/productions/:production_id", () => {
  test("status 204: successfully deletes production when creator is logged in", () => {
    const token = jwt.sign(
      { user_id: 1, username: "sarah_director" },
      process.env.JWT_SECRET,
    );

    return request(app)
      .delete("/api/productions/1")
      .set("Authorization", `Bearer ${token}`)
      .expect(204);
  });

  test("status 403: company member who is not creator cannot delete", () => {
    const token = jwt.sign(
      { user_id: 2, username: "tom_actor" },
      process.env.JWT_SECRET,
    );

    return request(app)
      .delete("/api/productions/1")
      .set("Authorization", `Bearer ${token}`)
      .expect(403)
      .then(({ body }) => {
        expect(body.msg).toBe("Forbidden");
      });
  });

  test("status 401: no token provided", () => {
    return request(app).delete("/api/productions/1").expect(401);
  });

  test("status 400: invalid production_id", () => {
    const token = jwt.sign(
      { user_id: 1, username: "sarah_director" },
      process.env.JWT_SECRET,
    );

    return request(app)
      .delete("/api/productions/notanumber")
      .set("Authorization", `Bearer ${token}`)
      .expect(400)
      .then(({ body }) => {
        expect(body.msg).toBe("Bad request");
      });
  });
});

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
