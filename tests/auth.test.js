process.env.JWT_SECRET = "secreto-de-test";

jest.mock("../src/models/Usuario.js", () => ({
    findOne: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
}));
jest.mock("../src/services/auth.service.js", () => ({
    registrar: jest.fn(),
    login: jest.fn(),
    buscarPorId: jest.fn(),
}));

const express = require("express");
const request = require("supertest");
const Usuario = require("../src/models/Usuario.js");
const authService = require("../src/services/auth.service.js");

// Router nuevo por test: el rate limit vive en memoria a nivel de módulo
function crearApp() {
    let app;
    jest.isolateModules(() => {
        const authRoutes = require("../src/routes/auth.routes.js");
        app = express();
        app.use(express.json());
        app.use("/auth", authRoutes);
        app.use(require("../src/middlewares/manejarErrores.js"));
    });
    return app;
}

let app;
beforeEach(() => {
    jest.clearAllMocks();
    app = crearApp();
});

describe("POST /auth/login - validación (400)", () => {
    test.each([
        ["email objeto {$gt}", { email: { $gt: "" }, password: "ana123" }],
        ["password objeto", { email: "ana@lab.com", password: { $ne: null } }],
        ["sin campos", {}],
        ["email mal formado", { email: "no-es-email", password: "ana123" }],
    ])("%s devuelve 400", async (_, body) => {
        const res = await request(app).post("/auth/login").send(body);
        expect(res.status).toBe(400);
        expect(Array.isArray(res.body.detalles)).toBe(true);
        expect(Usuario.findOne).not.toHaveBeenCalled();
        expect(authService.login).not.toHaveBeenCalled();
    });

    test("credenciales válidas llegan al servicio", async () => {
        authService.login.mockResolvedValue({ token: "t" });
        const res = await request(app).post("/auth/login").send({ email: "ana@lab.com", password: "ana123" });
        expect(res.status).toBe(200);
        expect(authService.login).toHaveBeenCalledWith("ana@lab.com", "ana123");
    });
});

describe("POST /auth/registro - validación", () => {
    test("password de 5 caracteres devuelve 400", async () => {
        const res = await request(app).post("/auth/registro")
            .send({ nombre: "Ana", email: "ana@lab.com", password: "12345" });
        expect(res.status).toBe(400);
        expect(Array.isArray(res.body.detalles)).toBe(true);
        expect(authService.registrar).not.toHaveBeenCalled();
    });

    test("sin nombre devuelve 400", async () => {
        const res = await request(app).post("/auth/registro")
            .send({ email: "ana@lab.com", password: "123456" });
        expect(res.status).toBe(400);
        expect(authService.registrar).not.toHaveBeenCalled();
    });

    test("registro válido devuelve 201", async () => {
        authService.registrar.mockResolvedValue({ token: "t" });
        const res = await request(app).post("/auth/registro")
            .send({ nombre: "Ana", email: "ana@lab.com", password: "123456" });
        expect(res.status).toBe(201);
    });
});
