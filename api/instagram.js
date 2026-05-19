const https = require("https");

const ACCESS_TOKEN = process.env.INSTAGRAM_TOKEN;
const IG_ID = process.env.INSTAGRAM_ID;

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { endpoint } = req.query;

  if (!endpoint) return res.status(400).json({ error: "Missing endpoint" });

  try {
    let url;
    if (endpoint === "profile") {
      url = `https://graph.facebook.com/v25.0/${IG_ID}?fields=followers_count,media_count,biography,name,username&access_token=${ACCESS_TOKEN}`;
    } else if (endpoint === "media") {
      url = `https://graph.facebook.com/v25.0/${IG_ID}/media?fields=id,caption,media_type,timestamp,like_count,comments_count&limit=30&access_token=${ACCESS_TOKEN}`;
    } else {
      return res.status(403).json({ error: "Endpoint not allowed" });
    }

    const data = await httpsGet(url);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
