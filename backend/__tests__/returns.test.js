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

const request = require("supertest");
const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");
const app = require("../server");

const mockQuery = mysql.__mockQuery;
const mockGetConnection = mysql.__mockGetConnection;

// Read the secret after server.js has loaded dotenv
const SECRET = process.env.JWT_SECRET || "dev_secret";

const customerToken = jwt.sign(
  { id: 1, email: "customer@test.com", role: "customer" },
  SECRET,
  { expiresIn: "1h" }
);
const managerToken = jwt.sign(
  { id: 2, email: "manager@test.com", role: "sales_manager" },
  SECRET,
  { expiresIn: "1h" }
);

beforeEach(() => {
  mockQuery.mockReset();
  mockGetConnection.mockReset();
});

describe("POST /api/returns", () => {
  it("returns 401 when no token is provided", async () => {
    const res = await request(app).post("/api/returns").send({ order_id: 1 });
    expect(res.statusCode).toBe(401);
  });

  it("returns 400 when order_id is missing", async () => {
    const res = await request(app)
      .post("/api/returns")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("order_id is required");
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("returns 400 when order_id is not a valid number", async () => {
    const res = await request(app)
      .post("/api/returns")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ order_id: "abc" });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Invalid order_id");
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("returns 404 when the order does not exist", async () => {
    mockQuery.mockResolvedValueOnce([[]]); // no order found

    const res = await request(app)
      .post("/api/returns")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ order_id: 99 });

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Order not found");
  });

  it("returns 400 when the order is not delivered", async () => {
    mockQuery.mockResolvedValueOnce([
      [{ id: 1, customer_email: "customer@test.com", status: "in-transit", created_at: new Date() }],
    ]);

    const res = await request(app)
      .post("/api/returns")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ order_id: 1 });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Only delivered orders can be returned");
  });

  it("returns 400 when the 30-day return window has expired", async () => {
    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    mockQuery.mockResolvedValueOnce([
      [{ id: 1, customer_email: "customer@test.com", status: "delivered", created_at: oldDate }],
    ]);

    const res = await request(app)
      .post("/api/returns")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ order_id: 1 });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/30 days/);
  });

  it("returns 409 when a return request for this order already exists", async () => {
    const recentDate = new Date();
    mockQuery.mockResolvedValueOnce([
      [{ id: 1, customer_email: "customer@test.com", status: "delivered", created_at: recentDate }],
    ]);
    mockQuery.mockResolvedValueOnce([[{ id: 5 }]]); // existing return found

    const res = await request(app)
      .post("/api/returns")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ order_id: 1 });

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toBe("A return request for this order already exists");
  });

  it("returns 201 and creates a return request for a valid delivered order", async () => {
    const recentDate = new Date();
    mockQuery.mockResolvedValueOnce([
      [{ id: 1, customer_email: "customer@test.com", status: "delivered", created_at: recentDate }],
    ]); // order lookup
    mockQuery.mockResolvedValueOnce([[]]); // no existing return
    mockQuery.mockResolvedValueOnce([{ insertId: 42 }]); // insert

    const res = await request(app)
      .post("/api/returns")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ order_id: 1, reason: "Wrong size" });

    expect(res.statusCode).toBe(201);
    expect(res.body.returnRequestId).toBe(42);
    expect(res.body.orderId).toBe(1);
    expect(res.body.status).toBe("pending");
  });
});

describe("GET /api/returns", () => {
  it("returns 401 when no token is provided", async () => {
    const res = await request(app).get("/api/returns");
    expect(res.statusCode).toBe(401);
  });

  it("returns the customer's own return requests", async () => {
    mockQuery.mockResolvedValueOnce([
      [{ id: 1, order_id: 10, reason: "Damaged", status: "pending" }],
    ]);

    const res = await request(app)
      .get("/api/returns")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe("pending");
  });

  it("returns all return requests for a sales manager", async () => {
    mockQuery.mockResolvedValueOnce([
      [
        { id: 1, order_id: 10, customer_name: "Alice", status: "pending" },
        { id: 2, order_id: 11, customer_name: "Bob", status: "approved" },
      ],
    ]);

    const res = await request(app)
      .get("/api/returns")
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe("PATCH /api/returns/:id/reject", () => {
  it("returns 403 when a customer tries to reject a return", async () => {
    const res = await request(app)
      .patch("/api/returns/1/reject")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.statusCode).toBe(403);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("returns 404 when the return request does not exist", async () => {
    mockQuery.mockResolvedValueOnce([[]]); // not found

    const res = await request(app)
      .patch("/api/returns/99/reject")
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Return request not found");
  });

  it("returns 409 when the return request is no longer pending", async () => {
    mockQuery.mockResolvedValueOnce([[{ id: 1, status: "approved" }]]);

    const res = await request(app)
      .patch("/api/returns/1/reject")
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toBe("Return request is no longer pending");
  });

  it("successfully rejects a pending return request", async () => {
    mockQuery.mockResolvedValueOnce([[{ id: 1, status: "pending" }]]); // existence check
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]); // update

    const res = await request(app)
      .patch("/api/returns/1/reject")
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("rejected");
    expect(res.body.id).toBe(1);
  });
});
