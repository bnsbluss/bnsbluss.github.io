/**
 * HRAI CORS Proxy untuk Cloudflare Workers (gratis, tanpa Termux/PC).
 *
 * LANGKAH:
 * 1) Ganti TOKEN di bawah dengan kode acak buatanmu sendiri
 *    (huruf dan angka saja, minimal 16 karakter, mis. k7Qp2xM9vT4bR8nW).
 * 2) Deploy Worker ini di Cloudflare.
 * 3) Di HRAI Mobile -> Atur -> kolom "Proxy CORS" isi:
 *      https://NAMA-WORKER.AKUNMU.workers.dev/TOKENMU
 *
 * Dua cara kerja (keduanya didukung):
 *  a) Header  X-Target-URL: https://host/v1/...   (dipakai index.html HRAI)
 *  b) Alamat  https://worker/TOKEN/https://host/v1/...
 * Permintaan diteruskan apa adanya ke server tujuan (termasuk streaming) dan
 * dijawab dengan header CORS.
 * API key tetap dikirim dari aplikasi lewat header Authorization; Worker ini
 * tidak menyimpan apa pun. TOKEN mencegah orang lain memakai Worker-mu.
 */
const TOKEN = "5Hl5IuGGYdxEqsaT";

// header jawaban yang diteruskan ke aplikasi
const PASS = ["content-type", "cache-control", "retry-after", "x-request-id"];
// header permintaan yang tidak diteruskan ke server tujuan
const DROP = new Set([
  "host", "origin", "referer", "cookie", "content-length", "connection",
  "accept-encoding", "x-real-ip", "x-target-url", "access-control-request-method",
  "access-control-request-headers",
]);

function cors(req) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": req.headers.get("Access-Control-Request-Headers") || "*",
    "Access-Control-Expose-Headers": "*",
    "Access-Control-Max-Age": "86400",
  };
}

function fail(req, status, message) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json; charset=utf-8" },
  });
}

export default {
  async fetch(req) {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(req) });
    }

    const u = new URL(req.url);
    let path = u.pathname.slice(1);

    if (TOKEN) {
      if (!path.startsWith(TOKEN + "/")) {
        return fail(req, 403, "Token proxy salah. Alamat Proxy CORS harus berakhiran /TOKEN-mu.");
      }
      path = path.slice(TOKEN.length + 1);
    }

    // cara (a): alamat tujuan ada di header; cara (b): ada di jalur URL.
    // (sebagian jaringan menggabungkan "//" menjadi "/", jadi diperbaiki di sini)
    const hdr = req.headers.get("X-Target-URL");
    const target = (hdr || path + u.search).replace(/^(https?):\/+/i, "$1://");
    let t;
    try {
      t = new URL(target);
    } catch {
      return fail(req, 400, "Alamat tujuan kosong. Kirim header X-Target-URL atau pakai https://<worker>/<TOKEN>/https://host/jalur");
    }
    if (t.protocol !== "https:" && t.protocol !== "http:") {
      return fail(req, 400, "Hanya http/https yang didukung.");
    }

    const h = new Headers();
    for (const [k, v] of req.headers) {
      const l = k.toLowerCase();
      if (DROP.has(l) || l.startsWith("sec-") || l.startsWith("cf-") || l.startsWith("x-forwarded")) continue;
      h.set(k, v);
    }

    let resp;
    try {
      resp = await fetch(t, {
        method: req.method,
        headers: h,
        body: req.method === "GET" || req.method === "HEAD" ? undefined : req.body,
      });
    } catch (e) {
      return fail(req, 502, "Worker gagal menghubungi " + t.host + ": " + (e && e.message ? e.message : e));
    }

    const out = new Headers(cors(req));
    for (const k of PASS) {
      const v = resp.headers.get(k);
      if (v) out.set(k, v);
    }
    return new Response(resp.body, { status: resp.status, headers: out });
  },
};
