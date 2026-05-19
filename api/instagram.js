const ACCESS_TOKEN = process.env.INSTAGRAM_TOKEN;
const IG_ID = process.env.INSTAGRAM_ID;

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { endpoint } = req.query;

  if (!endpoint) {
    return res.status(400).json({ error: "Missing endpoint parameter" });
  }

  // Sécurité : on autorise uniquement les endpoints Instagram légitimes
  const allowed = [
    "profile", "media", "insights", "audience"
  ];

  const isAllowed = allowed.some(e => endpoint.startsWith(e));
  if (!isAllowed) {
    return res.status(403).json({ error: "Endpoint not allowed" });
  }

  try {
    let url;

    if (endpoint === "profile") {
      url = `https://graph.facebook.com/v25.0/${IG_ID}?fields=followers_count,media_count,biography,name,username,profile_picture_url&access_token=${ACCESS_TOKEN}`;
    } else if (endpoint === "media") {
      url = `https://graph.facebook.com/v25.0/${IG_ID}/media?fields=id,caption,media_type,timestamp,like_count,comments_count,thumbnail_url,media_url&limit=30&access_token=${ACCESS_TOKEN}`;
    } else if (endpoint === "insights") {
      url = `https://graph.facebook.com/v25.0/${IG_ID}/insights?metric=follower_count,impressions,reach,profile_views&period=day&access_token=${ACCESS_TOKEN}`;
    } else if (endpoint === "audience") {
      url = `https://graph.facebook.com/v25.0/${IG_ID}/insights?metric=audience_gender_age,audience_country,online_followers&period=lifetime&access_token=${ACCESS_TOKEN}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
