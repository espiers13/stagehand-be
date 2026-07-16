const db = require("../db/connection.js");
const seed = require("../db/seeds/seed");
const testData = require("../db/seeds/data/test-data/index.js");
const request = require("supertest");
const app = require("../app.js");
require("jest-sorted");
const jwt = require("jsonwebtoken");

jest.mock("../db/utils/mailer.js", () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(),
  sendExistingMemberAddedEmail: jest.fn().mockResolvedValue(),
  sendNewMemberInviteEmail: jest.fn().mockResolvedValue(),
  sendRehearsalNotificationEmail: jest.fn().mockResolvedValue(),
}));

const {
  sendPasswordResetEmail,
  sendExistingMemberAddedEmail,
  sendNewMemberInviteEmail,
  sendRehearsalNotificationEmail,
} = require("../db/utils/mailer.js");

beforeEach(() => {
  sendPasswordResetEmail.mockClear();
});

beforeEach(() => {
  jest.clearAllMocks();
});

beforeEach(() => {
  return seed(testData);
});
afterAll(() => {
  return db.end();
});

// AUTH ROUTES

describe("AUTH USER ROUTES", () => {
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

  // GET USERNAME BY ID

  describe("GET /api/username/:id", () => {
    test("200: responds with the username for a valid user id", () => {
      return request(app)
        .get("/api/username/1")
        .expect(200)
        .then(({ body }) => {
          expect(body).toHaveProperty("username");
          expect(typeof body.username).toBe("string");
        });
    });

    test("404: responds with an error when the id does not exist", () => {
      return request(app)
        .get("/api/username/999")
        .expect(404)
        .then(({ body }) => {
          expect(body.msg).toBe("User not found");
        });
    });

    test("400: responds with an error when the id is not a valid number", () => {
      return request(app)
        .get("/api/username/notanid")
        .expect(400)
        .then(({ body }) => {
          expect(body.msg).toBe("Bad request");
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
        .send({
          token: "valid-test-token",
          newPassword: "newSecurePassword456",
        })
        .expect(200)
        .then(({ body }) => {
          expect(body.msg).toBe("Password reset successfully");
        });
    });

    test("status 401: rejects an invalid token", () => {
      return request(app)
        .post("/api/reset-password")
        .send({
          token: "not-a-real-token",
          newPassword: "newSecurePassword456",
        })
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
        .send({
          token: "valid-test-token",
          newPassword: "newSecurePassword456",
        })
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
});

// PRODUCTION ROUTES

describe("PRODUCTION ROUTES", () => {
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
        production_dates: [
          "2026-08-01",
          "2026-08-02",
          "2026-08-03",
          "2026-08-04",
        ],
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
            production_dates: expect.any(Array),
          });
          expect(body.production_dates).toHaveLength(4);
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
              production_dates: expect.any(Array),
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
              production_dates: expect.any(Array),
            },
          ]);
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

    test("Status 200: successfully updates production_dates", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .patch("/api/productions/1")
        .send({
          production_dates: ["2026-10-01", "2026-10-02", "2026-10-03"],
        })
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
        .then(({ body }) => {
          expect(body).toMatchObject({
            id: 1,
            production_dates: expect.any(Array),
          });
          expect(body.production_dates).toHaveLength(3);
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
});

// COMPANY MEMBER ROUTES

describe("COMPANY MEMBER ROUTES", () => {
  // GET ALL COMPANY MEMBERS BY PRODUCTION ID

  describe("GET /api/productions/:production_id/members", () => {
    test("Status 200: Returns an array of member ids and role when passed through a production ID", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .get("/api/productions/1/members")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
        .then(({ body }) => {
          expect(Array.isArray(body)).toBe(true);
          expect(body.length).toBeGreaterThan(0);
          body.forEach((member) => {
            expect(member).toMatchObject({
              user_id: expect.any(Number),
              username: expect.any(String),
              role: expect.any(String),
            });
          });
        });
    });

    test("Status 200: A company member (not just the creator) can also view the members list", () => {
      const token = jwt.sign(
        { user_id: 2, username: "tom_actor" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .get("/api/productions/1/members")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
        .then(({ body }) => {
          expect(body.length).toBeGreaterThan(0);
        });
    });

    test("Status 401: No token provided", () => {
      return request(app)
        .get("/api/productions/1/members")
        .expect(401)
        .then(({ body }) => {
          expect(body.msg).toEqual("No token provided");
        });
    });

    test("Status 401: Invalid/malformed token", () => {
      return request(app)
        .get("/api/productions/1/members")
        .set("Authorization", `Bearer not-a-real-token`)
        .expect(401);
    });

    test("Status 403: User is not a member of the production and did not create it", () => {
      const token = jwt.sign(
        { user_id: 99, username: "outsider" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .get("/api/productions/1/members")
        .set("Authorization", `Bearer ${token}`)
        .expect(403)
        .then(({ body }) => {
          expect(body.msg).toEqual("Forbidden");
        });
    });
  });

  // POST NEW COMPANY MEMBER TO PRODUCTION BY EMAIL
  describe("POST /api/productions/:production_id/members", () => {
    test("Status 201: Creates a new user and adds them as a company member when the email doesn't match an existing user", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );

      const newMember = {
        email: "newmember@rehearsal.com",
        role: "Actor",
      };

      return request(app)
        .post("/api/productions/1/members")
        .send(newMember)
        .set("Authorization", `Bearer ${token}`)
        .expect(201)
        .then(({ body }) => {
          expect(body).toMatchObject({
            production_id: 1,
            user_id: 8,
            role: "Actor",
          });
        });
    });

    test("Status 201: Adds an existing user as a company member when the email matches an existing user", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );

      const existingMember = {
        email: "jess@stagehand.com",
        role: "Actor",
      };

      return request(app)
        .post("/api/productions/1/members")
        .send(existingMember)
        .set("Authorization", `Bearer ${token}`)
        .expect(201)
        .then(({ body }) => {
          expect(body).toMatchObject({
            production_id: 1,
            user_id: 5,
            role: "Actor",
          });
        });
    });

    test("Status 403: Only the production creator can add a new company member", () => {
      const token = jwt.sign(
        { user_id: 2, username: "cast_member_two" },
        process.env.JWT_SECRET,
      );

      const newMember = {
        email: "newmember@rehearsal.com",
        role: "Actor",
      };

      return request(app)
        .post("/api/productions/1/members")
        .send(newMember)
        .set("Authorization", `Bearer ${token}`)
        .expect(403)
        .then(({ body }) => {
          expect(body.msg).toEqual("Forbidden");
        });
    });
  });

  // DELETE COMPANY MEMBER BY ID
  describe("DELETE /api/productions/:production_id/:member_id", () => {
    test("status 204: successfully deletes company_member from the production", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .delete("/api/productions/1/2")
        .set("Authorization", `Bearer ${token}`)
        .expect(204);
    });

    test("status 401: no token provided", () => {
      return request(app)
        .delete("/api/productions/1/2")
        .expect(401)
        .then(({ body }) => {
          expect(body.msg).toEqual("No token provided");
        });
    });

    test("status 403: only the production creator can delete a company member", () => {
      const token = jwt.sign(
        { user_id: 3, username: "cast_member_three" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .delete("/api/productions/1/2")
        .set("Authorization", `Bearer ${token}`)
        .expect(403)
        .then(({ body }) => {
          expect(body.msg).toEqual("Forbidden");
        });
    });
  });

  // PATCH ADMIN ON COMPANY MEMBERS

  describe.only("PATCH /api/productions/:production_id/members/:member_id/admin", () => {
    test("status 200: successfully makes a company member an admin", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .patch("/api/productions/1/members/2/admin")
        .send({ admin: true })
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
        .then(({ body }) => {
          expect(body).toMatchObject({
            production_id: 1,
            user_id: 2,
            admin: true,
          });
        });
    });

    test("status 200: successfully removes admin status from a company member", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .patch("/api/productions/1/members/4/admin")
        .send({ admin: false })
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
        .then(({ body }) => {
          expect(body).toMatchObject({
            production_id: 1,
            user_id: 4,
            admin: false,
          });
        });
    });

    test("status 401: no token provided", () => {
      return request(app)
        .patch("/api/productions/1/members/2/admin")
        .send({ admin: true })
        .expect(401)
        .then(({ body }) => {
          expect(body.msg).toEqual("No token provided");
        });
    });

    test("status 403: only an existing admin can update another member's admin status", () => {
      const token = jwt.sign(
        { user_id: 3, username: "cast_member_three" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .patch("/api/productions/1/members/2/admin")
        .send({ admin: true })
        .set("Authorization", `Bearer ${token}`)
        .expect(403)
        .then(({ body }) => {
          expect(body.msg).toEqual("Forbidden");
        });
    });

    test("status 400: admin is not a boolean", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .patch("/api/productions/1/members/2/admin")
        .send({ admin: "yes" })
        .set("Authorization", `Bearer ${token}`)
        .expect(400)
        .then(({ body }) => {
          expect(body.msg).toEqual("Bad request");
        });
    });

    test("status 400: admin is missing from request body", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .patch("/api/productions/1/members/2/admin")
        .send({})
        .set("Authorization", `Bearer ${token}`)
        .expect(400)
        .then(({ body }) => {
          expect(body.msg).toEqual("Bad request");
        });
    });

    test("status 404: member_id does not exist on this production", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .patch("/api/productions/1/members/999/admin")
        .send({ admin: true })
        .set("Authorization", `Bearer ${token}`)
        .expect(404)
        .then(({ body }) => {
          expect(body.msg).toEqual("Member not found");
        });
    });
  });
});

// REHEARSAL ROUTES

describe("REHEARSAL ROUTES", () => {
  // GET ALL REHEARSALS BY PRODUCTION ID

  describe("GET /api/productions/:production_id/rehearsals", () => {
    test("Status 200: Returns an array of rehearsals for production", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .get("/api/productions/1/rehearsals")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
        .then(({ body }) => {
          expect(Array.isArray(body)).toBe(true);
          expect(body.length).toBeGreaterThan(0);
          body.forEach((rehearsal) => {
            expect(rehearsal).toMatchObject({
              production_id: expect.any(Number),
              date: expect.any(String),
              start_time: expect.any(String),
              end_time: expect.any(String),
              location: expect.any(String),
              notes: expect.any(String),
              scenes: expect.any(Array),
              called: expect.any(Array),
            });
          });
        });
    });

    test("Status 200: Any company member (not just the creator) can view rehearsals", () => {
      const token = jwt.sign(
        { user_id: 2, username: "cast_member_two" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .get("/api/productions/1/rehearsals")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
        .then(({ body }) => {
          expect(body.length).toBeGreaterThan(0);
        });
    });

    test("Status 401: No token provided", () => {
      return request(app)
        .get("/api/productions/1/rehearsals")
        .expect(401)
        .then(({ body }) => {
          expect(body.msg).toEqual("No token provided");
        });
    });

    test("Status 403: User is neither the creator nor a company member", () => {
      const token = jwt.sign(
        { user_id: 99, username: "outsider" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .get("/api/productions/1/rehearsals")
        .set("Authorization", `Bearer ${token}`)
        .expect(403)
        .then(({ body }) => {
          expect(body.msg).toEqual("Forbidden");
        });
    });

    test("Status 400: production_id is not a valid number", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .get("/api/productions/not-a-number/rehearsals")
        .set("Authorization", `Bearer ${token}`)
        .expect(403)
        .then(({ body }) => {
          expect(body.msg).toEqual("Forbidden");
        });
    });
  });

  // POST NEW REHEARSAL TO PRODUCTION BY ID

  describe("POST /api/productions/:production_id/rehearsals", () => {
    test("Status 201: Returns new rehearsal data", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );

      const newRehearsal = {
        date: "2026-08-08",
        start_time: "10:00",
        end_time: "17:00",
        location: "Studio 6, Manchester",
        notes: "Full run",
      };

      return request(app)
        .post("/api/productions/1/rehearsals")
        .send(newRehearsal)
        .set("Authorization", `Bearer ${token}`)
        .expect(201)
        .then(({ body }) => {
          expect(body).toMatchObject({
            id: expect.any(Number),
            date: "2026-08-07T23:00:00.000Z",
            start_time: "10:00:00",
            end_time: "17:00:00",
            location: "Studio 6, Manchester",
            notes: "Full run",
            scenes: [],
          });
        });
    });

    test("Status 201: Creates a rehearsal with scenes but no notes, defaulting notes to an empty string", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );

      const newRehearsal = {
        date: "2026-08-10",
        start_time: "10:00",
        end_time: "13:00",
        location: "Studio 6, Manchester",
        scenes: [1, 3],
      };

      return request(app)
        .post("/api/productions/1/rehearsals")
        .send(newRehearsal)
        .set("Authorization", `Bearer ${token}`)
        .expect(201)
        .then(({ body }) => {
          expect(body).toMatchObject({
            id: expect.any(Number),
            date: "2026-08-09T23:00:00.000Z",
            scenes: [1, 3],
            notes: "",
          });
        });
    });

    test("Status 401: No token provided", () => {
      const newRehearsal = {
        date: "2026-08-08",
        start_time: "10:00",
        end_time: "17:00",
        location: "Studio 6, Manchester",
        notes: "Full run",
      };

      return request(app)
        .post("/api/productions/1/rehearsals")
        .send(newRehearsal)
        .expect(401)
        .then(({ body }) => {
          expect(body.msg).toEqual("No token provided");
        });
    });

    test("Status 403: User is not the production creator", () => {
      const token = jwt.sign(
        { user_id: 2, username: "cast_member_two" },
        process.env.JWT_SECRET,
      );

      const newRehearsal = {
        date: "2026-08-08",
        start_time: "10:00",
        end_time: "17:00",
        location: "Studio 6, Manchester",
        notes: "Full run",
      };

      return request(app)
        .post("/api/productions/1/rehearsals")
        .send(newRehearsal)
        .set("Authorization", `Bearer ${token}`)
        .expect(403)
        .then(({ body }) => {
          expect(body.msg).toEqual("Forbidden");
        });
    });

    test("Status 403: production_id is not valid", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );

      const newRehearsal = {
        date: "2026-08-08",
        start_time: "10:00",
        end_time: "17:00",
        location: "Studio 6, Manchester",
        notes: "Full run",
      };

      return request(app)
        .post("/api/productions/3/rehearsals")
        .send(newRehearsal)
        .set("Authorization", `Bearer ${token}`)
        .expect(403)
        .then(({ body }) => {
          expect(body.msg).toEqual("Forbidden");
        });
    });

    test("Status 400: Missing required fields", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .post("/api/productions/1/rehearsals")
        .send({ notes: "Full run" })
        .set("Authorization", `Bearer ${token}`)
        .expect(400)
        .then(({ body }) => {
          expect(body.msg).toEqual("Bad request");
        });
    });

    // REHEARSAL ATTENDANCE

    describe("REHEARSAL ATTENDANCE", () => {
      test("Status 201: Returns rehearsal including called array", () => {
        const token = jwt.sign(
          { user_id: 1, username: "sarah_director" },
          process.env.JWT_SECRET,
        );

        const newRehearsal = {
          date: "2026-08-08",
          start_time: "10:00",
          end_time: "17:00",
          location: "Studio 6, Manchester",
          notes: "Full run",
          called: [2, 3],
        };

        return request(app)
          .post("/api/productions/1/rehearsals")
          .send(newRehearsal)
          .set("Authorization", `Bearer ${token}`)
          .expect(201)
          .then(({ body }) => {
            expect(body).toMatchObject({
              id: expect.any(Number),
              called: expect.arrayContaining([2, 3]),
            });
            expect(body.called).toHaveLength(2);
          });
      });

      test("Status 201: called defaults to the full company when omitted", () => {
        const token = jwt.sign(
          { user_id: 1, username: "sarah_director" },
          process.env.JWT_SECRET,
        );

        const newRehearsal = {
          date: "2026-08-08",
          start_time: "10:00",
          end_time: "17:00",
          location: "Studio 6, Manchester",
        };

        return db
          .query(`SELECT user_id FROM company_members WHERE production_id = 1`)
          .then(({ rows: companyRows }) => {
            const expectedIds = companyRows.map((r) => r.user_id).sort();

            return request(app)
              .post("/api/productions/1/rehearsals")
              .send(newRehearsal)
              .set("Authorization", `Bearer ${token}`)
              .expect(201)
              .then(({ body }) => {
                expect(body.called.sort()).toEqual(expectedIds);
              });
          });
      });

      test("Status 201: Creates rehearsalAttendance rows for each company member in called, confirmed defaults to true", () => {
        const token = jwt.sign(
          { user_id: 1, username: "sarah_director" },
          process.env.JWT_SECRET,
        );

        const newRehearsal = {
          date: "2026-08-08",
          start_time: "10:00",
          end_time: "17:00",
          location: "Studio 6, Manchester",
          called: [2, 3, 4],
        };

        return request(app)
          .post("/api/productions/1/rehearsals")
          .send(newRehearsal)
          .set("Authorization", `Bearer ${token}`)
          .expect(201)
          .then(({ body }) => {
            return db.query(
              `SELECT * FROM rehearsal_attendance WHERE rehearsal_id = $1`,
              [body.id],
            );
          })
          .then(({ rows }) => {
            expect(rows).toHaveLength(3);
            expect(rows.map((r) => r.user_id).sort()).toEqual([2, 3, 4]);
            rows.forEach((row) => {
              expect(row.confirmed).toBe(true);
            });
          });
      });

      test("Status 400: called includes a user who is not a company member of the production", () => {
        const token = jwt.sign(
          { user_id: 1, username: "sarah_director" },
          process.env.JWT_SECRET,
        );

        const newRehearsal = {
          date: "2026-08-08",
          start_time: "10:00",
          end_time: "17:00",
          location: "Studio 6, Manchester",
          called: [2, 999],
        };

        return request(app)
          .post("/api/productions/1/rehearsals")
          .send(newRehearsal)
          .set("Authorization", `Bearer ${token}`)
          .expect(400)
          .then(({ body }) => {
            expect(body.msg).toEqual("Bad request");
          });
      });
    });
  });

  // PATCH REHEARSAL BY ID - EDIT DATE, TIME, LOCATION, NOTES

  describe("PATCH /api/productions/:production_id/rehearsals/:rehearsal_id", () => {
    test("Status 200: Returns updated rehearsal data", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );
      return request(app)
        .patch("/api/productions/1/rehearsals/1")
        .send({ location: "Directors home" })
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
        .then(({ body }) => {
          expect(body).toMatchObject({
            id: 1,
            production_id: 1,
            date: "2026-07-13T23:00:00.000Z",
            start_time: "10:00:00",
            end_time: "13:00:00",
            location: "Directors home",
            notes: "First read-through, full company called",
            called: [1, 2, 3, 4],
          });
        });
    });

    test("Status 200: Adding to the notes updates only the notes field", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );
      return request(app)
        .patch("/api/productions/1/rehearsals/1")
        .send({
          notes: "First read-through, full company called. Bring scripts.",
        })
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
        .then(({ body }) => {
          expect(body).toMatchObject({
            id: 1,
            notes: "First read-through, full company called. Bring scripts.",
            location: "Studio 3, Manchester",
          });
        });
    });

    test("Status 200: Removing a few scenes updates the scenes array", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );
      return request(app)
        .patch("/api/productions/1/rehearsals/2")
        .send({ scenes: [2] })
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
        .then(({ body }) => {
          expect(body).toMatchObject({
            id: 2,
            scenes: [2],
          });
        });
    });

    test("Status 401: No token provided", () => {
      return request(app)
        .patch("/api/productions/1/rehearsals/1")
        .send({ location: "Directors home" })
        .expect(401)
        .then(({ body }) => {
          expect(body.msg).toEqual("No token provided");
        });
    });

    test("Status 403: User is not the production creator", () => {
      const token = jwt.sign(
        { user_id: 2, username: "cast_member_two" },
        process.env.JWT_SECRET,
      );
      return request(app)
        .patch("/api/productions/1/rehearsals/1")
        .send({ location: "Directors home" })
        .set("Authorization", `Bearer ${token}`)
        .expect(403)
        .then(({ body }) => {
          expect(body.msg).toEqual("Forbidden");
        });
    });

    test("Status 403: production_id is not valid", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );
      return request(app)
        .patch("/api/productions/5/rehearsals/1")
        .send({ location: "Directors home" })
        .set("Authorization", `Bearer ${token}`)
        .expect(403)
        .then(({ body }) => {
          expect(body.msg).toEqual("Forbidden");
        });
    });

    test("Status 404: rehearsal_id does not exist on this production", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );
      return request(app)
        .patch("/api/productions/1/rehearsals/999")
        .send({ location: "Directors home" })
        .set("Authorization", `Bearer ${token}`)
        .expect(403)
        .then(({ body }) => {
          expect(body.msg).toEqual("Forbidden");
        });
    });
  });

  // DELETE A REHEARSAL BY ID

  describe("DELETE /api/productions/:production_id/rehearsals/:rehearsal_id", () => {
    test("Status 204: Successfully deletes rehearsal by id", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .delete("/api/productions/1/rehearsals/2")
        .set("Authorization", `Bearer ${token}`)
        .expect(204);
    });

    test("status 401: no token provided", () => {
      return request(app)
        .delete("/api/productions/1/rehearsals/2")
        .expect(401)
        .then(({ body }) => {
          expect(body.msg).toEqual("No token provided");
        });
    });

    test("status 403: only the production creator can delete a company member", () => {
      const token = jwt.sign(
        { user_id: 3, username: "cast_member_three" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .delete("/api/productions/1/rehearsals/2")
        .set("Authorization", `Bearer ${token}`)
        .expect(403)
        .then(({ body }) => {
          expect(body.msg).toEqual("Forbidden");
        });
    });
  });

  // GET ALL REHEARSALS FOR LOGGED IN USER

  describe("GET /api/users/me/schedule", () => {
    test("Status 200: Returns an array of rehearsals for logged in user", () => {
      const token = jwt.sign(
        { user_id: 2, username: "tom_actor" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .get("/api/users/me/schedule")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
        .then(({ body }) => {
          expect(Array.isArray(body)).toBe(true);
          expect(body.length).toBeGreaterThan(0);
          body.forEach((rehearsal) => {
            expect(rehearsal).toMatchObject({
              title: expect.any(String),
              date: expect.any(String),
              start_time: expect.any(String),
              end_time: expect.any(String),
              location: expect.any(String),
              notes: expect.any(String),
              scenes: expect.any(Array),
              called: expect.any(Array),
            });
          });
        });
    });

    test("Status 200: Returns an empty array for a user not called to any rehearsals", () => {
      const token = jwt.sign(
        { user_id: 99, username: "no_rehearsals_user" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .get("/api/users/me/schedule")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
        .then(({ body }) => {
          expect(body).toEqual([]);
        });
    });

    test("Status 401: No token provided", () => {
      return request(app)
        .get("/api/users/me/schedule")
        .expect(401)
        .then(({ body }) => {
          expect(body.msg).toEqual("No token provided");
        });
    });
  });
});

// CALL ROUTES

describe("CALL ROUTES", () => {
  // GET ALL CALLS BY REHEARSAL ID

  describe("GET /api/productions/:production_id/rehearsals/:rehearsal_id/attendance", () => {
    test("Status 200: Returns an array of attendance objects showing if company members are attending or not", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .get("/api/productions/1/rehearsals/1/attendance")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
        .then(({ body }) => {
          expect(Array.isArray(body)).toBe(true);
          expect(body.length).toBeGreaterThan(0);
          body.forEach((attendee) => {
            expect(attendee).toMatchObject({
              user_id: expect.any(Number),
              confirmed: expect.any(Boolean),
            });
          });
        });
    });

    test("Status 403: Company member who is not the creator cannot view attendance", () => {
      const token = jwt.sign(
        { user_id: 2, username: "tom_actor" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .get("/api/productions/1/rehearsals/1/attendance")
        .set("Authorization", `Bearer ${token}`)
        .expect(403)
        .then(({ body }) => {
          expect(body.msg).toEqual("Forbidden");
        });
    });

    test("Status 401: No token provided", () => {
      return request(app)
        .get("/api/productions/1/rehearsals/1/attendance")
        .expect(401)
        .then(({ body }) => {
          expect(body.msg).toEqual("No token provided");
        });
    });

    test("Status 403: User is neither the creator nor a company member", () => {
      const token = jwt.sign(
        { user_id: 99, username: "outsider" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .get("/api/productions/1/rehearsals/1/attendance")
        .set("Authorization", `Bearer ${token}`)
        .expect(403)
        .then(({ body }) => {
          expect(body.msg).toEqual("Forbidden");
        });
    });

    test("Status 403: production_id is not valid", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .get("/api/productions/5/rehearsals/1/attendance")
        .set("Authorization", `Bearer ${token}`)
        .expect(403)
        .then(({ body }) => {
          expect(body.msg).toEqual("Forbidden");
        });
    });

    test("Status 403: rehearsal_id does not exist on this production", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .get("/api/productions/1/rehearsals/999/attendance")
        .set("Authorization", `Bearer ${token}`)
        .expect(403)
        .then(({ body }) => {
          expect(body.msg).toEqual("Forbidden");
        });
    });
  });

  // POST NEW USER TO REHEARSAL BY ID

  describe("POST /api/productions/:production_id/rehearsals/:rehearsal_id/attendance", () => {
    test("Status 201: Returns new rehearsal_attendance object", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .post("/api/productions/1/rehearsals/2/attendance")
        .send({ user_id: 4 })
        .set("Authorization", `Bearer ${token}`)
        .expect(201)
        .then(({ body }) => {
          expect(body).toMatchObject({
            rehearsal_id: 2,
            user_id: 4,
            confirmed: true,
          });
        });
    });

    test("Status 201: New user_id is added to the rehearsal's called array", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .post("/api/productions/1/rehearsals/2/attendance")
        .send({ user_id: 4 })
        .set("Authorization", `Bearer ${token}`)
        .expect(201)
        .then(() => {
          return request(app)
            .get("/api/productions/1/rehearsals")
            .set("Authorization", `Bearer ${token}`);
        })
        .then(({ body }) => {
          const rehearsal = body.find((r) => r.id === 2);
          expect(rehearsal.called).toContain(4);
        });
    });

    test("Status 401: No token provided", () => {
      return request(app)
        .post("/api/productions/1/rehearsals/2/attendance")
        .send({ user_id: 4 })
        .expect(401)
        .then(({ body }) => {
          expect(body.msg).toEqual("No token provided");
        });
    });

    test("Status 403: User is not the production creator", () => {
      const token = jwt.sign(
        { user_id: 2, username: "cast_member_two" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .post("/api/productions/1/rehearsals/2/attendance")
        .send({ user_id: 4 })
        .set("Authorization", `Bearer ${token}`)
        .expect(403)
        .then(({ body }) => {
          expect(body.msg).toEqual("Forbidden");
        });
    });

    test("Status 403: production_id is not valid", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .post("/api/productions/5/rehearsals/2/attendance")
        .send({ user_id: 4 })
        .set("Authorization", `Bearer ${token}`)
        .expect(403)
        .then(({ body }) => {
          expect(body.msg).toEqual("Forbidden");
        });
    });

    test("Status 403: rehearsal_id does not exist on this production", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .post("/api/productions/1/rehearsals/999/attendance")
        .send({ user_id: 4 })
        .set("Authorization", `Bearer ${token}`)
        .expect(403)
        .then(({ body }) => {
          expect(body.msg).toEqual("Forbidden");
        });
    });

    test("Status 400: user_id is missing", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .post("/api/productions/1/rehearsals/2/attendance")
        .send({})
        .set("Authorization", `Bearer ${token}`)
        .expect(400)
        .then(({ body }) => {
          expect(body.msg).toEqual("Bad request");
        });
    });

    test("Status 400: user_id is not a company member of the production", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .post("/api/productions/1/rehearsals/2/attendance")
        .send({ user_id: 999 })
        .set("Authorization", `Bearer ${token}`)
        .expect(400)
        .then(({ body }) => {
          expect(body.msg).toEqual("User is not part of this production");
        });
    });

    test("Status 409: user_id is already called to this rehearsal", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .post("/api/productions/1/rehearsals/1/attendance")
        .send({ user_id: 2 })
        .set("Authorization", `Bearer ${token}`)
        .expect(409)
        .then(({ body }) => {
          expect(body.msg).toEqual("User is already called to this rehearsal");
        });
    });
  });

  // DELETE USER FROM REHEARSAL BY ID

  describe("DELETE /api/productions/:production_id/rehearsals/:rehearsal_id/attendance/:user_id", () => {
    test("Status 200: Returns the updated rehearsal with user_id removed from called", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .delete("/api/productions/1/rehearsals/1/attendance/2")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
        .then(({ body }) => {
          expect(body.called).not.toContain(2);
        });
    });

    test("Status 200: user_id no longer has a rehearsal_attendance row for this rehearsal", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .delete("/api/productions/1/rehearsals/1/attendance/4")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
        .then(() => {
          return db.query(
            `SELECT * FROM rehearsal_attendance WHERE rehearsal_id = $1 AND user_id = $2`,
            [1, 4],
          );
        })
        .then(({ rows }) => {
          expect(rows).toHaveLength(0);
        });
    });

    test("Status 401: No token provided", () => {
      return request(app)
        .delete("/api/productions/1/rehearsals/1/attendance/3")
        .expect(401)
        .then(({ body }) => {
          expect(body.msg).toEqual("No token provided");
        });
    });

    test("Status 403: User is not the production creator", () => {
      const token = jwt.sign(
        { user_id: 2, username: "cast_member_two" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .delete("/api/productions/1/rehearsals/1/attendance/3")
        .set("Authorization", `Bearer ${token}`)
        .expect(403)
        .then(({ body }) => {
          expect(body.msg).toEqual("Forbidden");
        });
    });

    test("Status 403: production_id is not valid", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .delete("/api/productions/5/rehearsals/1/attendance/3")
        .set("Authorization", `Bearer ${token}`)
        .expect(403)
        .then(({ body }) => {
          expect(body.msg).toEqual("Forbidden");
        });
    });

    test("Status 403: rehearsal_id does not exist on this production", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .delete("/api/productions/1/rehearsals/999/attendance/3")
        .set("Authorization", `Bearer ${token}`)
        .expect(403)
        .then(({ body }) => {
          expect(body.msg).toEqual("Forbidden");
        });
    });

    test("Status 404: user_id has no rehearsal_attendance row for this rehearsal", () => {
      const token = jwt.sign(
        { user_id: 1, username: "sarah_director" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .delete("/api/productions/1/rehearsals/1/attendance/99")
        .set("Authorization", `Bearer ${token}`)
        .expect(404)
        .then(({ body }) => {
          expect(body.msg).toEqual("Not found");
        });
    });
  });

  // PATCH - CONFIRM OR UNCONFIRM USER ATTENDANCE BY REHEARSAL ID AND USER ID

  describe("PATCH /api/productions/:production_id/rehearsals/:rehearsal_id/attendance/:user_id", () => {
    test("Status 200: Returns updated rehearsal_attendance object with confirmed set to false", () => {
      const token = jwt.sign(
        { user_id: 2, username: "tom_actor" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .patch("/api/productions/1/rehearsals/1/attendance/2")
        .set("Authorization", `Bearer ${token}`)
        .send({ confirmed: false })
        .expect(200)
        .then(({ body }) => {
          expect(body).toMatchObject({
            rehearsal_id: 1,
            user_id: 2,
            confirmed: false,
          });
        });
    });

    test("Status 200: Returns updated rehearsal_attendance object with confirmed set to true", () => {
      const token = jwt.sign(
        { user_id: 3, username: "cast_member_three" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .patch("/api/productions/1/rehearsals/1/attendance/3")
        .set("Authorization", `Bearer ${token}`)
        .send({ confirmed: true })
        .expect(200)
        .then(({ body }) => {
          expect(body).toMatchObject({
            rehearsal_id: 1,
            user_id: 3,
            confirmed: true,
          });
        });
    });

    test("Status 401: No token provided", () => {
      return request(app)
        .patch("/api/productions/1/rehearsals/1/attendance/2")
        .send({ confirmed: false })
        .expect(401)
        .then(({ body }) => {
          expect(body.msg).toEqual("No token provided");
        });
    });

    test("Status 403: User attempts to confirm attendance on behalf of someone else", () => {
      const token = jwt.sign(
        { user_id: 3, username: "cast_member_three" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .patch("/api/productions/1/rehearsals/1/attendance/2")
        .set("Authorization", `Bearer ${token}`)
        .send({ confirmed: false })
        .expect(403)
        .then(({ body }) => {
          expect(body.msg).toEqual("Forbidden");
        });
    });

    test("Status 404: user_id has no rehearsal_attendance row for this rehearsal", () => {
      const token = jwt.sign(
        { user_id: 5, username: "no_attendance_user" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .patch("/api/productions/1/rehearsals/2/attendance/5")
        .set("Authorization", `Bearer ${token}`)
        .send({ confirmed: false })
        .expect(404)
        .then(({ body }) => {
          expect(body.msg).toEqual("Not found");
        });
    });

    test("Status 400: confirmed is not a boolean", () => {
      const token = jwt.sign(
        { user_id: 2, username: "tom_actor" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .patch("/api/productions/1/rehearsals/1/attendance/2")
        .set("Authorization", `Bearer ${token}`)
        .send({ confirmed: "yes" })
        .expect(400)
        .then(({ body }) => {
          expect(body.msg).toEqual("Bad request");
        });
    });

    test("Status 400: confirmed is missing", () => {
      const token = jwt.sign(
        { user_id: 2, username: "tom_actor" },
        process.env.JWT_SECRET,
      );

      return request(app)
        .patch("/api/productions/1/rehearsals/1/attendance/2")
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(400)
        .then(({ body }) => {
          expect(body.msg).toEqual("Bad request");
        });
    });
  });
});
