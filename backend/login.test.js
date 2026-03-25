const request = require("supertest");
const app = require("./server");

// SUCCESS TEST
describe("POST /api/login - SUCCESS CASE", () => {
  it("should return success message for valid credentials", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({
        email: "test@test.com",
        password: "1234",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Login successful");
  });
});

// FAILED TEST
describe("POST /api/login - FAILED CASE", () => {
  it("should return 401 and error message for invalid credentials", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({
        email: "test@test.com",
        password: "wrongpassword",
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Invalid credentials");
  });
});