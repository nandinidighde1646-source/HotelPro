const { MongoMemoryReplSet } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const request = require("supertest");
process.env.JWT_SECRET = "test-secret";
process.env.CLIENT_ORIGINS = "http://localhost:5173";
const { createApp } = require("../src/app");
const User = require("../src/models/User");
const Room = require("../src/models/Room");

let rs;
const app = createApp();
async function start() {
  rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(rs.getUri());
  await Promise.all(mongoose.modelNames().map((n) => mongoose.model(n).syncIndexes()));
}
async function stop() { await mongoose.disconnect(); await rs.stop(); }
async function reset() { await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({}))); }
async function makeUser(role, email = `${role}${Date.now()}${Math.random()}@t.test`) {
  await User.create({ name: role, email, role, passwordHash: await bcrypt.hash("Password1!", 4) });
  const r = await request(app).post("/api/auth/login").send({ email, password: "Password1!" });
  return r.body.token;
}
const makeRoom = (o = {}) => Room.create({ number: String(Math.random()).slice(2, 7), name: "Test", type: "standard", pricePerNight: 100, capacity: 2, ...o });
const day = (n) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
module.exports = { app, start, stop, reset, makeUser, makeRoom, day, request };
