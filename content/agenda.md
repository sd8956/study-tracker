# Agenda final — Cloud Security Architect

Santiago Duque. Octubre de 2026.

Especialización: arquitectura AWS con seguridad de identidad, detección y APIs. El día 1 del bloque 1 es el día que empieces, no un lunes.

Cada número es una sesión. Si un día no puedes, el siguiente número espera. No se salta.
Los de 2 h son sesión corta. Los de 3 h son proyecto. Cuenta de laboratorio con budget de 10 USD. Destroy de lo que cobre en reposo. Nada de pruebas contra sistemas ajenos.
Material oficial y gratis. KodeKloud no hace falta.

EKS no entra. Se estudia solo si una vacante lo pide a diario, y después del bloque 6.
No se alarga para dominar cada tema. El corte es poder desplegar el repo, defender el diagrama y los informes, y presentarse a las dos certificaciones. Junto con Bold, ese es el paquete de la entrevista.

## Certificaciones

- Bloque 2, día 29. AWS Solutions Architect Professional, SAP-C03. Solo si el simulacro del día 26 quedó por encima del 70 %. No presentes SAP-C02.
- Bloque 6, día 21. AWS Certified Security Specialty, SCS-C03. Solo si el baseline se probó y el simulacro del día 18 quedó por encima del 70 %. En inglés si la cita es después del 31 de diciembre de 2026.
- No entran Terraform Associate, FinOps Practitioner ni CWES.

## Bloque 1 — IaC auditable

Meta: Otra persona despliega y destruye el repo con el README.

Certificación: Ninguna.

30 días.

### Día 1 · 2 h · Get Started de Terraform

Tutorial oficial hasta el primer apply en la cuenta de laboratorio. https://developer.hashicorp.com/terraform/tutorials/aws-get-started

### Día 2 · 2 h · Variables y outputs

Saca los valores fijos a variables.tf y outputs.tf. Añade una validación.

### Día 3 · 2 h · State local

terraform state list y show. .gitignore de Terraform. El state no se sube.

### Día 4 · 2 h · Módulos

Extrae un recurso a modules/ y llámalo desde la raíz. https://developer.hashicorp.com/terraform/tutorials/modules

### Día 5 · 3 h · Repo del proyecto

Crea secure-serverless: modules/, envs/lab, README con prerrequisitos, fmt y validate en verde.

### Día 6 · 2 h · State remoto

Pasa el state a S3 con lock. Anota bucket y tabla. Tutorial Remote State de HashiCorp.

### Día 7 · 2 h · IAM mínimo

Rol de Lambda con aws_iam_policy_document. Sin Action * ni Resource *.

### Día 8 · 2 h · Lambda y API Gateway

Tutorial Deploy serverless with Lambda and API Gateway. Déjalo aplicado.

### Día 9 · 2 h · DynamoDB y cola

Añade tabla y SQS. Diez líneas de flujo en el README.

### Día 10 · 3 h · Healthcheck y budget

GET /health responde. Budget de 5 USD y alarma. Destroy si no lo usas entre sesiones.

### Día 11 · 2 h · Plan en el pull request

GitHub Actions: fmt, validate y plan. https://docs.github.com/en/actions

### Día 12 · 2 h · OIDC

Rol de GitHub a AWS sin access keys. https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws

### Día 13 · 2 h · Checkov

Corrige un hallazgo. https://www.checkov.io/1.Welcome/Quick%20Start.html

### Día 14 · 2 h · Apply con aprobación

Apply solo en main, con environment protegido. Prueba un plan rechazado.

### Día 15 · 3 h · Pipeline verde

PR de prueba con el plan pegado en el README.

### Día 16 · 2 h · Evento entre funciones

Dos Lambdas unidas por SQS o EventBridge. La misma solicitud dos veces no duplica el efecto.

### Día 17 · 2 h · Logs

Retención de 14 días. Un log JSON por request, sin datos de cliente.

### Día 18 · 2 h · Drift

Cambia un tag en consola y recupéralo con plan y apply. Anota el comando.

### Día 19 · 2 h · ADR de IaC

ADR-001: por qué Terraform en este repo. Media página.

### Día 20 · 3 h · Diagrama y coste

Mermaid de API, Lambda, cola y tabla. Estimación de coste en el README.

### Día 21 · 2 h · Recorte de IAM

Quita permisos que la función no usa. Plan limpio.

### Día 22 · 2 h · Apply desde cero

Destroy y apply siguiendo solo el README. Anota cada paso que falló.

### Día 23 · 2 h · README corregido

El apply desde cero no pide trucos.

### Día 24 · 2 h · Lista de controles

Cifrado, acceso público bloqueado, logs, OIDC y Checkov, marcados en el README.

### Día 25 · 3 h · Ensayo

