const crypto = require("crypto");

exports.generateTempPassword = (length = 12) => {
  return crypto
    .randomBytes(length)
    .toString("base64")
    .replace(/[+/=]/g, "")
    .slice(0, length);
};
