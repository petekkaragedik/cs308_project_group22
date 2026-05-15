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
const app = require("../server");

async function resetCart() {
  const res = await request(app).get("/api/cart");
  for (const item of res.body) {
    await request(app).delete(`/api/cart/${item.id}`);
  }
}

beforeEach(async () => {
  await resetCart();
});

describe("GET /api/cart", () => {
  it("returns an empty array when the cart is empty", async () => {
    const res = await request(app).get("/api/cart");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns all current items in the cart", async () => {
    await request(app).post("/api/cart").send({ product_id: "p1", size: "M" });
    await request(app).post("/api/cart").send({ product_id: "p2", size: "L" });

    const res = await request(app).get("/api/cart");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.map((i) => i.product_id).sort()).toEqual(["p1", "p2"]);
  });
});

describe("POST /api/cart", () => {
  it("adds a new item with quantity 1 and returns 201", async () => {
    const res = await request(app).post("/api/cart").send({ product_id: "p1", size: "M" });
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(Number),
      product_id: "p1",
      size: "M",
      quantity: 1,
    });
  });

  it("increments quantity when the same product_id + size is added again", async () => {
    const first = await request(app).post("/api/cart").send({ product_id: "p1", size: "M" });
    const second = await request(app).post("/api/cart").send({ product_id: "p1", size: "M" });

    expect(second.statusCode).toBe(200);
    expect(second.body.id).toBe(first.body.id);
    expect(second.body.quantity).toBe(2);

    const list = await request(app).get("/api/cart");
    expect(list.body).toHaveLength(1);
  });

  it("treats the same product_id with a different size as a separate item", async () => {
    await request(app).post("/api/cart").send({ product_id: "p1", size: "M" });
    await request(app).post("/api/cart").send({ product_id: "p1", size: "L" });

    const list = await request(app).get("/api/cart");
    expect(list.body).toHaveLength(2);
  });

  it("returns 400 when product_id or size is missing", async () => {
    const noSize = await request(app).post("/api/cart").send({ product_id: "p1" });
    const noProduct = await request(app).post("/api/cart").send({ size: "M" });
    const empty = await request(app).post("/api/cart").send({});

    expect(noSize.statusCode).toBe(400);
    expect(noProduct.statusCode).toBe(400);
    expect(empty.statusCode).toBe(400);
    expect(noSize.body.message).toBe("product_id and size are required");
  });
});

describe("PUT /api/cart/:id", () => {
  it("updates the quantity of an existing cart item", async () => {
    const added = await request(app).post("/api/cart").send({ product_id: "p1", size: "M" });

    const res = await request(app)
      .put(`/api/cart/${added.body.id}`)
      .send({ quantity: 5 });

    expect(res.statusCode).toBe(200);
    expect(res.body.quantity).toBe(5);
  });

  it("returns 400 when quantity is less than 1", async () => {
    const added = await request(app).post("/api/cart").send({ product_id: "p1", size: "M" });

    const zero = await request(app).put(`/api/cart/${added.body.id}`).send({ quantity: 0 });
    const negative = await request(app).put(`/api/cart/${added.body.id}`).send({ quantity: -2 });

    expect(zero.statusCode).toBe(400);
    expect(negative.statusCode).toBe(400);
    expect(zero.body.message).toBe("quantity must be at least 1");
  });

  it("returns 404 when the cart item id does not exist", async () => {
    const res = await request(app).put("/api/cart/99999").send({ quantity: 3 });
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Cart item not found");
  });
});

describe("DELETE /api/cart/:id", () => {
  it("removes an existing cart item", async () => {
    const added = await request(app).post("/api/cart").send({ product_id: "p1", size: "M" });

    const res = await request(app).delete(`/api/cart/${added.body.id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Item removed");

    const list = await request(app).get("/api/cart");
    expect(list.body).toEqual([]);
  });

  it("returns 404 when trying to delete a non-existent cart item", async () => {
    const res = await request(app).delete("/api/cart/99999");
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Cart item not found");
  });
});
