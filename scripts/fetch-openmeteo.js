// scripts/fetch-openmeteo.js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const OUT_DIR    = path.resolve(__dirname, "..", "data");
fs.mkdirSync(OUT_DIR, { recursive: true });

const places = [
  { id: "kisarazu", name: "木更津市", lat: 35.3761,  lon: 139.917  }, 
  { id: "nagoya",   name: "名古屋市", lat: 35.18145, lon: 136.90640 },
  { id: "osaka",    name: "大阪市",   lat: 34.69374, lon: 135.50217 },
  { id: "hiroshima",name: "広島市",   lat: 34.39161, lon: 132.45182 },
  { id: "fukuoka",  name: "福岡市",   lat: 33.58333, lon: 130.39999 },
  { id: "morioka",  name: "盛岡市",   lat: 39.70000, lon: 141.15000 },
  { id: "hakodate", name: "函館市",   lat: 41.76861, lon: 140.72889 },
  { id: "niigata",  name: "新潟市",   lat: 37.91611, lon: 139.03639 },
  { id: "toyama",   name: "富山市",   lat: 36.69592, lon: 137.21369 },
  { id: "miyazaki", name: "宮崎市",   lat: 31.90778, lon: 131.42028 },
  { id: "kagoshima",name: "鹿児島市", lat: 31.56670, lon: 130.55000 },
  // 既存の千代田など残す場合は↓に並べてOK
  { id: "chiyoda",  name: "千代田",   lat: 35.69,    lon: 139.76    },
];

const API = "https://api.open-meteo.com/v1/forecast";
const common = {
  current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
  daily:   "weather_code,temperature_2m_max,temperature_2m_min",
  timezone:"Asia/Tokyo",
};

function urlFor(p) {
  const u = new URL(API);
  u.searchParams.set("latitude",  p.lat);
  u.searchParams.set("longitude", p.lon);
  u.searchParams.set("current",   common.current);
  u.searchParams.set("daily",     common.daily);
  u.searchParams.set("forecast_days", "7");
  u.searchParams.set("timezone",  common.timezone);
  return u.toString();
}

async function fetchJson(u) {
  const res  = await fetch(u, { headers: { "User-Agent": "LEVEL6-Yodeck-Fetch/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();              // ← 空レス対策
  if (!text)  throw new Error("Empty body");  // ← ここで弾く
  try { return JSON.parse(text); } catch (e) { throw new Error("Invalid JSON"); }
}

const index = [];
for (const p of places) {
  try {
    const data = await fetchJson(urlFor(p));
    const out  = {
      place: p,
      updatedAt: new Date().toISOString(),
      current: data.current || null,
      daily:   data.daily   || null,
    };
    fs.writeFileSync(path.join(OUT_DIR, `${p.id}.json`), JSON.stringify(out));
    index.push({ id: p.id, name: p.name });
  } catch (e) {
    // 失敗時は直近成功版を温存できるよう、新規書き込みをスキップ（ログのみ）
    console.error(`[${p.id}] fetch failed:`, e.message);
  }
}
fs.writeFileSync(path.join(OUT_DIR, "index.json"), JSON.stringify({ places: index, updatedAt: new Date().toISOString() }));
