const { roundMoney, buildPayloadFromRows, mapCheckoutError, checkCancelEligibility } = require("../routes/orders");

describe("orders helpers - unit tests", () => {
  describe("roundMoney", () => {
    test("1. rounds to two decimal places", () => {
      expect(roundMoney(1.234)).toBe(1.23);
      expect(roundMoney(1.236)).toBe(1.24);
    });

    test("2. leaves already-rounded values unchanged", () => {
      expect(roundMoney(19.99)).toBe(19.99);
    });

    test("3. coerces numeric strings to numbers", () => {
      expect(roundMoney("12.345")).toBe(12.35);
    });

    test("4. handles zero and negative values", () => {
      expect(roundMoney(0)).toBe(0);
      expect(roundMoney(-2.346)).toBe(-2.35);
    });
  });

  describe("buildPayloadFromRows", () => {
    const orderRow = {
      invoice_number: "INV-1",
      created_at: "2026-04-21T10:00:00Z",
      customer_email: "a@b.com",
      customer_name: "Ada",
      currency: "TRY",
      total_amount: "199.90",
    };
    const itemRows = [
      {
        product_id: "BOARD-1",
        product_name: "Board",
        color: "blue",
        size: "M",
        quantity: 2,
        unit_price: "49.95",
        line_total: "99.90",
      },
      {
        product_id: "WAX-1",
        product_name: "Wax",
        color: null,
        size: "OS",
        quantity: 1,
        unit_price: "100.00",
        line_total: "100.00",
      },
    ];

    test("5. maps order + item rows into a normalized payload", () => {
      expect(buildPayloadFromRows(orderRow, itemRows)).toEqual({
        invoiceNumber: "INV-1",
        issuedAt: "2026-04-21T10:00:00Z",
        customerEmail: "a@b.com",
        customerName: "Ada",
        currency: "TRY",
        total: 199.9,
        lines: [
          { productId: "BOARD-1", productName: "Board", color: "blue", size: "M", quantity: 2, unitPrice: 49.95, lineTotal: 99.9 },
          { productId: "WAX-1", productName: "Wax", color: null, size: "OS", quantity: 1, unitPrice: 100, lineTotal: 100 },
        ],
      });
    });

    test("6. converts string numeric totals/prices to numbers", () => {
      const payload = buildPayloadFromRows(orderRow, itemRows);
      expect(typeof payload.total).toBe("number");
      expect(typeof payload.lines[0].unitPrice).toBe("number");
      expect(typeof payload.lines[0].lineTotal).toBe("number");
    });

    test("7. defaults currency to TRY when row currency is falsy", () => {
      const payload = buildPayloadFromRows({ ...orderRow, currency: null }, []);
      expect(payload.currency).toBe("TRY");
      expect(payload.lines).toEqual([]);
    });
  });

  describe("checkCancelEligibility", () => {
    const userId = 42;
    const processingOrder = { id: 1, user_id: userId, status: "processing" };

    function catchErr(fn) {
      try { fn(); } catch (e) { return e; }
    }

    test("11. does not throw for a processing order owned by the user (successful cancellation)", () => {
      expect(() => checkCancelEligibility(processingOrder, userId)).not.toThrow();
    });

    test("12. throws 404 when order does not exist", () => {
      const err = catchErr(() => checkCancelEligibility(null, userId));
      expect(err.message).toBe("Order not found");
      expect(err.statusCode).toBe(404);
    });

    test("13. throws 403 when order belongs to a different user", () => {
      const err = catchErr(() => checkCancelEligibility(processingOrder, 99));
      expect(err.message).toBe("This order does not belong to your account");
      expect(err.statusCode).toBe(403);
    });

    test("14. throws 409 when order is in_transit", () => {
      const err = catchErr(() => checkCancelEligibility({ ...processingOrder, status: "in_transit" }, userId));
      expect(err.message).toBe("Order cannot be cancelled after shipment");
      expect(err.statusCode).toBe(409);
    });

    test("15. throws 409 when order is delivered", () => {
      const err = catchErr(() => checkCancelEligibility({ ...processingOrder, status: "delivered" }, userId));
      expect(err.message).toBe("Order cannot be cancelled after delivery");
      expect(err.statusCode).toBe(409);
    });

    test("16. throws 409 when order is already cancelled", () => {
      const err = catchErr(() => checkCancelEligibility({ ...processingOrder, status: "cancelled" }, userId));
      expect(err.message).toBe("Order is already cancelled");
      expect(err.statusCode).toBe(409);
    });
  });

  describe("mapCheckoutError", () => {
    test("8. maps missing-table errors to the setup hint", () => {
      const msg = mapCheckoutError({ code: "ER_NO_SUCH_TABLE" });
      expect(msg).toMatch(/setup\.js/);
    });

    test("9. maps MySQL connection errors to a connectivity message", () => {
      const refused = mapCheckoutError({ code: "ECONNREFUSED" });
      const timedOut = mapCheckoutError({ code: "ETIMEDOUT" });
      expect(refused).toMatch(/MySQL/);
      expect(timedOut).toMatch(/MySQL/);
    });

    test("10. falls back to a generic checkout failure message for unknown codes", () => {
      expect(mapCheckoutError({ code: "SOMETHING_ELSE" })).toBe(
        "Checkout failed. Backend terminalindeki hataya bak veya setup/seed çalıştır."
      );
      expect(mapCheckoutError({})).toBe(
        "Checkout failed. Backend terminalindeki hataya bak veya setup/seed çalıştır."
      );
    });
  });
});