Un pase completo en limpio. Tag v0.1. Destroy al acabar.

### Día 26 · 2 h · Repaso del fallo

El punto que más costó, solo con la doc oficial.

### Día 27 · 2 h · Import

Crea un recurso a mano e impórtalo.

### Día 28 · 2 h · Prueba de plan

Un plan de ejemplo o un terraform test en verde. No reescribas lo que ya funciona.

### Día 29 · 2 h · Oferta

Una página: entrega Terraform, alcance, exclusiones, rango de horas.

### Día 30 · 3 h · Cierre

Si el README aún no basta para desplegar y destruir, se usa aquí. Si basta, no añadas alcance.

## Bloque 2 — Arquitectura y SAP-C03

Meta: Diseño multi-account escrito y la certificación de architect.

Certificación: Día 29 de este bloque: AWS Solutions Architect Professional SAP-C03.

30 días.

### Día 1 · 2 h · Organizations

Lee la guía y dibuja management, security y workload. No despliegues Control Tower en una cuenta personal. https://docs.aws.amazon.com/organizations/latest/userguide/orgs_introduction.html

### Día 2 · 2 h · Diagrama de cuentas

Pasa el dibujo al README del proyecto 2.

### Día 3 · 2 h · SCP

Dos políticas de ejemplo: denegar bucket público y denegar regiones fuera de una lista.

### Día 4 · 2 h · Rol cross-account

Rol de solo lectura. Módulo y plan, aunque no tengas tres cuentas.

### Día 5 · 2 h · ADR de cuentas

ADR-002: qué vive en cada cuenta. Media página.

### Día 6 · 2 h · VPC

Subredes privadas y un endpoint de S3 o DynamoDB, sin NAT si no hace falta. https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html

### Día 7 · 2 h · VPC en lab

Aplícala con budget. Destroy de lo que cobre en reposo.

### Día 8 · 2 h · Security group

Solo el tráfico del API. Anótalo en el diagrama.

### Día 9 · 2 h · CloudTrail

Trail hacia un bucket de logs, con política que impide borrar.

### Día 10 · 2 h · Quién lee los logs

Diez líneas: qué rol puede leer el bucket y cuál no.

### Día 11 · 2 h · RTO y RPO

Del API. Elige backup/restore o pilot light.

### Día 12 · 2 h · ADR de resiliencia

Media página. https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html

### Día 13 · 2 h · Restore

Backup de la tabla y un restore en lab.

### Día 14 · 2 h · Serverless Lens

Marca 10 preguntas contra tu stack. https://docs.aws.amazon.com/wellarchitected/latest/serverless-applications-lens/serverless-applications-lens.html

### Día 15 · 2 h · Dos hallazgos

Corrige dos de la lens en Terraform.

### Día 16 · 2 h · DLQ

En la cola, con alarma si tiene mensajes.

### Día 17 · 2 h · Fallo forzado

Comprueba que el mensaje llega a la DLQ.

### Día 18 · 2 h · Well-Architected escrito

Una página por pilar: seguridad, fiabilidad, coste.

### Día 19 · 3 h · Diagrama vivo

Un solo diagrama de cuentas, actualizado. No crees otro.

### Día 20 · 2 h · Guía SAP-C03

Lee los dominios. https://aws.amazon.com/certification/certified-solutions-architect-professional/

### Día 21 · 2 h · Diez preguntas de diseño

Anota por qué falla la opción que elegiste.

### Día 22 · 2 h · Diez de multi-account

Redes y cuentas. Misma regla.

### Día 23 · 2 h · Diez de coste

Migración y coste. Misma regla.

### Día 24 · 3 h · Simulacro 1

20 preguntas cronometradas.

### Día 25 · 2 h · Dominio flojo

Solo el que quedó por debajo del 70 %.

### Día 26 · 3 h · Simulacro 2

Otras 20. Si sigue bajo 70 %, el día 27 es repaso y la cita se mueve.

### Día 27 · 2 h · Huecos del diagrama

Lo que el simulacro dejó sin evidencia en el repo.

### Día 28 · 2 h · Repaso de la guía

Guía oficial, no un banco nuevo.

### Día 29 · 3 h · Examen SAP-C03

Día de la cita. Si el simulacro del día 26 quedó bajo 70 %, este día es repaso y la cita se mueve. No presentes SAP-C02.

### Día 30 · 2 h · Después del examen

Anota lo que no supiste, sin violar el NDA. Tag del proyecto y oferta corta de review de arquitectura.

## Bloque 3 — Coste y primer servicio

Meta: Un informe de arquitectura y coste que se puede cobrar.

Certificación: Ninguna. FinOps Practitioner no entra.

20 días.

### Día 1 · 2 h · Cost Explorer

Actívalo y crea un budget. https://docs.aws.amazon.com/cost-management/latest/userguide/ce-what-is.html

