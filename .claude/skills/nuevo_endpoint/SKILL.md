---
name: nuevo-endpoint
description: Crea un endpoint completo en esta API (ruta, validador, controlador, servicio, documentación @openapi y test) a partir de una frase. Úsala cuando se pida añadir un endpoint o una ruta nueva.
---

# Nuevo endpoint

Sigue estos pasos en orden. No te saltes ninguno.

## 1. Entender la petición
De la frase del usuario saca: método, ruta, parámetros (path, query, body), qué devuelve y quién puede usarlo.
Si falta algo imprescindible, pregunta UNA vez con todas las dudas juntas. Si no, sigue.

## 2. Mirar un ejemplo
Lee la ruta existente más parecida de src/routes/ y copia su estilo. No leas más archivos de los necesarios.

## 3. Crear o tocar, en este orden
1. src/validators/   reglas de express-validator para cada parámetro de entrada.
2. src/services/     la consulta a MongoDB. Devuelve datos, nunca res.
3. src/controller/   llama al servicio y responde. Sin consultas a la BD. Errores al next().
4. src/routes/       validador → validar → (autenticar/autorizar si hace falta) → controlador.
                     Las rutas fijas van ANTES de /:id.
5. Anotación @openapi encima de la ruta, igual que las existentes: parámetros, 200 y 400.
6. tests/            un test con supertest: el caso bueno y un 400 de validación.

## 4. Comprobar
Ejecuta npm test. Si falla, corrige y repite.

## 5. Informar
Termina con: método y ruta, archivos tocados (uno por línea) y resultado de npm test. Nada más.

## Nunca
- Leer .env.
- Instalar dependencias.
- Hacer commit.