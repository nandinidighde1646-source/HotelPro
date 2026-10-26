const { Schema, model } = require("mongoose");
const s = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    entity: String,
    entityId: String,
    meta: Schema.Types.Mixed,
  },
  { timestamps: true }
);
s.index({ createdAt: -1 });
module.exports = model("AuditLog", s);
