jest.mock("mysql2/promise", () => {
  const mockQuery = jest.fn();
  const mockConnQuery = jest.fn();
  const mockBeginTransaction = jest.fn().mockResolvedValue(undefined);
  const mockCommit = jest.fn().mockResolvedValue(undefined);
  const mockRollback = jest.fn().mockResolvedValue(undefined);
  const mockRelease = jest.fn();
  const mockGetConnection = jest.fn(() =>
    Promise.resolve({
      query: mockConnQuery,
      beginTransaction: mockBeginTransaction,
      commit: mockCommit,
      rollback: mockRollback,
      release: mockRelease,
    })
  );
  return {
    createPool: () => ({ query: mockQuery, getConnection: mockGetConnection }),
    __mockQuery: mockQuery,
    __mockConnQuery: mockConnQuery,
    __mockGetConnection: mockGetConnection,
    __mockBeginTransaction: mockBeginTransaction,
    __mockCommit: mockCommit,
    __mockRollback: mockRollback,
    __mockRelease: mockRelease,
  };
});

jest.mock("../services/invoicePdf", () => ({
  generateInvoicePdfBuffer: jest.fn(),
}));

jest.mock("../services/mailInvoice", () => ({
  sendInvoiceEmail: jest.fn(),
}));

const request = require("supertest");
const mysql = require("mysql2/promise");
const { generateInvoicePdfBuffer } = require("../services/invoicePdf");
const { sendInvoiceEmail } = require("../services/mailInvoice");
const app = require("../server");

const mockQuery = mysql.__mockQuery;
const mockConnQuery = mysql.__mockConnQuery;
const mockGetConnection = mysql.__mockGetConnection;
const mockCommit = mysql.__mockCommit;
const mockRollback = mysql.__mockRollback;
const mockRelease = mysql.__mockRelease;

beforeEach(() => {
  mockQuery.mockReset();
  mockConnQuery.mockReset();
  mockGetConnection.mockClear();
  mockCommit.mockClear();
  mockRollback.mockClear();
  mockRelease.mockClear();
  generateInvoicePdfBuffer.mockReset();
  sendInvoiceEmail.mockReset();
});

const validItem = { product_id: "p1", size: "M", quantity: 2 };

describe("POST /api/orders/mock-checkout - validation", () => {
  it("returns 400 when customerEmail is missing or invalid", async () => {
    const noEmail = await request(app)
      .post("/api/orders/mock-checkout")
      .send({ items: [validItem] });
    const badEmail = await request(app)
      .post("/api/orders/mock-checkout")
      .send({ customerEmail: "not-an-email", items: [validItem] });

    expect(noEmail.statusCode).toBe(400);
    expect(badEmail.statusCode).toBe(400);
    expect(noEmail.body.message).toBe("Valid customer email is required");
    expect(mockGetConnection).not.toHaveBeenCalled();
  });

  it("returns 400 when items is empty or not an array", async () => {
    const empty = await request(app)
      .post("/api/orders/mock-checkout")
      .send({ customerEmail: "a@b.com", items: [] });
    const missing = await request(app)
      .post("/api/orders/mock-checkout")
      .send({ customerEmail: "a@b.com" });

    expect(empty.statusCode).toBe(400);
    expect(missing.statusCode).toBe(400);
    expect(empty.body.message).toBe("Cart must contain at least one item");
    expect(mockGetConnection).not.toHaveBeenCalled();
  });

  it("returns 400 when an item is missing product_id, size, or has bad quantity", async () => {
    const badQty = await request(app)
      .post("/api/orders/mock-checkout")
      .send({ customerEmail: "a@b.com", items: [{ product_id: "p1", size: "M", quantity: 0 }] });
    const noSize = await request(app)
      .post("/api/orders/mock-checkout")
      .send({ customerEmail: "a@b.com", items: [{ product_id: "p1", quantity: 1 }] });

    expect(badQty.statusCode).toBe(400);
    expect(noSize.statusCode).toBe(400);
    expect(badQty.body.message).toBe(
      "Each item needs product_id, size, and quantity (at least 1)"
    );
    expect(mockGetConnection).not.toHaveBeenCalled();
  });
});

