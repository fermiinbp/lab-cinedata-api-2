// Se mockea el modelo (sin Mongo real): find().sort().limit() se encadena con mockReturnThis.
jest.mock("../src/models/Pelicula.js", () => ({
    find: jest.fn(),
    sort: jest.fn(),
    limit: jest.fn(),
    findById: jest.fn(),
}));

const express = require("express");
const request = require("supertest");
const Pelicula = require("../src/models/Pelicula.js");
const peliculaRoutes = require("../src/routes/pelicula.routes.js");
const swaggerSpec = require("../src/config/swagger.js");

// Solo el router, montado en un express() mínimo
const app = express();
app.use(express.json());
app.use("/peliculas", peliculaRoutes);
app.use(require("../src/middlewares/manejarErrores.js"));

function peli(titulo, anio) {
    const datos = { id: `id-${titulo}`, titulo, anio, nota: 8, duracion: 120, director: { nombre: "X" } };
    return { ...datos, resumen: () => datos };
}

function mockResultados(docs) {
    Pelicula.find.mockReturnThis();
    Pelicula.sort.mockReturnThis();
    Pelicula.limit.mockResolvedValue(docs);
}

beforeEach(() => {
    jest.clearAllMocks();
    mockResultados([]);
});

describe("GET /peliculas/buscar - casos válidos (200)", () => {
    test("q=co devuelve 200 con array de resúmenes", async () => {
        // Arrange
        mockResultados([peli("Coco", 2017), peli("El padrino", 1972)]);
        // Act
        const res = await request(app).get("/peliculas/buscar?q=co");
        // Assert
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.map(p => p.titulo)).toEqual(["Coco", "El padrino"]);
    });

    test("busca sin distinguir mayúsculas, por año descendente y máximo 20", async () => {
        // Act
        await request(app).get("/peliculas/buscar?q=Co");
        // Assert
        expect(Pelicula.find).toHaveBeenCalledWith({ titulo: { $regex: "Co", $options: "i" } });
        expect(Pelicula.sort.mock.calls[0][0]).toMatchObject({ anio: -1 });
        expect(Object.keys(Pelicula.sort.mock.calls[0][0])[0]).toBe("anio");
        expect(Pelicula.limit).toHaveBeenCalledWith(20);
    });

    test("q=' asbfyh' sin resultados devuelve 200 con [] y el texto recortado", async () => {
        // Act
        const res = await request(app).get("/peliculas/buscar?q=%20asbfyh");
        // Assert
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
        expect(Pelicula.find.mock.calls[0][0].titulo.$regex).toBe("asbfyh");
    });

    test("escapa los caracteres especiales de regex", async () => {
        // Act
        const res = await request(app).get(`/peliculas/buscar?q=${encodeURIComponent(".*(a")}`);
        // Assert
        expect(res.status).toBe(200);
        expect(Pelicula.find.mock.calls[0][0].titulo.$regex).toBe("\\.\\*\\(a");
    });

    test("acepta q de 30 caracteres", async () => {
        const res = await request(app).get(`/peliculas/buscar?q=${"a".repeat(30)}`);
        expect(res.status).toBe(200);
    });
});

describe("GET /peliculas/buscar - validación (400)", () => {
    test.each([
        ["sin q", "/peliculas/buscar"],
        ["q=c (1 carácter)", "/peliculas/buscar?q=c"],
        ["q vacía", "/peliculas/buscar?q="],
        ["q solo espacios", "/peliculas/buscar?q=%20%20%20"],
        ["q de 31 caracteres", `/peliculas/buscar?q=${"a".repeat(31)}`],
        ["q repetida (array)", "/peliculas/buscar?q=ab&q=cd"],
    ])("%s devuelve 400", async (_, url) => {
        // Act
        const res = await request(app).get(url);
        // Assert
        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Datos no válidos");
        expect(Array.isArray(res.body.detalles)).toBe(true);
        expect(Pelicula.find).not.toHaveBeenCalled();
    });
});

describe("enrutado y acceso", () => {
    test("/buscar no es capturada por /:id", async () => {
        const res = await request(app).get("/peliculas/buscar?q=co");
        expect(res.status).toBe(200);
        expect(Pelicula.findById).not.toHaveBeenCalled();
    });

    test("es pública: no necesita token", async () => {
        const res = await request(app).get("/peliculas/buscar?q=co");
        expect(res.status).not.toBe(401);
    });
});

describe("swagger", () => {
    test("'/peliculas/buscar' aparece en swaggerSpec.paths", () => {
        expect(Object.keys(swaggerSpec.paths || {})).toContain("/peliculas/buscar");
    });
});
