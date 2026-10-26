const crypto = require("crypto");
const makeRef = (prefix) => `${prefix}-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
module.exports = { makeRef };
