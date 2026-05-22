const axios = require("axios");

const API_KEY = process.env.API_TENNIS_KEY;
const BASE_URL = "https://api.api-tennis.com/tennis/";

const apiGet = (params) =>
  axios.get(BASE_URL, { params: { APIkey: API_KEY, ...params } });

const eloFromRank = (rank) => Math.max(1500, 2400 - Number(rank) * 6);

const getRankFn = (standings) => {
  const cache = new Map();
  return (name) => {
    if (!name) return 300;
    if (cache.has(name)) return cache.get(name);
    const lastName = name.toLowerCase().trim().split(" ").pop();
    const found = standings.find(p =>
      (p.player || "").toLowerCase().trim().split(" ").pop() === lastName
    );
    const rank = found ? parseInt(found.place) || 300 : 300;
    cache.set(name, rank);
    return rank;
  };
};

const getFullNameFn = (standings) => {
  const cache = new Map();
  return (shortName) => {
    if (!shortName) return shortName || "";
    if (cache.has(shortName)) return cache.get(shortName);
    const lastName = shortName.trim().split(" ").pop().toLowerCase();
    const found = standings.find(p =>
      (p.player || "").toLowerCase().split(" ").pop() === lastName
    );
    const full = found ? found.player : shortName;
    cache.set(shortName, full);
    return full;
  };
};

const setCors = (res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

module.exports = { apiGet, eloFromRank, getRankFn, getFullNameFn, setCors };
