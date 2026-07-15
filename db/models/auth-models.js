const db = require("../connection");

exports.isProductionAdmin = (userId, production_id) => {
  return db
    .query(
      `SELECT admin FROM company_members WHERE production_id = $1 AND user_id = $2`,
      [production_id, userId],
    )
    .then(({ rows }) => {
      if (rows.length === 0) return false;
      return rows[0].admin === true;
    });
};
