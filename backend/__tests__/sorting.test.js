jest.mock("mysql2/promise", () => {
  const mockQuery = jest.fn();
  return {
    createPool: () => ({ query: mockQuery, getConnection: jest.fn() }),
    __mockQuery: mockQuery,
  };
});

const request = require("supertest");
const mysql = require("mysql2/promise");
const app = require("../server");

const mockQuery = mysql.__mockQuery;

beforeEach(() => {
  mockQuery.mockReset();
});

describe("GET /api/products sorting", () => {
  it("sort=price_asc returns 200 and calls DB with ORDER BY price ASC", async () => {
    mockQuery.mockResolvedValueOnce([
      [
        { id: "p1", name: "Cheap", price: 10, images: "[]" },
        { id: "p2", name: "Mid",   price: 20, images: "[]" },
        { id: "p3", name: "Pricey", price: 30, images: "[]" },
      ],
    ]);

    const res = await request(app).get("/api/products?sort=price_asc");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(mockQuery).toHaveBeenCalledWith(
      "SELECT * FROM products ORDER BY price ASC"
    );
  });

  it("sort=price_desc returns 200 and calls DB with ORDER BY price DESC", async () => {
    mockQuery.mockResolvedValueOnce([
      [
        { id: "p3", name: "Pricey", price: 30, images: "[]" },
        { id: "p2", name: "Mid",   price: 20, images: "[]" },
        { id: "p1", name: "Cheap", price: 10, images: "[]" },
      ],
    ]);

    const res = await request(app).get("/api/products?sort=price_desc");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(mockQuery).toHaveBeenCalledWith(
      "SELECT * FROM products ORDER BY price DESC"
    );
  });

  it("sort=popularity returns 200 and response body is an array", async () => {
    mockQuery.mockResolvedValueOnce([
      [
        { id: "p1", name: "Popular", popularity: 99, images: "[]" },
        { id: "p2", name: "Meh",     popularity: 5,  images: "[]" },
      ],
    ]);

    const res = await request(app).get("/api/products?sort=popularity");

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(mockQuery).toHaveBeenCalledWith(
      "SELECT * FROM products ORDER BY popularity DESC"
    );
  });
});
