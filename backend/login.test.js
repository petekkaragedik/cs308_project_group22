jest.mock("mysql2/promise", () => {
  const mockQuery = jest.fn();
  const mockGetConnection = jest.fn();
  return {
    createPool: () => ({
      query: mockQuery,
      getConnection: mockGetConnection,
    }),
    __mockQuery: mockQuery,
    __mockGetConnection: mockGetConnection,
  };
});

jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const request = require("supertest");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const app = require("./server");

const mockQuery = mysql.__mockQuery;

const userRow = {
  id: 1,
  name: "Test User",
  email: "test@test.com",
  password: "$2a$10$fakeHashForTesting",
  role: "customer",
};

beforeEach(() => {
  mockQuery.mockReset();
  bcrypt.compare.mockReset();
});

describe("POST /api/login - SUCCESS CASE", () => {
  it("should return 200 and a token for valid credentials", async () => {
    mockQuery.mockResolvedValueOnce([[userRow]]);
    bcrypt.compare.mockResolvedValueOnce(true);

    const res = await request(app)
      .post("/api/login")
      .send({ email: "test@test.com", password: "1234" });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Login successful");
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toEqual({
      id: 1,
      name: "Test User",
      email: "test@test.com",
      role: "customer",
    });
    expect(bcrypt.compare).toHaveBeenCalledWith("1234", userRow.password);
  });
});

describe("POST /api/login - FAILED CASE", () => {
  it("should return 401 when the password does not match", async () => {
    mockQuery.mockResolvedValueOnce([[userRow]]);
    bcrypt.compare.mockResolvedValueOnce(false);

    const res = await request(app)
      .post("/api/login")
      .send({ email: "test@test.com", password: "wrongpassword" });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Invalid credentials");
  });

  it("should return 401 when the user does not exist", async () => {
    mockQuery.mockResolvedValueOnce([[]]);

    const res = await request(app)
      .post("/api/login")
      .send({ email: "missing@test.com", password: "whatever" });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Invalid credentials");
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it("should return 400 when email or password is missing", async () => {
    const res = await request(app).post("/api/login").send({ email: "test@test.com" });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Email and password are required");
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