### Día 2 · 2 h · Inventario

Coste por servicio de los últimos 30 días de la cuenta lab.

### Día 3 · 2 h · Tags

owner, env y service en Terraform. Agrupa el coste por tag.

### Día 4 · 2 h · Pilar de coste

Gasto ocioso y right-sizing. https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html

### Día 5 · 3 h · Plantilla

Alcance, exclusiones y tabla de servicios.

### Día 6 · 2 h · Memoria de Lambda

Tabla de memoria frente a duración. No compres nada.

### Día 7 · 2 h · Savings Plans

Punto de equilibrio de un compromiso de un año, con números de ejemplo.

### Día 8 · 2 h · Hallazgos típicos

Transferencia de datos y logs sin retención, como recomendación.

### Día 9 · 2 h · Anomalías

Una alerta de Cost Anomaly Detection.

### Día 10 · 3 h · Tres recomendaciones

Cada una con ahorro, esfuerzo y riesgo.

### Día 11 · 2 h · Resumen

Una página para alguien que no es ingeniero.

### Día 12 · 2 h · Plan de 30 días

Qué se apaga, qué se mide y qué no se toca.

### Día 13 · 2 h · Pricing Calculator

Una alternativa costeada. https://calculator.aws

### Día 14 · 2 h · Acceso del servicio

Qué rol read-only pides y qué no entra.

### Día 15 · 3 h · Informe

Versión entregable. Oferta freelance actualizada.

### Día 16 · 2 h · Ensayo

Reunión de resultados de 20 minutos, en voz alta.

### Día 17 · 2 h · Corrección

Arregla lo que no pudiste explicar.

### Día 18 · 2 h · Falso ocioso

Un recurso que parece apagable y no lo es.

### Día 19 · 3 h · Cierre

Tag v0.1. Si ya se puede entregar, no añadas alcance.

### Día 20 · 2 h · Hipótesis

El número que el informe afirma y no sostiene: añádelo o márcalo.

## Bloque 4 — Seguridad de APIs

Meta: API multi-tenant explotada, corregida e informada.

Certificación: Ninguna. CWES y el path de Hack The Box no entran.

22 días.

### Día 1 · 2 h · Threat model

Cheat sheet de OWASP. Dibuja actor, dato y frontera de una API de adelantos. https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html

### Día 2 · 2 h · Amenazas

Cinco amenazas sobre ese dibujo, en tus palabras.

### Día 3 · 2 h · Access control

PortSwigger, labs Apprentice. https://portswigger.net/web-security/access-control

### Día 4 · 2 h · BOLA en notas

Ataque y corrección de un IDOR, escritos.

### Día 5 · 2 h · JWT

PortSwigger JWT, Apprentice y un Practitioner. https://portswigger.net/web-security/jwt

### Día 6 · 2 h · JWT en notas

Qué claim no se debe fiar y cómo se comprueba.

### Día 7 · 2 h · Autenticación

PortSwigger authentication, labs Apprentice.

### Día 8 · 2 h · Lógica de negocio

PortSwigger business logic, labs Apprentice. El fallo tiene que ser de dinero.

### Día 9 · 2 h · Race conditions

PortSwigger race conditions. https://portswigger.net/web-security/race-conditions

### Día 10 · 2 h · SSRF

PortSwigger SSRF, labs Apprentice.

### Día 11 · 2 h · API Top 10

Léela contra tu diseño. https://owasp.org/API-Security/

### Día 12 · 2 h · ASVS

Capítulos de autenticación y acceso. Marca qué cumple y qué no.

### Día 13 · 2 h · Repo vacío

API FastAPI, aviso de que será vulnerable a propósito. Datos falsos.

### Día 14 · 3 h · BOLA implementado

Un comercio lee el recurso de otro.

### Día 15 · 2 h · JWT débil

Algoritmo none o secreto en el repo, a propósito.

### Día 16 · 2 h · Mass assignment

Un campo de rol o de tope que el cliente puede mandar.

### Día 17 · 2 h · Sin rate limit

El endpoint de cotización no tiene tope.

### Día 18 · 3 h · Evidencia

Request y response de cada hallazgo, en local. Nada contra un sistema ajeno.

### Día 19 · 3 h · Corrección

Arregla los cuatro. Un test por hallazgo, que falle si vuelve.

### Día 20 · 2 h · Retest

Los tests pasan y el exploit ya no funciona.

### Día 21 · 3 h · Informe

Severidad, impacto, evidencia y remedio. Tag v0.1.

### Día 22 · 2 h · Oferta de review

Una página: alcance, autorización escrita, qué no entra.

## Bloque 5 — Controles en el pull request

Meta: Un hallazgo alto no se fusiona.

Certificación: Ninguna.

15 días.

### Día 1 · 2 h · Semgrep

