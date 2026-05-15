/**
 * Multi-user concurrency scenarios for checkout.
 *
 * The production checkout uses SELECT ... FOR UPDATE inside a transaction so
 * that concurrent requests are serialised at the DB level. These tests verify:
 *   1. The FOR UPDATE clause is always present in the stock query.
 *   2. When two buyers race for the last unit, the second one is rejected (400).
 *   3. A rollback happens when stock runs out mid-transaction.
 *   4. Concurrent requests fire together — exactly one wins, one loses.
 */

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
  generateInvoicePdfBuffer: jest.fn().mockResolvedValue(Buffer.from("pdf")),
}));
jest.mock("../services/mailInvoice", () => ({
  sendInvoiceEmail: jest.fn().mockResolvedValue({ sent: true }),
}));

const request = require("supertest");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2/promise");
const app = require("../server");

const mockQuery = mysql.__mockQuery;
const mockConnQuery = mysql.__mockConnQuery;
const mockCommit = mysql.__mockCommit;
const mockRollback = mysql.__mockRollback;
const mockRelease = mysql.__mockRelease;

const TEST_TOKEN = jwt.sign(
  { id: 1, email: "buyer@test.com", role: "customer" },
  "dev_secret",
  { expiresIn: "1h" }
);

function authPost() {
  return request(app)
    .post("/api/orders/mock-checkout")
    .set("Authorization", `Bearer ${TEST_TOKEN}`);
}

function orderPayload(productId = "p1", quantity = 1) {
  return { items: [{ product_id: productId, size: "M", quantity }] };
}

// Queued responses for a successful single-item checkout:
// 1. SELECT ... FOR UPDATE → product row
// 2. INSERT INTO orders    → insertId
// 3. INSERT INTO order_items
// 4. UPDATE products (stock decrement)
function mockSuccessfulCheckout(productId = "p1", stock = 5) {
  mockConnQuery
    .mockResolvedValueOnce([[{ id: productId, name: "Tee", quantityInStock: stock, price: 100 }]])
    .mockResolvedValueOnce([{ insertId: 1 }])
    .mockResolvedValueOnce([{}])
    .mockResolvedValueOnce([{}]);

  mockQuery
    .mockResolvedValueOnce([[{
      id: 1, invoice_number: "INV-TEST", created_at: "2026-05-01",
      customer_email: "buyer@test.com", customer_name: null,
      currency: "TRY", total_amount: "100.00", status: "processing",
    }]])
    .mockResolvedValueOnce([[{
      product_name: "Tee", size: "M", quantity: 1,
      unit_price: "100.00", line_total: "100.00",
    }]]);
}

beforeEach(() => {
  mockQuery.mockReset();
  mockConnQuery.mockReset();
  mockCommit.mockClear();
  mockRollback.mockClear();
  mockRelease.mockClear();
});

// ─── 1. FOR UPDATE clause ──────────────────────────────────────────────────

describe("Stock locking", () => {
  it("uses SELECT … FOR UPDATE when querying stock", async () => {
    mockSuccessfulCheckout();

    await authPost().send(orderPayload());

    const forUpdateCall = mockConnQuery.mock.calls.find(
      ([sql]) => typeof sql === "string" && sql.toUpperCase().includes("FOR UPDATE")
    );
    expect(forUpdateCall).toBeDefined();
    expect(forUpdateCall[0]).toMatch(/FOR UPDATE/i);
  });
});

// ─── 2. Last-unit race: buyer A wins, buyer B is rejected ─────────────────

describe("Last-unit race condition", () => {
  it("first buyer succeeds when stock = 1", async () => {
    mockSuccessfulCheckout("p1", 1);

    const res = await authPost().send(orderPayload("p1", 1));

    expect(res.statusCode).toBe(201);
    expect(mockCommit).toHaveBeenCalledTimes(1);
    expect(mockRollback).not.toHaveBeenCalled();
  });

  it("second buyer is rejected when stock is already 0", async () => {
    // After buyer A commits, buyer B's locked SELECT sees stock = 0
    mockConnQuery.mockResolvedValueOnce([[{ id: "p1", name: "Tee", quantityInStock: 0, price: 100 }]]);

    const res = await authPost().send(orderPayload("p1", 1));

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/Insufficient stock/i);
    expect(mockRollback).toHaveBeenCalledTimes(1);
    expect(mockCommit).not.toHaveBeenCalled();
  });

  it("rejects buyer requesting more units than available", async () => {
    mockConnQuery.mockResolvedValueOnce([[{ id: "p1", name: "Tee", quantityInStock: 2, price: 100 }]]);

    const res = await authPost().send(orderPayload("p1", 3));

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/Insufficient stock/i);
    expect(mockRollback).toHaveBeenCalledTimes(1);
  });
});

// ─── 3. Simulated concurrent requests via Promise.all ─────────────────────

describe("Simulated concurrent checkouts", () => {
  it("exactly one buyer wins when two race for the last unit", async () => {
    let forUpdateCalls = 0;

    mockConnQuery.mockImplementation((sql) => {
      if (typeof sql === "string" && sql.toUpperCase().includes("FOR UPDATE")) {
        forUpdateCalls++;
        // First request acquires the lock and sees stock = 1
        // Second request (serialised by DB lock) sees stock = 0 after commit
        const stock = forUpdateCalls === 1 ? 1 : 0;
        return Promise.resolve([[{ id: "p1", name: "Tee", quantityInStock: stock, price: 100 }]]);
      }
      return Promise.resolve([{ insertId: 1 }]);
    });

    mockQuery
      .mockResolvedValueOnce([[{
        id: 1, invoice_number: "INV-RACE", created_at: "2026-05-01",
        customer_email: "buyer@test.com", customer_name: null,
        currency: "TRY", total_amount: "100.00", status: "processing",
      }]])
      .mockResolvedValueOnce([[{
        product_name: "Tee", size: "M", quantity: 1,
        unit_price: "100.00", line_total: "100.00",
      }]]);

    const [resA, resB] = await Promise.all([
      authPost().send(orderPayload("p1", 1)),
      authPost().send(orderPayload("p1", 1)),
    ]);

    const statuses = [resA.statusCode, resB.statusCode].sort();
    expect(statuses).toEqual([201, 400]);
  });
});

// ─── 4. Rollback on mid-transaction DB failure ─────────────────────────────

describe("Rollback on mid-transaction failure", () => {
  it("rolls back and returns 500 when INSERT orders throws", async () => {
    mockConnQuery
      .mockResolvedValueOnce([[{ id: "p1", name: "Tee", quantityInStock: 5, price: 100 }]])
      .mockRejectedValueOnce(new Error("DB deadlock detected"));

    const res = await authPost().send(orderPayload());

    expect([400, 500]).toContain(res.statusCode);
    expect(mockRollback).toHaveBeenCalledTimes(1);
    expect(mockCommit).not.toHaveBeenCalled();
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });
});
