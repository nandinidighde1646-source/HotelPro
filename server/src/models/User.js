const { Schema, model } = require("mongoose");
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, maxlength: 30 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["guest", "staff", "admin"], default: "guest", index: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);
userSchema.set("toJSON", { transform: (_d, r) => { delete r.passwordHash; return r; } });
module.exports = model("User", userSchema);
