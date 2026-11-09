const { body } = require("express-validator");

// isString() antes que nada: evita que lleguen objetos como {"$gt": ""} a la consulta
const email = () => body("email")
    .exists().withMessage("email es obligatorio").bail()
    .isString().withMessage("email debe ser un texto").bail()
    .trim()
    .isEmail().withMessage("email no válido");

const password = () => body("password")
    .exists().withMessage("password es obligatorio").bail()
    .isString().withMessage("password debe ser un texto");

const validarLogin = [email(), password()];

const validarRegistro = [
    body("nombre")
        .exists().withMessage("nombre es obligatorio").bail()
        .isString().withMessage("nombre debe ser un texto").bail()
        .trim()
        .notEmpty().withMessage("nombre no puede estar vacío"),
    email(),
    password().bail()
        .isLength({ min: 6 }).withMessage("La contraseña debe ser de mínimo 6 caracteres")
];

module.exports = { validarLogin, validarRegistro };
