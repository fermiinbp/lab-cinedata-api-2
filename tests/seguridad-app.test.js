process.env.JWT_SECRET = "secreto-de-test";
process.env.CORS_ORIGIN = "http://localhost:5500";

jest.mock("../src/models/Pelicula.js", () => ({ find: jest.fn() }));
jest.mock("../src/models/Usuario.js", () => ({ findOne: jest.fn() }));

const request = require("supertest");
const app = require("../src/app.js");

describe("helmet", () => {
    test("las respuestas traen cabeceras de seguridad", async () => {
        const res = await request(app).get("/api-docs.json");
        expect(res.headers["x-content-type-options"]).toBe("nosniff");
        expect(res.headers["content-security-policy"]).toBeDefined();
    });
});

describe("swagger", () => {
    test("GET /api-docs.json incluye securitySchemes.bearerAuth", async () => {
        const res = await request(app).get("/api-docs.json");
        expect(res.status).toBe(200);
        expect(res.body.components.securitySchemes.bearerAuth).toBeDefined();
    });
});
