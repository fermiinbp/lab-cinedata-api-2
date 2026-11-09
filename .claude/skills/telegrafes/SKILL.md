---
name: telegrafes
description: Idioma compacto "telegrafés" para que el orquestador y los subagentes se comuniquen gastando el mínimo de tokens, más reglas para leer solo el contexto necesario. Úsala cuando haya que delegar trabajo en subagentes o cuando el usuario pida ahorrar tokens.
---

# Telegrafés · el idioma de los agentes

Objetivo: que cada mensaje entre agentes y cada lectura de contexto cueste lo mínimo, sin perder información. Se habla en telegrafés en TODA comunicación entre agentes. Con el usuario se habla normal.

## 1. Reglas del idioma

- Sin saludos, sin cortesías, sin repetir lo que te han pedido, sin resúmenes finales.
- Sin Markdown: nada de títulos, negritas ni tablas. Una línea por dato.
- Solo ASCII. Nada de emojis ni símbolos raros: gastan más tokens que una palabra.
- Rutas relativas a la raíz del repo: `api:` = repo de la API, `web:` = repo de la web.
- Nunca pegues código entero. Como mucho, la línea exacta que cambia.
- Si algo no cabe en estas claves, no hace falta decirlo.

## 2. Diccionario

| Clave | Significa |
|---|---|
| T | tarea, una frase |
| M | mapa: archivo:líneas que importan |
| D | decisión ya tomada (D1, D2…) |
| R | restricción |
| OK | cuándo está terminado |
| E | estado: ok, ko o blq (bloqueado) |
| C | cambio hecho: archivo +añadidas -quitadas qué |
| P | prueba ejecutada y resultado |
| N | nota, máximo dos |

Abreviaturas: rt ruta, val validador, ctl controlador, svc servicio, mdl modelo, ep endpoint, pg página, tst test, sec seguridad, ci workflow, pr pull request, q query, ok bien, ko mal, nf no encontrado.

## 3. Mensajes del orquestador a un subagente

Primera línea siempre: `TG1` (así el subagente sabe que debe responder en telegrafés). Después las claves:

```
TG1
T ep GET /peliculas/estadisticas por genero: total y notaMedia, orden notaMedia desc
M api:src/routes/pelicula.routes.js:30-45 api:src/services/pelicula.service.js:1-40
D1 rt antes de /:id
D2 q minimo int 1-50 en val
R no tocar .env; estilo @openapi existente
OK curl 200 y ?minimo=0 da 400
Responde en TG1: E C P N
```

## 4. Informe del subagente al orquestador

```
E ok
C api:src/services/pelicula.service.js +18 aggregate $unwind generos $group
C api:src/routes/pelicula.routes.js +12 rt /estadisticas antes de /:id + @openapi
P curl 200 ?minimo=0 400
N notaMedia redondeada a 2 decimales
```

## 5. Leer menos (aquí está el ahorro grande)

1. El **analista** es el único que explora. Entrega un `M` con archivo y rango de líneas. Los demás leen **solo esos rangos**, con offset y límite, nunca el archivo entero.
2. No releas un archivo que ya está en el mapa salvo para editarlo.
3. Busca con Grep antes de abrir archivos.
4. Comandos con salida corta: `git diff --stat` antes que `git diff`; tests con `npm test --silent 2>&1 | tail -15`.
5. Cada subagente recibe solo lo suyo: back no recibe nada de front y al revés.
6. El revisor lee el diff, no los archivos completos.

## 6. Para el orquestador

- Delega en el orden que te pidan, un mensaje TG1 por agente.
- Pasa a cada agente solo las líneas de D y M que le tocan.
- Al final, al usuario sí le respondes en español normal, en cinco líneas como máximo.