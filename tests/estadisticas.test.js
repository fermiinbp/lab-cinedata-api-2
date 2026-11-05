process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

// Se mockea el modelo (sin Mongo real): aggregate ejecuta las etapas del pipeline en memoria.
jest.mock("../src/models/Pelicula.js", () => ({
    aggregate: jest.fn(),
    findById: jest.fn(),
}));

const request = require("supertest");
const Pelicula = require("../src/models/Pelicula.js");
const app = require("../src/app.js");
const service = require("../src/services/pelicula.service.js");
const swaggerSpec = require("../src/config/swagger.js");

const PELICULAS = [
    { generos: ["Drama", "Crimen"], nota: 9 },
    { generos: ["Drama"], nota: 8 },
    { generos: ["Drama", "Animación"], nota: 7 },
    { generos: ["Animación"], nota: 9.5 },
    { generos: ["Crimen"], nota: 8.555 },
];

// Intérprete mínimo de las etapas usadas por estadisticasPorGenero
function ejecutarPipeline(pipeline) {
    let docs = PELICULAS;
    for (const etapa of pipeline) {
        if (etapa.$unwind) {
            docs = docs.flatMap(d => d.generos.map(g => ({ ...d, generos: g })));
        } else if (etapa.$group) {
            const grupos = new Map();
            for (const d of docs) {
                const g = grupos.get(d.generos) || { _id: d.generos, total: 0, suma: 0 };
                g.total += 1;
                g.suma += d.nota;
                grupos.set(d.generos, g);
            }
            docs = [...grupos.values()].map(g => ({ _id: g._id, total: g.total, notaMedia: g.suma / g.total }));
        } else if (etapa.$match) {
            docs = docs.filter(d => d.total >= etapa.$match.total.$gte);
        } else if (etapa.$sort) {
            docs = [...docs].sort((a, b) => b.notaMedia - a.notaMedia);
        } else if (etapa.$project) {
            docs = docs.map(d => ({ genero: d._id, total: d.total, notaMedia: Math.round(d.notaMedia * 100) / 100 }));
        }
    }
    return docs;
}

beforeAll(() => jest.spyOn(console, "log").mockImplementation(() => {}));
afterAll(() => console.log.mockRestore());

beforeEach(() => {
    Pelicula.aggregate.mockReset();
    Pelicula.aggregate.mockImplementation(async pipeline => ejecutarPipeline(pipeline));
    Pelicula.findById.mockReset();
});

describe("GET /peliculas/estadisticas - validación (400)", () => {
    test.each(["0", "51", "abc", "1.5"])("minimo=%s devuelve 400", async valor => {
        // Arrange
        const url = `/peliculas/estadisticas?minimo=${valor}`;
        // Act
        const res = await request(app).get(url);
        // Assert
        expect(res.status).toBe(400);
        expect(res.body).toEqual({
            error: "Datos no válidos",
            detalles: ["minimo debe ser un entero entre 1 y 50"],
        });
        expect(Pelicula.aggregate).not.toHaveBeenCalled();
    });
});

describe("GET /peliculas/estadisticas - casos válidos (200)", () => {
    test.each([["1"], ["50"]])("minimo=%s devuelve 200 y array", async valor => {
        // Arrange
        const url = `/peliculas/estadisticas?minimo=${valor}`;
        // Act
        const res = await request(app).get(url);
        // Assert
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    test("sin minimo usa 1 y devuelve todos los géneros", async () => {
        // Arrange / Act
        const res = await request(app).get("/peliculas/estadisticas");
        // Assert
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(3);
        const pipeline = Pelicula.aggregate.mock.calls[0][0];
        expect(pipeline[2]).toEqual({ $match: { total: { $gte: 1 } } });
    });

    test("el minimo llega al service como número, no como string", async () => {
        // Arrange / Act
        await request(app).get("/peliculas/estadisticas?minimo=2");
        // Assert
        const pipeline = Pelicula.aggregate.mock.calls[0][0];
        expect(pipeline[2].$match.total.$gte).toBe(2);
    });

    test("ordena por notaMedia descendente con forma {genero,total,notaMedia}", async () => {
        // Arrange / Act
        const res = await request(app).get("/peliculas/estadisticas");
        // Assert
        expect(res.body).toEqual([
            { genero: "Animación", total: 2, notaMedia: 8.25 },
            { genero: "Crimen", total: 2, notaMedia: 8.78 },
            { genero: "Drama", total: 3, notaMedia: 8 },
        ].sort((a, b) => b.notaMedia - a.notaMedia));
        const medias = res.body.map(e => e.notaMedia);
        expect(medias).toEqual([...medias].sort((a, b) => b - a));
    });

    test("minimo=3 filtra los géneros con menos películas", async () => {
        // Arrange / Act
        const res = await request(app).get("/peliculas/estadisticas?minimo=3");
        // Assert
        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ genero: "Drama", total: 3, notaMedia: 8 }]);
    });

    test("devuelve [] si ningún género cumple el mínimo", async () => {
        // Arrange / Act
        const res = await request(app).get("/peliculas/estadisticas?minimo=50");
        // Assert
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });
});

describe("enrutado", () => {
    test("/estadisticas no es capturada por /:id", async () => {
        // Arrange / Act
        const res = await request(app).get("/peliculas/estadisticas");
        // Assert
        expect(res.status).toBe(200);
        expect(Pelicula.findById).not.toHaveBeenCalled();
    });
});

describe("service.estadisticasPorGenero - pipeline", () => {
    test("pasa al aggregate las etapas esperadas en orden", async () => {
        // Arrange
        Pelicula.aggregate.mockResolvedValue([]);
        // Act
        await service.estadisticasPorGenero(4);
        // Assert
        expect(Pelicula.aggregate).toHaveBeenCalledWith([
            { $unwind: "$generos" },
            { $group: { _id: "$generos", total: { $sum: 1 }, notaMedia: { $avg: "$nota" } } },
            { $match: { total: { $gte: 4 } } },
            { $sort: { notaMedia: -1 } },
            { $project: { _id: 0, genero: "$_id", total: 1, notaMedia: { $round: ["$notaMedia", 2] } } },
        ]);
    });

    test("minimo por defecto es 1", async () => {
        // Arrange
        Pelicula.aggregate.mockResolvedValue([]);
        // Act
        await service.estadisticasPorGenero();
        // Assert
        expect(Pelicula.aggregate.mock.calls[0][0][2]).toEqual({ $match: { total: { $gte: 1 } } });
    });
});

describe("swagger", () => {
    test("'/peliculas/estadisticas' aparece en swaggerSpec.paths", () => {
        // Arrange / Act
        const paths = Object.keys(swaggerSpec.paths || {});
        // Assert
        expect(paths).toContain("/peliculas/estadisticas");
    });
});
