const { Schema, model } = require("mongoose");
module.exports = model("RoomCategory", new Schema(
  { name: { type: String, required: true, unique: true, trim: true }, description: String },
  { timestamps: true }
));
