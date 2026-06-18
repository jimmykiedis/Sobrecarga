const PHRASES_URL = new URL("../../assets/text/frases_dashboard.json", import.meta.url);

let phrasesPromise = null;

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const stableHash = (value) => {
  let hash = 2166136261;
  const text = String(value || "");

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

export const loadDashboardPhrases = async () => {
  if (!phrasesPromise) {
    phrasesPromise = fetch(PHRASES_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Não foi possível carregar as frases do dashboard.");
        }
        return response.json();
      })
      .catch(() => []);
  }

  return phrasesPromise;
};

export const pickDashboardPhrase = ({ phrases, leafName, currentValue, dateStamp = "" }) => {
  const normalizedLeafName = normalizeText(leafName);
  const leafEntry = (phrases || []).find((item) => normalizeText(item.folha) === normalizedLeafName);
  if (!leafEntry?.mensagens?.length) {
    return "";
  }

  const wantsPraise = Number(currentValue) >= 79;
  const eligibleMessages = leafEntry.mensagens.filter((message) => Boolean(message?.maior_que_79) === wantsPraise);
  const pool = eligibleMessages.length ? eligibleMessages : leafEntry.mensagens;
  if (!pool.length) return "";

  const seed = `${normalizedLeafName}|${String(currentValue || "")}|${normalizeText(dateStamp)}`;
  const selectedIndex = stableHash(seed) % pool.length;
  return pool[selectedIndex]?.texto || "";
};
