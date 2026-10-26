const AuditLog = require("../models/AuditLog");
module.exports = (actor, action, entity, entityId, meta) =>
  AuditLog.create({ actor, action, entity, entityId: String(entityId || ""), meta }).catch(() => {});
