## Spec. Buscar peliculas por titulo

## Objetivo
Tiene que existir un endpoint llamado get/peliculas/buscar?q=texto, que devuelve el titulo cuyo titulo contiene el texto, sin distinguir mayuscuas o minusculas, que esten ordenadas por año descendente, máximo 20
## Restricciones 
- Parametro q obligatorio, se recorta con trim, entre 2 y 30 caracteres, validar con express valdiator
- Que sea publico no necesita token
- La ruta va antes de /id Documentada con @openapi como hacen los demas
- No se debe hacer commit, no instalar ni paquetes ni librerias sin consultar 


## Hecho
GET /peliculas/buscar?q=co => 200 con array
GET /peliculas/buscar?q= asbfyh => 200 con array vacio
GET /peliculas/buscar => 400 
GET /peliculas/buscar?q=c => 400 


  
