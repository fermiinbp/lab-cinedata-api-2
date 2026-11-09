process.env.JWT_SECRET = "secreto-de-test";

jest.mock("../src/services/auth.service.js", () => ({
    registrar: jest.fn(),
    login: jest.fn().mockResolvedValue(null),
    buscarPorId: jest.fn(),
}));

const express = require("express");
const request = require("supertest");
const authRoutes = require("../src/routes/auth.routes.js");

// Archivo propio: el limitador es de módulo y no debe contaminar otros tests
const app = express();
app.use(express.json());
app.use("/auth", authRoutes);
app.use(require("../src/middlewares/manejarErrores.js"));

describe("rate limit de /auth", () => {
    test("la petición 11 a /auth/login devuelve 429 con {error}", async () => {
        const body = { email: "ana@lab.com", password: "mala" };
        for (let i = 0; i < 10; i++) {
            const res = await request(app).post("/auth/login").send(body);
            expect(res.status).toBe(401);
        }
        const res = await request(app).post("/auth/login").send(body);
        expect(res.status).toBe(429);
        expect(typeof res.body.error).toBe("string");
    });

    test("el límite se comparte con /auth/registro", async () => {
        const res = await request(app).post("/auth/registro")
            .send({ nombre: "A", email: "a@lab.com", password: "123456" });
        expect(res.status).toBe(429);
    });
});
