# Estado de GS Web

<!--start: description-->

Monitoreo externo de los servicios públicos de [GS Web](https://www.gsweb.com.uy), con [Upptime](https://upptime.js.org)
(GitHub Actions, Issues y Pages).

<!--end: description-->

## [📈 Estado actual](https://zhacks8u7.github.io/gsweb-status): <!--live status--> **Sin datos todavía**

<!--start: status pages-->
<!--end: status pages-->

## Qué hay en este repositorio (y qué no)

Es **público** para usar la capa gratuita de GitHub Actions y Pages. Contiene solamente:

- las direcciones públicas de `gsweb.com.uy` que se comprueban (`.upptimerc.yml`);
- el historial que genera Upptime desde el día en que se activó (no hay datos anteriores);
- `.gs/report.mjs` y `.github/workflows/gs-report.yml`: reportan cada corrida a GS Web con una firma HMAC.

No contiene código de GS Web, credenciales, datos de clientes, rutas internas ni detalles de errores. Los incidentes
y mantenimientos que publica el equipo de GS Web llegan como issues con la etiqueta `gs-web` (solo el texto público).

## Frecuencia real y limitaciones

- GitHub permite workflows programados **cada 5 minutos como mínimo**, y avisa que pueden **atrasarse o descartarse**
  en momentos de mucha carga. No es detección instantánea.
- En repositorios públicos, GitHub desactiva los workflows programados después de 60 días sin actividad (los commits
  de Upptime mantienen la actividad mientras funciona).
- Upptime reintenta dentro de la misma corrida (3 intentos) y abre un issue al cambiar el estado. GS Web aplica además
  su propia confirmación de fallos y recuperaciones consecutivas antes de publicar o resolver un aviso.
- La página de estado consulta la API de GitHub desde el navegador: sin token, 60 consultas por hora por IP.
- Los títulos de los issues que abre Upptime están en inglés (no se configuran).

## Configuración (una vez)

| Qué | Dónde | Para qué |
| --- | --- | --- |
| Permisos de workflows: «Read and write» | Settings → Actions → General | Upptime guarda el historial y abre issues con el token del workflow |
| GitHub Pages desde la rama `gh-pages` | Settings → Pages (después de la primera corrida de «Static Site CI») | Publicar la página de estado |
| Secreto `GH_PAT` (opcional) | Settings → Secrets → Actions | Solo para que «Update Template CI» pueda actualizar los workflows de Upptime |
| Variable `GS_INGEST_URL` = `https://www.gsweb.com.uy/api/status/ingest` | Settings → Variables → Actions | Activa el reporte a GS Web (sin ella no se reporta nada) |
| Secreto `STATUS_INGEST_SECRET` (≥ 32 caracteres, el mismo que en Vercel) | Settings → Secrets → Actions | Firma de los reportes |

Dominio propio: crear en el DNS de `gsweb.com.uy` un registro `CNAME status → zhacks8u7.github.io` y en
`.upptimerc.yml` reemplazar `baseUrl: /gsweb-status` por `cname: status.gsweb.com.uy`.

Powered by [Upptime](https://upptime.js.org) (licencia MIT, ver `LICENSE`).
