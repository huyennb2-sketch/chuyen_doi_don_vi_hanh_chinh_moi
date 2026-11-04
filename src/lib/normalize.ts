export function removeDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function normalize(str: string): string {
  return removeDiacritics(str).toLowerCase().trim().replace(/\s+/g, ' ');
}

export function expandAbbreviations(str: string): string {
  return str
    .replace(/\bQ\.?\s*(\d+)/gi, 'Quận $1')
    .replace(/\bQ\.\s*/gi, 'Quận ')
    .replace(/\bP\.\s*/gi, 'Phường ')
    .replace(/\bTP\.\s*/gi, 'Thành phố ')
    .replace(/\bTX\.\s*/gi, 'Thị xã ')
    .replace(/\bTT\.\s*/gi, 'Thị trấn ')
    .replace(/\bTT\s+/gi, 'Thị trấn ')
    .replace(/\bH\.\s*/gi, 'Huyện ')
    .replace(/\bĐ\.\s*/gi, 'Đường ')
    .trim();
}

export function levenshtein(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;

  let prev = Array.from({ length: lb + 1 }, (_, i) => i);
  let curr = new Array(lb + 1);

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[lb];
}

export function levenshteinScore(needle: string, haystack: string): number {
  const n = normalize(needle);
  const h = normalize(haystack);
  if (n === h) return 100;
  const maxLen = Math.max(n.length, h.length);
  if (maxLen === 0) return 100;
  const dist = levenshtein(n, h);
  const similarity = 1 - dist / maxLen;
  return Math.round(similarity * 100);
}

export function fuzzyScore(needle: string, haystack: string): number {
  const n = normalize(needle);
  const h = normalize(haystack);
  if (!n || !h) return 0;
  if (n === h) return 100;
  if (h.includes(n)) return 80;
  if (n.includes(h)) return 60;

  const levScore = levenshteinScore(n, h);
  if (levScore >= 75) return levScore;

  return 0;
}

const NOISE_PATTERNS = [
  /^(?:(?:số|so)\s*)?\d+[a-zA-Z]?(?:[\s]*[\/\\-]\s*\d+)*\s*/i,
  /\b(?:đường|duong|phố|pho|đ\.)\s+[^\s,]+(?:\s+[^\s,]+){0,3}/gi,
  /\b(?:ngõ|ngo|ngách|ngach|hẻm|hem)\s+\d+[a-zA-Z]?(?:\s*[\/\\-]\s*\d+)*/gi,
  /\b(?:thôn|thon|ấp|ap|xóm|xom|tổ|to|khu phố|khu pho|khu|kp)\s+[^\s,]+(?:\s+\d+)*/gi,
  /\b(?:tòa|toa|chung cư|chung cu|cc|lô|lo|block|blk)\s+[^\s,]+/gi,
  /\b(?:số nhà|so nha|nhà số|nha so|sn)\s*\d+[a-zA-Z]?/gi,
];

export function stripNoise(text: string): string {
  let result = text;
  for (const pattern of NOISE_PATTERNS) {
    result = result.replace(pattern, ' ');
  }
  return result.replace(/\s+/g, ' ').trim();
}

const ADMIN_PREFIXES = /^(phuong|xa|thi tran|quan|huyen|thanh pho|tp|thi xa|tx|tinh)\s+/;

export function stripAdminPrefix(str: string): string {
  return normalize(str).replace(ADMIN_PREFIXES, '');
}