describe("POST /api/orders/mock-checkout - stock/product errors", () => {
  it("rolls back and returns 400 when a product is not found", async () => {
    mockConnQuery.mockResolvedValueOnce([[]]);

    const res = await request(app)
      .post("/api/orders/mock-checkout")
      .send({ customerEmail: "a@b.com", items: [validItem] });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Product not found: p1");
    expect(mockRollback).toHaveBeenCalledTimes(1);
    expect(mockCommit).not.toHaveBeenCalled();
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it("rolls back and returns 400 when stock is insufficient", async () => {
    mockConnQuery.mockResolvedValueOnce([
      [{ id: "p1", name: "Board", quantityInStock: 1, price: 100 }],
    ]);

    const res = await request(app)
      .post("/api/orders/mock-checkout")
      .send({ customerEmail: "a@b.com", items: [validItem] });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Insufficient stock for Board. Available: 1");
    expect(mockRollback).toHaveBeenCalledTimes(1);
    expect(mockCommit).not.toHaveBeenCalled();
  });
});

describe("POST /api/orders/mock-checkout - success paths", () => {
  function mockHappyDbFlow() {
    // conn.query calls, in order inside the transaction:
    //  1. SELECT product FOR UPDATE
    //  2. INSERT INTO orders -> returns { insertId }
    //  3. INSERT INTO order_items
    //  4. UPDATE products (decrement stock)
    mockConnQuery
      .mockResolvedValueOnce([[{ id: "p1", name: "Board", quantityInStock: 5, price: 100 }]])
      .mockResolvedValueOnce([{ insertId: 99 }])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);

    // db.query calls after commit (re-fetch order + items for payload)
    mockQuery
      .mockResolvedValueOnce([
        [
          {
            id: 99,
            invoice_number: "INV-TEST",
            created_at: "2026-04-21",
            customer_email: "a@b.com",
            customer_name: null,
            currency: "TRY",
            total_amount: "200.00",
            status: "processing",
          },
        ],
      ])
      .mockResolvedValueOnce([
        [
          {
            product_name: "Board",
            size: "M",
            quantity: 2,
            unit_price: "100.00",
            line_total: "200.00",
          },
        ],
      ]);
  }

  it("creates the order, commits, decrements stock, and returns 201 with emailSent=true", async () => {
    mockHappyDbFlow();
    generateInvoicePdfBuffer.mockResolvedValueOnce(Buffer.from("pdf"));
    sendInvoiceEmail.mockResolvedValueOnce({ sent: true });

    const res = await request(app)
      .post("/api/orders/mock-checkout")
      .send({ customerEmail: "a@b.com", items: [validItem] });

    expect(res.statusCode).toBe(201);
    expect(res.body.orderId).toBe(99);
    expect(res.body.emailSent).toBe(true);
    expect(res.body.message).toMatch(/Invoice sent/);

    expect(mockCommit).toHaveBeenCalledTimes(1);
    expect(mockRollback).not.toHaveBeenCalled();
    expect(mockRelease).toHaveBeenCalledTimes(1);

    // UPDATE products SET quantityInStock - quantity WHERE id = ?
    const updateCall = mockConnQuery.mock.calls.find(
      (c) => typeof c[0] === "string" && c[0].includes("UPDATE products")
    );
    expect(updateCall).toBeDefined();
    expect(updateCall[1]).toEqual([2, "p1"]);
  });

  it("still returns 201 but emailSent=false when the invoice email fails", async () => {
    mockHappyDbFlow();
    generateInvoicePdfBuffer.mockResolvedValueOnce(Buffer.from("pdf"));
    sendInvoiceEmail.mockRejectedValueOnce(new Error("smtp down"));

    const res = await request(app)
      .post("/api/orders/mock-checkout")
      .send({ customerEmail: "a@b.com", items: [validItem] });

    expect(res.statusCode).toBe(201);
    expect(res.body.orderId).toBe(99);
    expect(res.body.emailSent).toBe(false);
    expect(res.body.emailError).toBe(true);
    expect(res.body.emailDetail).toContain("smtp down");
    expect(mockCommit).toHaveBeenCalledTimes(1);
  });
});
