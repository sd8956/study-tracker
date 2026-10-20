---
title: Vistas, permisos, particionado y elección de DBMS
kind: course
hours: 2
sources: DataCamp — Database Design, caps. 3–4
links: Database Design (DataCamp) | https://www.datacamp.com/courses/database-design
---

## Objetivo

Crear y gestionar vistas (normales y materializadas), controlar el acceso con roles, particionar tablas y elegir un DBMS adecuado.

## Qué hacer

1. Abre *Database Design* en DataCamp (ver enlaces de la sesión) y completa el capítulo 3 «Database Views» y el capítulo 4 «Database Management» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Vista**: una consulta guardada con nombre; no almacena datos, se ejecuta al consultarla.
- **Vista materializada**: guarda el resultado y se refresca periódicamente; en SQL Server se aproxima con *indexed views*.
- **GRANT / REVOKE**: dan o quitan privilegios (`SELECT`, `INSERT`...) sobre objetos.
- **Roles**: agrupan privilegios para asignarlos a muchos usuarios a la vez.
- **Particionado vertical y horizontal**: separar columnas en otra tabla o filas en particiones (por ejemplo por año).
- **SQL vs NoSQL**: relacional para datos estructurados con integridad; NoSQL (documentos, clave-valor, columnas, grafos) para esquemas flexibles o escala específica.

## Preguntas de repaso

1. ¿Cuándo conviene una vista materializada en lugar de una vista normal?
   R: Cuando la consulta es costosa, se lee mucho más de lo que cambian los datos y puedes tolerar que el resultado esté un poco desactualizado entre refrescos.
2. ¿Cómo darías acceso de solo lectura a la tabla `ventas` a un grupo de analistas?
   R: Creas un rol `analistas`, le das `GRANT SELECT ON ventas TO analistas` y agregas a cada analista al rol.
3. ¿Para qué sirve particionar una tabla de eventos por año?
   R: Para que las consultas que filtran por fecha lean solo las particiones necesarias y para gestionar datos viejos (archivar o borrar una partición entera) sin tocar el resto.
4. Menciona una ventaja de seguridad de las vistas.
   R: Puedes exponer solo ciertas columnas o filas (por ejemplo sin el salario) y dar permisos sobre la vista en lugar de sobre la tabla base.

## Explícalo con tus palabras

Explica a un gerente por qué los analistas deberían leer de vistas y no directamente de las tablas de producción.
