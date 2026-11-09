const { query, body, validationResult } = require("express-validator");

const validarEstadisticas = [
    query("minimo")
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage("minimo debe ser un entero entre 1 y 50")
        .toInt()
];

const validarBuscar = [
    query("q")
        .exists()
        .withMessage("q es obligatorio")
        .bail()
        .isString()
        .withMessage("q debe ser un texto")
        .bail()
        .trim()
        .isLength({ min: 2, max: 30 })
        .withMessage("q debe tener entre 2 y 30 caracteres")
];

// Filtros de GET /peliculas (todos opcionales). Un limit mayor de 50 no es error: el controlador lo recorta.
const esTextoQuery = v => typeof v === "string";
const campoQuery = (nombre, msg) =>
    query(nombre).optional().custom(esTextoQuery).withMessage(msg).bail();

const validarListar = [
    campoQuery("genero", "genero debe ser un texto").notEmpty().withMessage("genero no puede estar vacío"),
    campoQuery("anioDesde", "anioDesde debe ser un entero")
        .isInt().withMessage("anioDesde debe ser un entero"),
    campoQuery("notaMin", "notaMin debe ser un número entre 0 y 10")
        .isFloat({ min: 0, max: 10 }).withMessage("notaMin debe ser un número entre 0 y 10"),
    campoQuery("disponible", "disponible debe ser true o false")
        .isIn(["true", "false"]).withMessage("disponible debe ser true o false"),
    campoQuery("orden", "orden debe ser nota, anio o titulo")
        .isIn(["nota", "anio", "titulo"]).withMessage("orden debe ser nota, anio o titulo"),
    campoQuery("page", "page debe ser un entero mayor o igual que 1")
        .isInt({ min: 1 }).withMessage("page debe ser un entero mayor o igual que 1"),
    campoQuery("limit", "limit debe ser un entero mayor o igual que 1")
        .isInt({ min: 1 }).withMessage("limit debe ser un entero mayor o igual que 1")
];

// ---- Crear / actualizar película (lista blanca según src/models/Pelicula.js) ----
const CAMPOS_PELICULA = ["titulo", "anio", "generos", "nota", "duracion", "director", "disponible"];
const CAMPOS_DIRECTOR = ["nombre", "pais"];

const esObjetoPlano = v => v !== null && typeof v === "object" && !Array.isArray(v);

function clavesNoPermitidas(obj, permitidas) {
    return Object.keys(obj).filter(k => k.startsWith("$") || k.includes(".") || !permitidas.includes(k));
}

// Rechaza con 400 cualquier clave desconocida, que empiece por $ o con body no objeto
function soloCamposPermitidos(req, res, next) {
    const body = req.body;
    const detalles = [];
    if (!esObjetoPlano(body)) {
        detalles.push("El cuerpo debe ser un objeto JSON");
    } else {
        for (const k of clavesNoPermitidas(body, CAMPOS_PELICULA)) detalles.push(`Campo no permitido: ${k}`);
        if (esObjetoPlano(body.director)) {
            for (const k of clavesNoPermitidas(body.director, CAMPOS_DIRECTOR)) detalles.push(`Campo no permitido: director.${k}`);
        }
    }
    if (detalles.length) {
        return res.status(400).json({ error: "Datos no válidos", detalles });
    }
    next();
}

const esTexto = v => typeof v === "string" && v.trim().length > 0;
const esNumero = v => typeof v === "number" && Number.isFinite(v);

// Reglas por campo; "obligatorio" solo se aplica al crear
function reglasPelicula(obligatorio) {
    const campo = (ruta) => {
        const c = body(ruta);
        return obligatorio
            ? c.exists({ values: "undefined" }).withMessage(`${ruta} es obligatorio`).bail()
            : c.optional();
    };
    return [
        campo("titulo")
            .custom(esTexto).withMessage("titulo debe ser un texto no vacío"),
        campo("anio")
            .custom(v => esNumero(v) && Number.isInteger(v) && v >= 1900 && v <= 2100)
            .withMessage("anio debe ser un entero entre 1900 y 2100"),
        body("generos").optional()
            .custom(v => Array.isArray(v) && v.every(g => typeof g === "string"))
            .withMessage("generos debe ser un array de textos"),
        body("nota").optional()
            .custom(v => esNumero(v) && v >= 0 && v <= 10)
            .withMessage("nota debe ser un número entre 0 y 10"),
        body("duracion").optional()
            .custom(v => esNumero(v) && v >= 1)
            .withMessage("duracion debe ser un número mayor o igual que 1"),
        campo("director")
            .custom(esObjetoPlano).withMessage("director debe ser un objeto").bail()
            // Si llega director, siempre con nombre: al actualizar se reemplaza el objeto entero.
            // Se comprueba aquí y no en director.nombre para que matchedData no invente un director vacío.
            .custom(d => d.nombre !== undefined).withMessage("director.nombre es obligatorio si se envía director"),
        body("director.nombre").optional()
            .custom(esTexto).withMessage("director.nombre debe ser un texto no vacío"),
        body("director.pais").optional()
            .custom(v => typeof v === "string").withMessage("director.pais debe ser un texto"),
        body("disponible").optional()
            .custom(v => typeof v === "boolean").withMessage("disponible debe ser true o false")
    ];
}

const validarCrearPelicula = [soloCamposPermitidos, ...reglasPelicula(true)];
const validarActualizarPelicula = [soloCamposPermitidos, ...reglasPelicula(false)];

function validar(req, res, next) {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({
            error: "Datos no válidos",
            detalles: errores.array().map(e => e.msg)
        });
    }
    next();
}

module.exports = { validarListar, validarEstadisticas, validarBuscar, validarCrearPelicula, validarActualizarPelicula, validar };
