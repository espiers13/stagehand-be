const express = require("express");
const cors = require("cors");
const app = express();

const verifyToken = require("./db/middleware/auth.js");

const {
  loginUser,
  registerUser,
  getLoggedInUser,
  getUserProductions,
  changePassword,
  deleteUser,
  forgotPassword,
  resetPassword,
} = require("./db/controllers/user-controllers.js");

const {
  getProductionById,
  updateProductionData,
  deleteProduction,
  postNewProduction,
} = require("./db/controllers/production-controllers.js");

const {
  getMembersByProduction,
  postNewCompanyMember,
  deleteCompanyMember,
} = require("./db/controllers/company-member-controllers.js");

const {
  getRehearsalsByProduction,
  postNewRehearsal,
  patchRehearsal,
  deleteRehearsal,
  getUserSchedule,
} = require("./db/controllers/rehearsal-controllers.js");

// MIDDLEWARE

app.use(cors());
app.use(express.json());

// ** AUTH ROUTES **

// POST LOGIN USER

app.post("/api/login", loginUser);

// POST NEW USER

app.post("/api/register", registerUser);

// GET LOGGED IN USER BY ID

app.get("/api/user", verifyToken, getLoggedInUser);

// GET PRODUCTIONS BY USER_ID

app.get("/api/user/productions", verifyToken, getUserProductions);

// // CHANGE PASSWORD WHEN LOGGED IN

app.patch("/api/user/password", verifyToken, changePassword);

// FORGOT PASSWORD

app.post("/api/forgot-password", forgotPassword);

// RESET PASSWORD

app.post("/api/reset-password", resetPassword);

// // DELETE USER

app.delete("/api/user", verifyToken, deleteUser);

// ** PRODUCTION ROUTES **

// POST NEW PRODUCTION

app.post("/api/productions", verifyToken, postNewProduction);

// GET PRODUCTION BY ID

app.get("/api/productions/:production_id", verifyToken, getProductionById);

// PATCH PRODUCTION BY ID - EDIT TITLE, DATES, COMPANY MEMBERS, VENUE

app.patch("/api/productions/:production_id", verifyToken, updateProductionData);

// DELETE PRODUCTION BY ID

app.delete("/api/productions/:production_id", verifyToken, deleteProduction);

// ** COMPANY MEMBER ROUTES **

// GET ALL COMPANY MEMBERS BY PRODUCTION ID

app.get(
  "/api/productions/:production_id/members",
  verifyToken,
  getMembersByProduction,
);

// POST NEW COMPANY MEMBER TO PRODUCTION BY EMAIL

app.post(
  "/api/productions/:production_id/members",
  verifyToken,
  postNewCompanyMember,
);

// DELETE COMPANY MEMBER BY ID

app.delete(
  "/api/productions/:production_id/:member_id",
  verifyToken,
  deleteCompanyMember,
);

// ** REHEARSAL ROUTES **

// GET ALL REHEARSALS BY PRODUCTION ID

app.get(
  "/api/productions/:production_id/rehearsals",
  verifyToken,
  getRehearsalsByProduction,
);

// POST NEW REHEARSAL TO PRODUCTION BY ID

app.post(
  "/api/productions/:production_id/rehearsals",
  verifyToken,
  postNewRehearsal,
);

// PATCH REHEARSAL BY ID - EDIT DATE, TIME, LOCATION, NOTES

app.patch(
  "/api/productions/:production_id/rehearsals/:rehearsal_id",
  verifyToken,
  patchRehearsal,
);

// DELETE A REHEARSAL BY ID

app.delete(
  "/api/productions/:production_id/rehearsals/:rehearsal_id",
  verifyToken,
  deleteRehearsal,
);

// GET REHEARSALS FOR LOGGED IN USER

app.get("/api/users/me/schedule", verifyToken, getUserSchedule);

// CALL ROUTES

// GET ALL CALLS BY REHEARSAL ID

// POST NEW USER TO REHEARSAL BY ID

// DELETE USER FROM REHEARSAL BY ID

// PATCH - CONFIRM OR UNCONFIRM USER ATTENDANCE BY REHEARSAL ID AND USER ID

// ERRORS

app.use((err, req, res, next) => {
  console.error(err);
  res
    .status(err.status || 500)
    .send({ msg: err.msg || "Internal server error" });
});

module.exports = app;
