const express = require("express");
const { validarListar, validarEstadisticas, validarBuscar, validarCrearPelicula, validarActualizarPelicula, validar } = require("../validators/pelicula.validator.js");
const { listar, top, buscar, estadisticas, obtener, resenas, crear, actualizar, eliminar, crearResena } = require("../controller/pelicula.controller.js");
const validarId = require("../middlewares/validarId.js");
const autenticar = require("../middlewares/autenticar.js");
const autorizar = require("../middlewares/autorizar.js");

const router = express.Router(); 

/**
 * @openapi
 * /peliculas:
 *   get:
 *     tags: [Películas]
 *     summary: Lista las películas paginadas (por defecto ordenadas por nota)
 *     parameters:
 *       - name: genero
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           example: Drama
 *       - name: anioDesde
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           example: 2000
 *       - name: notaMin
 *         in: query
 *         required: false
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 10
 *       - name: disponible
 *         in: query
 *         required: false
 *         schema:
 *           type: boolean
 *       - name: orden
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [nota, anio, titulo]
 *           default: nota
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - name: limit
 *         in: query
 *         required: false
 *         description: Un valor mayor que 50 se recorta a 50
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *     responses:
 *       200:
 *         description: Lista de películas en resumen con paginación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 datos:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PeliculasResumen'
 *                 paginacion:
 *                   type: object
 *                   properties:
 *                     pagina: { type: integer }
 *                     limite: { type: integer }
 *                     total: { type: integer }
 *                     paginas: { type: integer }
 *       400:
 *         description: Algún parámetro de consulta no es válido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorValidacion'
 */
router.get("/", validarListar, validar, listar);

router.get("/top", top);

/**
 * @openapi
 * /peliculas/estadisticas:
 *   get:
 *     tags: [Películas]
 *     summary: Total de películas y nota media por género, ordenado por nota media descendente
 *     parameters:
 *       - name: minimo
 *         in: query
 *         required: false
 *         description: Número mínimo de películas que debe tener un género para aparecer
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 1
 *           example: 2
 *     responses:
 *       200:
 *         description: Estadísticas por género
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/EstadisticaGenero'
 *       400:
 *         description: Parámetro minimo no válido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorValidacion'
 */
router.get("/estadisticas", validarEstadisticas, validar, estadisticas);

/**
 * @openapi
 * /peliculas/buscar:
 *   get:
 *     tags: [Películas]
 *     summary: Busca películas cuyo título contiene el texto (sin distinguir mayúsculas), por año descendente, máximo 20
 *     parameters:
 *       - name: q
 *         in: query
 *         required: true
 *         description: Texto a buscar en el título (se recorta con trim)
 *         schema:
 *           type: string
 *           minLength: 2
 *           maxLength: 30
 *           example: co
 *     responses:
 *       200:
 *         description: Películas encontradas en resumen (array vacío si no hay ninguna)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PeliculasResumen'
 *       400:
 *         description: Parámetro q ausente o no válido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorValidacion'
 */
router.get("/buscar", validarBuscar, validar, buscar);

router.post("/:id/resenas",autenticar,  validarId, crearResena);
router.get("/:id", validarId, obtener);
router.get("/:id/resenas", validarId, resenas);
// DESPUÉS PROBAREMOS SIN SPREED
/**
 * @openapi
 * /peliculas:
 *   post:
 *     tags: [Películas]
 *     summary: Crea una película (solo admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [titulo, anio, director]
 *             additionalProperties: false
 *             properties:
 *               titulo: { type: string }
 *               anio: { type: integer, minimum: 1900, maximum: 2100 }
 *               generos: { type: array, items: { type: string } }
 *               nota: { type: number, minimum: 0, maximum: 10 }
 *               duracion: { type: number, minimum: 1 }
 *               director:
 *                 type: object
 *                 required: [nombre]
 *                 additionalProperties: false
 *                 properties:
 *                   nombre: { type: string }
 *                   pais: { type: string }
 *               disponible: { type: boolean }
 *     responses:
 *       201:
 *         description: Película creada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Pelicula'
 *       400:
 *         description: Datos no válidos o campos no permitidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorValidacion'
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Rol no autorizado (se requiere admin)
 */
router.post("/", autenticar, autorizar("admin"), validarCrearPelicula, validar, crear);

/**
 * @openapi
 * /peliculas/{id}:
 *   put:
 *     tags: [Películas]
 *     summary: Actualiza una película (solo admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             properties:
 *               titulo: { type: string }
 *               anio: { type: integer, minimum: 1900, maximum: 2100 }
 *               generos: { type: array, items: { type: string } }
 *               nota: { type: number, minimum: 0, maximum: 10 }
 *               duracion: { type: number, minimum: 1 }
 *               director:
 *                 type: object
 *                 additionalProperties: false
 *                 properties:
 *                   nombre: { type: string }
 *                   pais: { type: string }
 *               disponible: { type: boolean }
 *     responses:
 *       200:
 *         description: Película actualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Pelicula'
 *       400:
 *         description: Datos no válidos o campos no permitidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorValidacion'
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Rol no autorizado (se requiere admin)
 *       404:
 *         description: Película no encontrada
 */
router.put("/:id", autenticar, autorizar("admin"), validarId, validarActualizarPelicula, validar, actualizar);
router.delete("/:id", autenticar, autorizar("admin"),validarId, eliminar);

module.exports = router;
