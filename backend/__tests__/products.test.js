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
const app = require("../server");

const mockQuery = mysql.__mockQuery;

beforeEach(() => {
  mockQuery.mockReset();
});

describe("GET /api/products", () => {
  it("returns paginated products and parses string images into arrays", async () => {
    // The endpoint runs COUNT + data queries in parallel via Promise.all
    mockQuery.mockResolvedValueOnce([[{ total: 2 }], []]);
    mockQuery.mockResolvedValueOnce([
      [
        { id: "p1", name: "Board A", model: "m", images: '["a.png","b.png"]' },
        { id: "p2", name: "Board B", model: "m", images: ["c.png"] },
      ],
      [],
    ]);

    const res = await request(app).get("/api/products");

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].images).toEqual(["a.png", "b.png"]);
    expect(res.body.data[1].images).toEqual(["c.png"]);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBe(2);
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });
});

describe("GET /api/products/search", () => {
  it("returns matching products when a query string is provided", async () => {
    mockQuery.mockResolvedValueOnce([
      [{ id: "p1", name: "surfboard", description: "blue", images: "[]" }],
    ]);

    const res = await request(app).get("/api/products/search?q=surf");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe("p1");
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ["%surf%", "%surf%"]);
  });

  it("returns 400 when the query string is missing or empty", async () => {
    const missing = await request(app).get("/api/products/search");
    const empty = await request(app).get("/api/products/search?q=");
    const whitespace = await request(app).get("/api/products/search?q=%20%20");

    expect(missing.statusCode).toBe(400);
    expect(empty.statusCode).toBe(400);
    expect(whitespace.statusCode).toBe(400);
    expect(missing.body.message).toBe("Search query is required");
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

describe("GET /api/products/category/:categoryName", () => {
  it("filters products by category name with pagination", async () => {
    // The endpoint runs COUNT + data queries in parallel via Promise.all
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([
      [{ id: "p1", categoryName: "surfboards", images: '["a.png"]' }],
      [],
    ]);

    const res = await request(app).get("/api/products/category/surfboards");

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].images).toEqual(["a.png"]);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBe(1);
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });
});

describe("GET /api/products/:id", () => {
  it("returns 404 when the product does not exist", async () => {
    mockQuery.mockResolvedValueOnce([[]]);

    const res = await request(app).get("/api/products/does-not-exist");

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Product not found");
  });

  it("returns the product along with its model variants", async () => {
    mockQuery.mockResolvedValueOnce([
      [{ id: "p1", name: "Sunset Red", model: "sunset", images: '["a.png"]' }],
    ]);
    mockQuery.mockResolvedValueOnce([
      [{ id: "p2", name: "Sunset Blue", model: "sunset", images: '["b.png"]' }],
    ]);

    const res = await request(app).get("/api/products/p1");

    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe("p1");
    expect(res.body.images).toEqual(["a.png"]);
    expect(res.body.modelVariants).toHaveLength(1);
    expect(res.body.modelVariants[0].id).toBe("p2");
    expect(res.body.modelVariants[0].images).toEqual(["b.png"]);
  });
});

describe("GET /api/categories", () => {
  it("returns a flat array of distinct category names", async () => {
    mockQuery.mockResolvedValueOnce([
      [{ categoryName: "boards" }, { categoryName: "wax" }, { categoryName: "wetsuits" }],
    ]);

    const res = await request(app).get("/api/categories");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(["boards", "wax", "wetsuits"]);
  });
});
