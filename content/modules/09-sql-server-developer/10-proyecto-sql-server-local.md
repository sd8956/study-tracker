---
title: Proyecto — SQL Server local en Docker y consultas analíticas
kind: project
hours: 3
sources: Proyecto propio sobre los cursos 1–3 del track
links: SQL Server en Docker (Microsoft Learn) | https://learn.microsoft.com/en-us/sql/linux/quickstart-install-connect-docker ; Extensión MSSQL para VS Code | https://learn.microsoft.com/en-us/sql/tools/visual-studio-code-extensions/mssql/mssql-extension-visual-studio-code
---

## Objetivo

Montar tu propio SQL Server, cargar un dataset y responder diez preguntas de negocio con lo que aprendiste en los tres primeros cursos.

## Estudio

### Entorno

```bash
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=$MSSQL_SA_PASSWORD" \
  -p 1433:1433 --name sql1 -d mcr.microsoft.com/mssql/server:2022-latest
```

Guarda la contraseña en una variable de entorno, nunca en el script. Conéctate con `sqlcmd` o con la extensión MSSQL de VS Code.

### Dataset

Usa un CSV público pequeño (por ejemplo ventas de una tienda o viajes en bicicleta de algún portal de datos abiertos) o genera uno con Python. Necesitas al menos dos entidades que puedas separar en tablas (por ejemplo `customers` y `orders`).

## Qué hacer

1. Levanta el contenedor y crea la base `Practica` (20 min).
2. Diseña 2–3 tablas con primary keys, foreign keys, `NOT NULL` y `UNIQUE` donde corresponda; escribe el DDL en `schema.sql` (30 min).
3. Carga el CSV en una tabla de staging con `BULK INSERT` (o con un script de Python) y repártelo en tus tablas con `INSERT INTO ... SELECT DISTINCT` (40 min).
4. Escribe en `queries.sql` diez consultas que respondan preguntas de negocio: al menos dos con `JOIN`, dos con `GROUP BY`/`HAVING`, una con `CASE`, una con CTE y dos con window functions (`ROW_NUMBER`, total acumulado) (60 min).
5. Comenta en cada consulta qué pregunta responde y verifica a mano un resultado (15 min).
6. Criterio de terminado: `schema.sql` y `queries.sql` se ejecutan de principio a fin en una base vacía sin errores, y cada consulta tiene su pregunta escrita como comentario (15 min).

## Explícalo con tus palabras

Explica por qué cargaste primero a una tabla de staging en lugar de insertar el CSV directo en las tablas finales.
