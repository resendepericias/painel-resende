/* Leitura dos cards — o título segue o padrão
   [MARCADOR] número completo · COMARCA + VARA · PERICIADO · R$ valor
   e a descrição traz blocos com rótulo (Status:, Processo:, Periciado:, HISTORICO DE COBRANCAS, ACOMPANHAMENTO PROCESSUAL). */
import { semAcento, digitos, HOJE } from "./util.js";

export const CODCOM = { "0439": "MURIAE", "0313": "IPATINGA", "0003": "ABRE CAMPO", "0024": "BH", "0183": "CONSELHEIRO LAFAIETE", "0461": "OURO PRETO",
  "0145": "JUIZ DE FORA", "0231": "RIBEIRAO DAS NEVES", "0471": "PARA DE MINAS", "0477": "PASSA TEMPO", "0699": "UBA", "0685": "TEIXEIRAS", "0322": "ITAGUARA",
  "0290": "VESPASIANO", "0216": "DIAMANTINA", "0210": "PEDRO LEOPOLDO", "0095": "CABO VERDE", "0607": "SANTOS DUMONT", "0090": "BRUMADINHO", "0319": "ITABIRITO",
  "0694": "TRES PONTAS", "0470": "PARACATU", "0089": "BRAZOPOLIS", "0480": "PATOS DE MINAS", "0525": "POUSO ALEGRE", "0394": "MANHUACU", "0035": "ARACUAI",
  "0543": "RAUL SOARES", "0686": "TRES CORACOES" };
const COMARCAS = ["MURIAE", "MURIAÉ", "IPATINGA", "ABRE CAMPO", "ABRECAMPO", "BELO HORIZONTE", "BELOHORIZONT", "BH", "OURO PRETO", "OUROPRETO", "JUIZ DE FORA", "JUIZDEFORA", "JFORA",
  "CONSELHEIRO LAFAIETE", "CONS. LAFAIETE", "RAUL SOARES", "ARACUAI", "PARACATU", "RIBEIRAO DAS NEVES", "RIBEIRAODASNEVES", "DIAMANTINA", "VESPASIANO", "MANHUACU", "ITABIRITO",
  "POUSO ALEGRE", "PASSA TEMPO", "TRES PONTAS", "PEDRO LEOPOLDO", "PARA DE MINAS", "PATOS DE MINAS", "BRAZOPOLIS", "BRUMADINHO", "UBA", "TEIXEIRAS", "ITAGUARA", "CABO VERDE",
  "SANTOS DUMONT", "VIDEO"];
const CANON = { "ABRECAMPO": "ABRE CAMPO", "BELO HORIZONTE": "BH", "BELOHORIZONT": "BH", "OUROPRETO": "OURO PRETO", "JFORA": "JUIZ DE FORA", "JUIZDEFORA": "JUIZ DE FORA",
  "MURIAÉ": "MURIAE", "RIBEIRAODASNEVES": "RIBEIRAO DAS NEVES", "CONS. LAFAIETE": "CONSELHEIRO LAFAIETE" };
export const NOME_COMARCA = { "MURIAE": "Muriaé", "BH": "Belo Horizonte", "IPATINGA": "Ipatinga", "ABRE CAMPO": "Abre Campo", "OURO PRETO": "Ouro Preto", "JUIZ DE FORA": "Juiz de Fora",
  "CONSELHEIRO LAFAIETE": "Cons. Lafaiete", "RIBEIRAO DAS NEVES": "Ribeirão das Neves", "PARA DE MINAS": "Pará de Minas", "PATOS DE MINAS": "Patos de Minas", "UBA": "Ubá",
  "TRES PONTAS": "Três Pontas", "MANHUACU": "Manhuaçu", "ARACUAI": "Araçuaí", "BRAZOPOLIS": "Brazópolis", "VIDEO": "Vídeo", "OUTRA": "Outra comarca" };

const RE_PROC = /\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?(\d{4}|\?{4})/;
const RE_PROC_G = /\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}|\b\d{20}\b/g;

