const axios = require("axios");
const { setCors } = require("./_lib");

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    const playerName = decodeURIComponent(req.url.split("/api/news/")[1]?.split("?")[0] || "");
    const query = encodeURIComponent(`${playerName} tennis`);
    const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=de&gl=DE&ceid=DE:de`;
    const response = await axios.get(rssUrl, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 5000 });
    const xml = response.data;
    const items = [];
    const rx = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = rx.exec(xml)) !== null && items.length < 5) {
      const item = m[1];
      const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/))?.[1] || "";
      const link = (item.match(/<link>(.*?)<\/link>/) || [])?.[1] || "";
      const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/) || [])?.[1] || "";
      const source = (item.match(/<source[^>]*>(.*?)<\/source>/) || [])?.[1] || "";
      if (title) items.push({ title: title.replace(/&amp;/g,"&").replace(/&#39;/g,"'"), link, pubDate: pubDate ? new Date(pubDate).toLocaleDateString("de-DE") : "", source });
    }
    res.json(items);
  } catch (err) {
    res.json([]);
  }
};
