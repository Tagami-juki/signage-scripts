// scripts/fetch-openmeteo.js
// Node 20 / CommonJS

const fs = require("fs");
const path = require("path");

const OUT_DIR = "data";
fs.mkdirSync(OUT_DIR, { recursive: true });

// === 地点リスト（HTMLの PLACES と一致させてあります） ===
const places = [
  // 九州
  { id:"fukuoka",   name:"福岡市",   pref:"福岡県",   lat:33.58333, lon:130.39999 },
  { id:"kumamoto",  name:"熊本市",   pref:"熊本県",   lat:32.80310, lon:130.70790 },
  { id:"nagasaki",  name:"長崎市",   pref:"長崎県",   lat:32.75030, lon:129.87770 },
  { id:"oita",      name:"大分市",   pref:"大分県",   lat:33.23960, lon:131.60930 },
  { id:"miyazaki",  name:"宮崎市",   pref:"宮崎県",   lat:31.90778, lon:131.42028 },
  { id:"kagoshima", name:"鹿児島市", pref:"鹿児島県", lat:31.56670, lon:130.55000 },

  // 沖縄
  { id:"naha",      name:"那覇市",   pref:"沖縄県",   lat:26.21240, lon:127.68093 },

  // 本州（四国含む）
  { id:"osaka",     name:"大阪市",   pref:"大阪府",   lat:34.69374, lon:135.50217 },
  { id:"nagoya",    name:"名古屋市", pref:"愛知県",   lat:35.18145, lon:136.90640 },
  { id:"hiroshima", name:"広島市",   pref:"広島県",   lat:34.39161, lon:132.45182 },
  { id:"niigata",   name:"新潟市",   pref:"新潟県",   lat:37.91611, lon:139.03639 },
  { id:"akita",     name:"秋田市",   pref:"秋田県",   lat:39.72000, lon:140.10350 },
  { id:"ishikawa",  name:"金沢市",   pref:"石川県",   lat:36.56130, lon:136.65620 },
  { id:"shizuoka",  name:"静岡市",   pref:"静岡県",   lat:34.97560, lon:138.38280 },
  { id:"okayama",   name:"岡山市",   pref:"岡山県",   lat:34.65500, lon:133.91950 },
  { id:"yamaguchi", name:"山口市",   pref:"山口県",   lat:34.17830, lon:131.47360 },
  { id:"morioka",   name:"盛岡市",   pref:"岩手県",   lat:39.70000, lon:141.15000 },
  { id:"sendai",    name:"仙台市",   pref:"宮城県",   lat:38.26884, lon:140.87194 },
  { id:"chiyoda",   name:"千代田",   pref:"東京都",   lat:35.69000, lon:139.76000 },

  // 北海道
  { id:"sapporo",   name:"札幌市",   pref:"北海道",   lat:43.06417, lon:141.34694 },
  { id:"hakodate",  name:"函館市",   pref:"北海道",   lat:41.76870, lon:140.72880 },
  { id:"wakkanai",  name:"稚内市",   pref:"北海道",   lat:45.41560, lon:141.67300 },
  { id:"abashiri",  name:"網走市",   pref:"北海道",   lat:44.02000, lon:144.26970 },
  { id:"kushiro",   name:"釧路市",   pref:"北海道",   lat:42.98490, lon:144.38190 },
  { id:"furano",    name:"富良野市", pref:"北海道",   lat:43.34200, lon:142.38300 },
];

const commonParams = "current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FTokyo";

async function fetchOpenMeteo(lat, lon, useJMA = true){
  const model = useJMA ? "&models=jma_seamless" : "";
  const url = `https://api.open-meteo.com/v1/forecast?${commonParams}&latitude=${lat}&longitude=${lon}${model}`;
  const r = await fetch(url, { headers: { "accept": "application/json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function run(){
  const index = [];
  let okCount = 0, ngCount = 0;

  for (const p of places){
    try{
      let data;
      try{
        data = await fetchOpenMeteo(p.lat, p.lon, true);   // まずJMA
      }catch{
        data = await fetchOpenMeteo(p.lat, p.lon, false);  // ダメなら自動
      }

      const out = {
        meta: { id: p.id, name: p.name, pref: p.pref, lat: p.lat, lon: p.lon },
        current: data.current ?? null,
        daily: data.daily ?? null,
        updatedAt: new Date().toISOString()
      };
      fs.writeFileSync(path.join(OUT_DIR, `${p.id}.json`), JSON.stringify(out, null, 2));
      index.push(out.meta);
      okCount++;
      console.log(`ok  ${p.id}`);
    }catch(e){
      console.error(`NG  ${p.id}: ${e.message}`);
      ngCount++;
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, "index.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), places:index }, null, 2)
  );

  console.log(`done. ok=${okCount} ng=${ngCount}`);
}

run().catch(e => { console.error(e); process.exit(1); });
