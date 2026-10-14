// Reporta a GS Web el resultado de una corrida de Upptime (lo ejecuta .github/workflows/gs-report.yml).
//
// - Lee history/<slug>.yml (lo escribe Upptime; el archivo refleja el último estado comprobado de cada sitio).
// - Firma el cuerpo con HMAC-SHA256: X-GS-Status-Signature: t=<unix>,v1=<hex(HMAC(secreto, "<t>.<cuerpo>"))>.
// - runKey = id de la corrida + intento: GS Web procesa cada corrida una sola vez (reenvíos no duplican).
// - Reintenta solo errores de red y 5xx, con espera creciente y como máximo 3 intentos (la misma firma y runKey).
// - No envía nada privado: solo slug, estado, tiempo de respuesta y el enlace del issue abierto por Upptime.
// Sin dependencias: Node 20+.
import { createHmac } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

const url = process.env.GS_INGEST_URL ?? ""
const secret = process.env.STATUS_INGEST_SECRET ?? ""
const runKey = process.env.RUN_KEY ?? ""
const runStartedAt = process.env.RUN_STARTED_AT ?? ""
const observedAt = process.env.OBSERVED_AT || new Date().toISOString()
const simulated = process.env.SIMULATED === "true"
const repo = process.env.GITHUB_REPOSITORY ?? ""
const token = process.env.GITHUB_TOKEN ?? ""

if (!/^https:\/\/[a-z0-9.-]+\/api\/status\/ingest$/i.test(url)) {
  console.log("GS_INGEST_URL no configurada o inválida: no se reporta (ver README).")
  process.exit(0)
}
if (secret.length < 32) {
  console.error("Falta STATUS_INGEST_SECRET (mínimo 32 caracteres) en los secretos del repositorio.")
  process.exit(1)
}
if (!/^[A-Za-z0-9:._-]{1,100}$/.test(runKey)) {
  console.error("RUN_KEY inválido.")
  process.exit(1)
}

/** YAML de Upptime (clave: valor por línea). */
function parseHistory(text) {
  const out = {}
  for (const line of text.split(/\r?\n/)) {
    const m = /^([A-Za-z]+):\s*(.*)$/.exec(line)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

async function openIssues() {
  // Issues abiertos por Upptime (etiqueta «status» + slug), para enlazarlos desde el panel de GS Web.
  if (!token || !repo) return []
  const res = await fetch(`https://api.github.com/repos/${repo}/issues?state=open&labels=status&per_page=100`, {
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28" },
  })
  if (!res.ok) return []
  return (await res.json()).filter((i) => !i.pull_request)
}

const issues = await openIssues()
const sites = []
for (const file of readdirSync("history").filter((f) => f.endsWith(".yml"))) {
  const slug = file.replace(/\.yml$/, "")
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) continue
  const h = parseHistory(readFileSync(join("history", file), "utf8"))
  if (!["up", "down", "degraded"].includes(h.status)) continue
  const lastUpdated = h.lastUpdated && !Number.isNaN(Date.parse(h.lastUpdated)) ? new Date(h.lastUpdated).toISOString() : null
  // El tiempo de respuesta solo es de esta corrida si el archivo se escribió durante ella.
  const fresh = lastUpdated && runStartedAt && Date.parse(lastUpdated) >= Date.parse(runStartedAt)
  const rt = Number(h.responseTime)
  const issue = issues.find((i) => i.labels.some((l) => l.name === slug))
  sites.push({
    slug,
    status: h.status,
    responseTimeMs: fresh && Number.isInteger(rt) && rt >= 0 && rt <= 600000 ? rt : null,
    lastUpdated,
    issueUrl: issue && /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/\d+$/.test(issue.html_url) ? issue.html_url : null,
  })
}

const body = JSON.stringify({ source: "upptime", runKey, observedAt: new Date(observedAt).toISOString(), simulated, runInternal: true, sites })
const t = Math.floor(Date.now() / 1000)
const signature = `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`

for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-GS-Status-Signature": signature, "User-Agent": "gsweb-status-report" },
      body,
      signal: AbortSignal.timeout(60_000),
    })
    console.log(`GS Web respondió ${res.status} (intento ${attempt}).`)
    if (res.ok) process.exit(0)
    if (res.status < 500) process.exit(1) // firma, validación o configuración: reintentar no lo arregla
  } catch (err) {
    console.log(`Sin respuesta de GS Web (intento ${attempt}): ${err?.name ?? "error"}`)
  }
  if (attempt < 3) await new Promise((r) => setTimeout(r, 5000 * 2 ** (attempt - 1)))
}
process.exit(1)
