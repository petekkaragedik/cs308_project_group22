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
const jwt = require("jsonwebtoken");
const mysql = require("mysql2/promise");
const app = require("./server");

const mockQuery = mysql.__mockQuery;
const SECRET = process.env.JWT_SECRET || "dev_secret";

function tokenFor(role, overrides = {}) {
  const payload = {
    id: overrides.id ?? 1,
    email: overrides.email ?? `${role}@test.com`,
    role,
  };
  return jwt.sign(payload, SECRET, { expiresIn: "1h" });
}

const customerToken = tokenFor("customer", { id: 10, email: "customer@test.com" });
const salesManagerToken = tokenFor("sales_manager", { id: 20, email: "sales@test.com" });
const productManagerToken = tokenFor("product_manager", { id: 30, email: "pm@test.com" });

// Every admin/manager-restricted endpoint defined in server.js
const PROTECTED_ENDPOINTS = [
  { method: "get", path: "/api/admin/comments", allowedRole: "product_manager" },
  { method: "post", path: "/api/admin/comments/1/approve", allowedRole: "product_manager" },
  { method: "post", path: "/api/admin/comments/1/reject", allowedRole: "product_manager" },
  { method: "delete", path: "/api/admin/comments/1", allowedRole: "product_manager" },
];

beforeEach(() => {
  mockQuery.mockReset();
});

describe("Permission boundaries — unauthenticated callers", () => {
  it.each(PROTECTED_ENDPOINTS)(
    "blocks %s %s with 401 when no token is provided",
    async ({ method, path }) => {
      const res = await request(app)[method](path);
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe("Authentication required");
      expect(mockQuery).not.toHaveBeenCalled();
    }
  );

  it("rejects a malformed Authorization header with 401", async () => {
    const res = await request(app)
      .get("/api/admin/comments")
      .set("Authorization", "NotBearer xyz");
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Authentication required");
  });

  it("rejects an invalid / tampered token with 401", async () => {
    const res = await request(app)
      .get("/api/admin/comments")
      .set("Authorization", "Bearer not-a-real-jwt");
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Invalid or expired token");
  });

  it("rejects an expired token with 401", async () => {
    const expired = jwt.sign(
      { id: 30, email: "pm@test.com", role: "product_manager" },
      SECRET,
      { expiresIn: -10 }
    );
    const res = await request(app)
      .get("/api/admin/comments")
      .set("Authorization", `Bearer ${expired}`);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Invalid or expired token");
  });
});

describe("Permission boundaries — customer role is forbidden", () => {
  it.each(PROTECTED_ENDPOINTS)(
    "forbids %s %s for a customer with 403",
    async ({ method, path }) => {
      const res = await request(app)
        [method](path)
        .set("Authorization", `Bearer ${customerToken}`);
      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Insufficient permissions");
      expect(mockQuery).not.toHaveBeenCalled();
    }
  );
});

describe("Permission boundaries — sales_manager role is forbidden", () => {
  it.each(PROTECTED_ENDPOINTS)(
    "forbids %s %s for a sales_manager with 403",
    async ({ method, path }) => {
      const res = await request(app)
        [method](path)
        .set("Authorization", `Bearer ${salesManagerToken}`);
      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Insufficient permissions");
      expect(mockQuery).not.toHaveBeenCalled();
    }
  );
});

describe("Permission boundaries — product_manager role is allowed", () => {
  it("allows a product_manager to list comments", async () => {
    mockQuery.mockResolvedValueOnce([[]]);
    const res = await request(app)
      .get("/api/admin/comments")
      .set("Authorization", `Bearer ${productManagerToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it("allows a product_manager to approve a comment", async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await request(app)
      .post("/api/admin/comments/1/approve")
      .set("Authorization", `Bearer ${productManagerToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Comment approved");
  });

  it("allows a product_manager to reject a comment", async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await request(app)
      .post("/api/admin/comments/1/reject")
      .set("Authorization", `Bearer ${productManagerToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Comment rejected");
  });

  it("allows a product_manager to delete a comment", async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await request(app)
      .delete("/api/admin/comments/1")
      .set("Authorization", `Bearer ${productManagerToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Comment deleted");
  });

  it("returns 404 (not 403) when a product_manager acts on a missing comment", async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }]);
    const res = await request(app)
      .post("/api/admin/comments/9999/approve")
      .set("Authorization", `Bearer ${productManagerToken}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Comment not found");
  });
});

describe("Permission boundaries — customer-only profile routes still require auth", () => {
  const PROFILE_ENDPOINTS = [
    { method: "get", path: "/api/profile" },
    { method: "put", path: "/api/profile" },
    { method: "get", path: "/api/profile/orders" },
    { method: "get", path: "/api/profile/addresses" },
    { method: "post", path: "/api/profile/addresses" },
    { method: "put", path: "/api/profile/addresses/1" },
    { method: "delete", path: "/api/profile/addresses/1" },
    { method: "get", path: "/api/favorites" },
    { method: "post", path: "/api/favorites" },
    { method: "delete", path: "/api/favorites/p1" },
  ];

  it.each(PROFILE_ENDPOINTS)(
    "blocks %s %s without a token (401)",
    async ({ method, path }) => {
      const res = await request(app)[method](path);
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe("Authentication required");
    }
  );
});

describe("Permission boundaries — public endpoints remain open", () => {
  it("lets anyone read approved comments without a token", async () => {
    mockQuery.mockResolvedValueOnce([[]]);
    const res = await request(app).get("/api/products/p1/comments");
    expect(res.statusCode).toBe(200);
  });

  it("lets anyone read aggregate ratings without a token", async () => {
    mockQuery.mockResolvedValueOnce([[{ average: null, count: 0 }]]);
    const res = await request(app).get("/api/products/p1/ratings");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ average: 0, count: 0 });
  });
});
