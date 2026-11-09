const express = require("express");
const {registro, login, perfil} = require("../controller/auth.controller.js");
const autenticar = require("../middlewares/autenticar.js");
const { rateLimit } = require("express-rate-limit");
const { validarLogin, validarRegistro } = require("../validators/auth.validator.js");
const { validar } = require("../validators/pelicula.validator.js");

const router = express.Router();

// Frena la fuerza bruta: 10 intentos por IP cada 15 minutos
const limitarIntentos = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Demasiados intentos, prueba más tarde" }
});

// AQUI DEBBEIS COMENTAR SWAGGER, CUIDADO!!

router.post("/registro", limitarIntentos, validarRegistro, validar, registro);
router.post("/login", limitarIntentos, validarLogin, validar, login);
router.get("/perfil", autenticar, perfil);


module.exports = router;