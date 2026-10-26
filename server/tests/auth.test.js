const { app, start, stop, reset, makeUser, request } = require("./setup");
beforeAll(start); afterAll(stop); afterEach(reset);

test("register hashes password and always assigns guest role", async () => {
  const r = await request(app).post("/api/auth/register").send({ name: "Eve", email: "eve@t.test", password: "Password1!", role: "admin" });
  expect(r.status).toBe(201);
  expect(r.body.user.role).toBe("guest");
  expect(r.body.user.passwordHash).toBeUndefined();
});
test("login rejects wrong password", async () => {
  await request(app).post("/api/auth/register").send({ name: "Eve", email: "eve@t.test", password: "Password1!" });
  const r = await request(app).post("/api/auth/login").send({ email: "eve@t.test", password: "nope" });
  expect(r.status).toBe(401);
});
test("private route requires token", async () => {
  expect((await request(app).get("/api/auth/me")).status).toBe(401);
});
test("guest cannot access admin or staff routes", async () => {
  const t = await makeUser("guest");
  expect((await request(app).get("/api/admin/users").set("Authorization", `Bearer ${t}`)).status).toBe(403);
  expect((await request(app).get("/api/bookings").set("Authorization", `Bearer ${t}`)).status).toBe(403);
});
test("staff cannot change roles", async () => {
  const t = await makeUser("staff");
  expect((await request(app).patch("/api/admin/users/x/role").set("Authorization", `Bearer ${t}`).send({ role: "admin" })).status).toBe(403);
});