Sobre la API corregida. https://semgrep.dev/docs/getting-started/

### Día 2 · 2 h · Bandit

Compara un hallazgo con Semgrep.

### Día 3 · 2 h · PR rojo

El workflow falla si hay un high confirmado.

### Día 4 · 2 h · Excepción

Con fecha de vencimiento, escrita en el PR.

### Día 5 · 3 h · Ejemplo

Un PR rojo y uno verde de muestra.

### Día 6 · 2 h · Gitleaks

Pre-commit y CI. Un secreto de prueba no entra. https://github.com/gitleaks/gitleaks

### Día 7 · 2 h · Dependencias

pip-audit o Dependabot. Un aviso, aunque sea de prueba.

### Día 8 · 2 h · Umbral

Qué se bloquea y qué solo se avisa.

### Día 9 · 2 h · Rotación

El secreto de prueba se rota. No reescribas el historial.

### Día 10 · 3 h · README

Los cuatro controles y el umbral.

### Día 11 · 2 h · Checkov en el PR

Antes del plan, en el repo de Terraform.

### Día 12 · 2 h · Hallazgo de IaC

Corrige uno o justifica la excepción.

### Día 13 · 2 h · Plan bloqueado

No corre si Checkov falla en high.

### Día 14 · 2 h · ADR

Por qué estos cuatro controles y no un scanner más.

### Día 15 · 3 h · Tag

pipeline-v0.1. No añadas ZAP ni Cosign.

## Bloque 6 — Baseline AWS y Security Specialty

Meta: Un incidente de laboratorio corrido con runbook, y la certificación de seguridad.

Certificación: Día 21 de este bloque: AWS Certified Security Specialty SCS-C03.

22 días.

### Día 1 · 2 h · CloudTrail

Trail en la cuenta lab, bucket sin borrado. https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-user-guide.html

### Día 2 · 2 h · Trail en Terraform

Que no viva solo en la consola.

### Día 3 · 2 h · GuardDuty

Actívalo. Anota un finding de muestra.

### Día 4 · 2 h · Security Hub

Qué finding te importa y cuál es ruido.

### Día 5 · 2 h · KMS

Una clave para logs.

### Día 6 · 2 h · Secrets Manager

El secreto sale del repo.

### Día 7 · 2 h · Access Analyzer

Sobre el rol de Lambda. Cierra un finding o documéntalo.

### Día 8 · 2 h · Config

Una regla: bucket público o security group abierto.

### Día 9 · 2 h · Flow Logs

En la VPC de lab.

### Día 10 · 2 h · WAF, solo criterio

Media página: cuándo va delante de API Gateway. No despliegues uno de pago si no lo vas a enseñar.

### Día 11 · 2 h · Guion del incidente

Llave en un commit. Solo en lab.

### Día 12 · 3 h · Correr el guion

Detección, contención, remediación. Anota la hora de cada paso.

### Día 13 · 2 h · Runbook

El guion pasa a una página: quién hace qué.

### Día 14 · 2 h · Segunda pasada

Corre el runbook otra vez y corrige lo que no se pudo seguir.

### Día 15 · 2 h · Guía SCS-C03

Dominios de IAM y data protection. https://docs.aws.amazon.com/aws-certification/latest/security-specialty-03/security-specialty-03.html

### Día 16 · 2 h · Quince preguntas

IAM y datos. Anota el fallo.

### Día 17 · 2 h · Detection

Quince preguntas de detection e incident response. En inglés si el examen ya no está en español.

### Día 18 · 3 h · Simulacro

30 preguntas cronometradas.

### Día 19 · 2 h · Dominio flojo

Solo el que quedó por debajo del 70 %.

### Día 20 · 2 h · Repaso

Guía oficial, no un banco nuevo.

### Día 21 · 3 h · Examen SCS-C03

Día de la cita. Solo si el baseline se probó y el simulacro del día 18 quedó por encima del 70 %. Si no, repaso y la cita se mueve. En inglés si es después del 31 de diciembre de 2026.

### Día 22 · 2 h · Cierre

Anota huecos sin violar el NDA. Tag del baseline y oferta de assessment de una página.

## IA, opcional

A partir del bloque 2, un día de 3 h al mes se puede cambiar por esto, solo si el día anterior quedó cerrado:

- Primera vez: extractor de una solicitud a JSON, con schema y coste.
- Segunda: ese extractor desplegado con el Terraform del bloque 1.
- Tercera: RAG de 15 políticas y 20 preguntas etiquetadas.
- Cuarta: recall de dos configuraciones, y qué pasa si el documento trae instrucciones.

## Qué no entra

EKS, Argo CD, Prometheus, CKA. Path de Hack The Box y CWES. Control Tower en una cuenta personal. ZAP, Cosign, OPA. El roadmap completo de AI Engineer.
