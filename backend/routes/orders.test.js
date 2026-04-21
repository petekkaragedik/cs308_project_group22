const { roundMoney, buildPayloadFromRows, mapCheckoutError } = require("./orders");

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
        product_name: "Board",
        size: "M",
        quantity: 2,
        unit_price: "49.95",
        line_total: "99.90",
      },
      {
        product_name: "Wax",
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
          { productName: "Board", size: "M", quantity: 2, unitPrice: 49.95, lineTotal: 99.9 },
          { productName: "Wax", size: "OS", quantity: 1, unitPrice: 100, lineTotal: 100 },
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