export function processoDe(c) {
  const m = RE_PROC.exec(c.n || "") || /\b\d{20}\b/.exec(c.n || "");
  if (m) return m[0];
  const d = /Processo:\**\s*([\d.\-]{15,25})/.exec(c.desc || "");
  return d ? d[1] : "";
}
/** chave do processo = só os dígitos (com ou sem pontuação, sempre a mesma) */
export function procKey(c) { return digitos(processoDe(c)); }
export function formataProc(p) {
  const d = digitos(p);
  if (d.length === 20) return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14, 16)}.${d.slice(16)}`;
  return p;
}

export function comarcaDe(c) {
  const up = semAcento(c.n);
  const m = /(\d{7}-?\d{2}\.?\d{4}\.?8\.?13\.?(\d{4}))|(\d{16}813(\d{4}))/.exec((c.n || "").replace(/\s/g, ""));
  if (m) { const cod = m[2] || m[4]; if (CODCOM[cod]) return CODCOM[cod]; }
  for (const k of COMARCAS) { if (up.includes(semAcento(k))) return CANON[k] || k; }
  for (const lb of (c.lb || [])) { const u = semAcento(lb); for (const k of COMARCAS) if (u === semAcento(k)) return CANON[k] || k; }
  return "OUTRA";
}
export function comarcaBonita(k) { return NOME_COMARCA[k] || k.charAt(0) + k.slice(1).toLowerCase(); }

/* data da perícia gravada no título: [MURIAE-30-11-26] ou [BELOHORIZONT-DATA A CONFIRMAR] */
const TOKDATA = /\[([A-Z .]+?)[- ](\d{2})-(\d{2})-(\d{2})[ \]·]/;
export function dataPericia(c) { const m = TOKDATA.exec(semAcento(c.n) + " ]"); return m ? `20${m[4]}-${m[3]}-${m[2]}` : ""; }
export function horaDe(c) { const m = /\b([01]?\d|2[0-3]):([0-5]\d)\b/.exec(c.n || ""); return m ? m[0].padStart(5, "0") : ""; }

export function valorDe(c) {
  const m = /R\$\s*([\d.]+,\d{2})/.exec(c.n || "");
  if (m) return parseFloat(m[1].replace(/\./g, "").replace(",", "."));
  const d = /(?:Honor[aá]rio|Valor)\**:\**\s*R\$\s*([\d.]+,\d{2})/i.exec(c.desc || "");
  return d ? parseFloat(d[1].replace(/\./g, "").replace(",", ".")) : null;
}

/* estágio pelo marcador do título */
export function estagioDe(c) {
  const n = semAcento(c.n);
  if (/INTIMADA P\/ AGENDAR/.test(n)) return "INTIMADA P/ AGENDAR";
  const m = /^\W*\[([A-Z ]+?)(?: ([\d\/?]+|[a-z]{3}\/\d{2}))?\]/i.exec(n);
  return m ? m[1].trim() : "";
}
/** data de entrega: [ENTREGUE dd/mm/aaaa] no título ou "ENTREGUE em dd/mm/aaaa" na descrição */
export function entregueEm(c) {
  const m = /ENTREGUE\s+(?:em\s+)?(\d{2})\/(\d{2})\/(\d{4})/i.exec(c.n || "") || /ENTREGUE\s+(?:em\s+)?(\d{2})\/(\d{2})\/(\d{4})/i.exec(c.desc || "");
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
}
const RE_VARA = /\b(VARA|JESP|JUIZADO|V\.\s?CV|V\.\s?C[IÍ]VEL|CIVEL|C[IÍ]VEL|FAZENDA|IN LOCO|\d+ ?V\b)/i;
const PALAVRAS_NAO_NOME = /^(R\$|LAUDO AT|SEM ?DATA|A COMPLETAR|PJE|EPROC|DPVAT|INSS|CURATELA|BPC|PERICIADO \?|MENOR|IMP VENCIDA|NAO FOI|VIDEO)/i;

/** segmentos do título, sem o marcador, o número e o valor */
function segmentos(c) {
  let t = (c.n || "").replace(/^\W*\[[^\]]*\]\s*/, "").replace(RE_PROC_G, " ").replace(/R\$\s*[\d.,?]+/g, " ");
  return t.split(/\s*[·—–|]\s*|\s+-\s+|\s+--\s+|\s*\(|\)\s*/).map(s => s.trim()).filter(Boolean);
}
export function varaDe(c) {
  const seg = segmentos(c).find(s => RE_VARA.test(s));
  if (seg) return seg;
  const d = /(?:Comarca(?: \/ Vara)?)\**:\**\s*([^\n]+)/i.exec(c.desc || "");
  return d && RE_VARA.test(d[1]) ? d[1].trim() : "";
}
/** nome do periciado escrito na descrição (Periciado: …) — fonte mais confiável */
export function periciadoDesc(c) {
  const d = /Periciad[oa]\**:\**\s*([^\n—(]+)/i.exec(c.desc || "");
  if (d && !/a completar|^\s*[—-]|\?|o r[eé]u|a r[eé]|o autor|a autora/i.test(d[1])) return d[1].trim();
  return "";
}
/* palavra minúscula que não é conectivo → o segmento é frase, não nome */
const CONECTIVO = /^(de|da|do|das|dos|e|di|del|von|van|y)$/;
function pareceNome(s) { const w = s.trim().split(/\s+/); if (w.length < 2 || w.length > 8) return false; return w.every(x => CONECTIVO.test(x) || /^[A-ZÀ-Ú][A-Za-zÀ-ÿ']*$/.test(x) || /^[A-ZÀ-Ú'À-Ú]+$/.test(x)); }
/** nome do periciado: descrição primeiro; senão, segmento do título que parece nome (2+ palavras, sem frase) */
export function periciadoDe(c) {
  const d = periciadoDesc(c); if (d) return d;
  const com = comarcaDe(c);
  const cand = segmentos(c).map(s => s.replace(/^A:\s*/, "").trim()).filter(s => /^[A-Za-zÀ-ÿ' ]{5,}$/.test(s) && pareceNome(s) && !RE_VARA.test(s) && !PALAVRAS_NAO_NOME.test(s)
    && !COMARCAS.some(k => semAcento(s).includes(semAcento(k))) && semAcento(s) !== com && !/^(MURIAE|BH)\b/.test(semAcento(s)));
  cand.sort((a, b) => b.length - a.length);
  return cand[0] || "";
}
export function sistemaDe(c) {
  const t = (c.n || "") + "\n" + (c.desc || "");
  if (/\beproc\b/i.test(t) && !/\bPJe\b/.test(t)) return "eproc";
  if (/\bPJe\b/.test(t) && !/\beproc\b/i.test(t)) return "PJe";
  const f = /Fonte:\s*(PJe|eproc)/i.exec(t); if (f) return f[1];
  const s = /Sistema:\**\s*(PJe|eproc)/i.exec(t); if (s) return s[1];
  return "";
}

/* ---- blocos da descrição ---- */
export function acompanhamento(desc) {
  const i = (desc || "").indexOf("ACOMPANHAMENTO PROCESSUAL");
  if (i < 0) return null;
  const b = desc.slice(i);
  const g = re => { const m = re.exec(b); return m ? m[1].trim() : ""; };
  const sit = /Situa[cç][aã]o em (\d{2}\/\d{2}\/\d{4}):\s*([^\n]+)/i.exec(b);
  return {
    em: sit ? sit[1] : "", situacao: sit ? sit[2].trim() : g(/Situa[cç][aã]o:\s*([^\n]+)/i),
    ultimo: g(/[UÚ]ltimo movimento:\s*([^\n]+)/i), fonte: g(/Fonte:\s*([^\n]+)/i), proxima: g(/Pr[oó]xima provid[eê]ncia:\s*([^\n]+)/i),
  };
}
export function historicoCobrancas(desc) {
  const i = (desc || "").search(/HIST[OÓ]RICO DE COBRAN[CÇ]AS?/i);
  if (i < 0) return [];
  const linhas = desc.slice(i).split("\n").slice(1);
  const out = [];
  for (const l of linhas) { const m = /^\s*[-•*]\s*(\d{2}\/\d{2}(?:\/\d{2,4})?)\s*[—–-]?\s*(.*)$/.exec(l); if (m) out.push({ data: m[1], o: m[2].trim() }); else if (l.trim() === "" && out.length) break; else if (!/^\s*[-•*]/.test(l) && out.length) break; }
  return out;
}
export function ordemPagamento(desc) { const m = /ORDEM DE PAGAMENTO:\s*([^\n]+)/i.exec(desc || ""); return m ? m[1].trim() : ""; }
export function statusDesc(desc) { const m = /^\**Status\**:\**\s*([^\n]+)/im.exec(desc || ""); return m ? m[1].trim() : ""; }
export function linksDe(desc, anexos = []) {
  const urls = new Set();
  for (const m of (desc || "").matchAll(/https?:\/\/[^\s)\]>"']+/g)) urls.add(m[0]);
  for (const a of anexos) if (a.url) urls.add(a.url);
  const arr = [...urls];
  return { pje: arr.filter(u => /pje/i.test(u)), eproc: arr.filter(u => /eproc/i.test(u)), trello: arr.filter(u => /trello\.com/i.test(u)), outros: arr.filter(u => !/pje|eproc|trello\.com/i.test(u)) };
}

/** dd/mm sem ano → data ISO inferida (nunca no futuro; se ficaria no futuro, é do ano passado) */
export function ddmmParaISO(s, ref = HOJE()) {
  const m = /^(\d{2})\/(\d{2})(?:\/(\d{2,4}))?$/.exec(s || "");
  if (!m) return "";
  let y = m[3] ? (m[3].length === 2 ? "20" + m[3] : m[3]) : ref.slice(0, 4);
  let iso = `${y}-${m[2]}-${m[1]}`;
  if (!m[3] && iso > ref) iso = `${+y - 1}-${m[2]}-${m[1]}`;
  return iso;
}

/** Tudo o que o site extrai de um card, de uma vez. */
export function parseCard(c) {
  const p = {
    proc: processoDe(c), key: procKey(c), comarca: comarcaDe(c), vara: varaDe(c), periciado: periciadoDe(c), valor: valorDe(c),
    dataPericia: dataPericia(c), hora: horaDe(c), estagio: estagioDe(c), entregue: entregueEm(c), sistema: sistemaDe(c),
  };
  return p;
}
