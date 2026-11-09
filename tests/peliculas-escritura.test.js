process.env.JWT_SECRET = "secreto-de-test";

jest.mock("../src/services/pelicula.service.js", () => ({
    esIdValido: jest.fn(() => true),
    crear: jest.fn(),
    actualizar: jest.fn(),
    eliminar: jest.fn(),
}));

const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const service = require("../src/services/pelicula.service.js");
const peliculaRoutes = require("../src/routes/pelicula.routes.js");

const app = express();
app.use(express.json());
app.use("/peliculas", peliculaRoutes);
app.use(require("../src/middlewares/manejarErrores.js"));

const token = rol => jwt.sign({ id: "u1", rol }, process.env.JWT_SECRET);
const admin = () => `Bearer ${token("admin")}`;
const ID = "507f1f77bcf86cd799439011";

const valida = () => ({
    titulo: "Coco", anio: 2017, generos: ["Animación"], nota: 8.4, duracion: 105,
    director: { nombre: "Lee Unkrich", pais: "US" }, disponible: true,
});

beforeEach(() => {
    jest.clearAllMocks();
    service.esIdValido.mockReturnValue(true);
    service.crear.mockImplementation(async d => d);
    service.actualizar.mockImplementation(async (id, d) => ({ id, ...d }));
});

describe("control de acceso", () => {
    test("PUT sin token devuelve 401", async () => {
        const res = await request(app).put(`/peliculas/${ID}`).send({ titulo: "X" });
        expect(res.status).toBe(401);
        expect(service.actualizar).not.toHaveBeenCalled();
    });

    test("PUT con rol usuario devuelve 403", async () => {
        const res = await request(app).put(`/peliculas/${ID}`)
            .set("Authorization", `Bearer ${token("usuario")}`).send({ titulo: "X" });
        expect(res.status).toBe(403);
        expect(service.actualizar).not.toHaveBeenCalled();
    });

    test("POST con rol usuario devuelve 403", async () => {
        const res = await request(app).post("/peliculas")
            .set("Authorization", `Bearer ${token("usuario")}`).send(valida());
        expect(res.status).toBe(403);
        expect(service.crear).not.toHaveBeenCalled();
    });

    test("PUT admin con body válido devuelve 200 y el servicio recibe la lista blanca", async () => {
        const res = await request(app).put(`/peliculas/${ID}`)
            .set("Authorization", admin()).send(valida());
        expect(res.status).toBe(200);
        expect(service.actualizar).toHaveBeenCalledWith(ID, valida());
    });

    test("PUT admin con cambio parcial solo pasa esos campos", async () => {
        const res = await request(app).put(`/peliculas/${ID}`)
            .set("Authorization", admin()).send({ nota: 9 });
        expect(res.status).toBe(200);
        expect(service.actualizar).toHaveBeenCalledWith(ID, { nota: 9 });
    });

    test("POST admin con body válido devuelve 201", async () => {
        const res = await request(app).post("/peliculas")
            .set("Authorization", admin()).send(valida());
        expect(res.status).toBe(201);
        expect(service.crear).toHaveBeenCalledWith(valida());
    });
});

describe.each([
    ["POST", () => request(app).post("/peliculas")],
    ["PUT", () => request(app).put(`/peliculas/${ID}`)],
])("%s - lista blanca (400)", (_, crearPeticion) => {
    const enviar = body => crearPeticion().set("Authorization", admin()).send(body);

    test.each([
        ["campo desconocido (rol)", { ...valida(), rol: "admin" }],
        ["clave con $ ($set)", { ...valida(), $set: { rol: "admin" } }],
        ["clave con punto", { ...valida(), "director.pais": "ES" }],
        ["titulo objeto {$ne:1}", { ...valida(), titulo: { $ne: 1 } }],
        ["anio string", { ...valida(), anio: "2000" }],
        ["nota 11", { ...valida(), nota: 11 }],
        ["generos no array", { ...valida(), generos: "x" }],
        ["disponible string", { ...valida(), disponible: "true" }],
        ["director con clave desconocida", { ...valida(), director: { nombre: "A", rol: "x" } }],
        ["director con clave $", { ...valida(), director: { nombre: "A", $gt: 1 } }],
        ["director sin nombre", { ...valida(), director: { pais: "ES" } }],
    ])("%s devuelve 400 con detalles", async (__, body) => {
        const res = await enviar(body);
        expect(res.status).toBe(400);
        expect(typeof res.body.error).toBe("string");
        expect(Array.isArray(res.body.detalles)).toBe(true);
        expect(res.body.detalles.length).toBeGreaterThan(0);
        expect(res.body.detalles.every(d => typeof d === "string")).toBe(true);
        expect(service.crear).not.toHaveBeenCalled();
        expect(service.actualizar).not.toHaveBeenCalled();
    });

    test("body que es un array devuelve 400", async () => {
        const res = await enviar([valida()]);
        expect(res.status).toBe(400);
        expect(Array.isArray(res.body.detalles)).toBe(true);
    });

    test("clave extra con body válido: 400 y no llega al servicio", async () => {
        const res = await enviar({ ...valida(), extra: 1 });
        expect(res.status).toBe(400);
        expect(service.crear).not.toHaveBeenCalled();
        expect(service.actualizar).not.toHaveBeenCalled();
    });
});

describe("POST - campos obligatorios (400)", () => {
    test.each(["titulo", "anio", "director"])("sin %s devuelve 400", async campo => {
        const body = valida();
        delete body[campo];
        const res = await request(app).post("/peliculas").set("Authorization", admin()).send(body);
        expect(res.status).toBe(400);
        expect(Array.isArray(res.body.detalles)).toBe(true);
        expect(service.crear).not.toHaveBeenCalled();
    });
});
