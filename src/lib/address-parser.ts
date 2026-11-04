import { getDb } from './db';
import { normalize, expandAbbreviations, fuzzyScore, stripNoise, stripAdminPrefix, levenshteinScore } from './normalize';
import { PROVINCE_ALIASES } from './aliases';

interface MappingRow {
  commune_code: string;
  new_commune_name: string | null;
  new_province_code: string | null;
  new_province_name: string | null;
  new_commune_name_normalized: string | null;
  new_province_name_normalized: string | null;
  old_commune_name: string | null;
  old_district_code: string | null;
  old_district_name: string | null;
  old_province_code: string | null;
  old_province_name: string | null;
  old_commune_name_normalized: string | null;
  old_district_name_normalized: string | null;
  old_province_name_normalized: string | null;
}

export interface ConvertResult {
  input: string;
  direction: 'new_to_old' | 'old_to_new';
  result: {
    commune_code: string;
    commune: string;
    district?: string;
    province: string;
  } | null;
  original: {
    commune: string;
    district?: string;
    province: string;
  } | null;
  candidates?: Array<{
    commune_code: string;
    commune: string;
    district?: string;
    province: string;
    score: number;
  }>;
}

interface ProvinceInfo {
  code: string;
  name: string;
  nameNormalized: string;
}

let _provincesCache: ProvinceInfo[] | null = null;

function getProvinces(db: ReturnType<typeof getDb>): ProvinceInfo[] {
  if (_provincesCache) return _provincesCache;
  const rows = db.prepare(`
    SELECT DISTINCT new_province_code as code, new_province_name as name, new_province_name_normalized as nameNormalized
    FROM dia_chi_mapping WHERE new_province_code IS NOT NULL
    UNION
    SELECT DISTINCT old_province_code, old_province_name, old_province_name_normalized
    FROM dia_chi_mapping WHERE old_province_code IS NOT NULL
  `).all() as ProvinceInfo[];
  _provincesCache = rows;
  return rows;
}

function stripPhone(text: string): string {
  return text.replace(/0\d{9,10}/g, '').trim();
}

function smartSplit(text: string): string[] {
  const byDelimiter = text
    .split(/[,\-–—]/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  if (byDelimiter.length >= 2) return byDelimiter;

  // No delimiters — try to split by admin keywords
  const adminKeywords = /\b(phường|phuong|xã|xa|thị trấn|thi tran|quận|quan|huyện|huyen|thành phố|thanh pho|thị xã|thi xa|tỉnh|tinh|tp\.|tx\.|tt\.|q\.|p\.|h\.)\s/gi;

  const parts: string[] = [];
  let lastIdx = 0;
  let match;

  const expanded = expandAbbreviations(text);
  const testStr = expanded;

  adminKeywords.lastIndex = 0;
  while ((match = adminKeywords.exec(testStr)) !== null) {
    if (match.index > lastIdx) {
      const before = testStr.substring(lastIdx, match.index).trim();
      if (before) parts.push(before);
    }
    lastIdx = match.index;
  }
  if (lastIdx < testStr.length) {
    parts.push(testStr.substring(lastIdx).trim());
  }

  if (parts.length >= 2) return parts;

  return byDelimiter;
}

function extractProvinceFromText(
  text: string,
  provinces: ProvinceInfo[]
): { provinceCode: string; provinceName: string; remaining: string } | null {
  const words = text.split(/\s+/);
  if (words.length < 2) return null;

  // Try 4, 3, 2, 1 words from the right — descending to prefer longer (more specific) matches
  for (let wordCount = Math.min(4, words.length - 1); wordCount >= 1; wordCount--) {
    const provWords = words.slice(-wordCount).join(' ');
    const provNorm = normalize(provWords);
    const provClean = provNorm.replace(/^(tinh|thanh pho|tp)\s+/, '');

    if (provClean.length < 2) continue;

    // Check aliases
    const aliasCode = PROVINCE_ALIASES[provNorm] || PROVINCE_ALIASES[provClean];
    if (aliasCode) {
      const prov = provinces.find(p => p.code === aliasCode);
      if (prov) {
        return {
          provinceCode: prov.code,
          provinceName: prov.name,
          remaining: words.slice(0, -wordCount).join(' '),
        };
      }
    }

    // Exact match only (no includes — avoids eating commune words into province)
    for (const prov of provinces) {
      const dbClean = (prov.nameNormalized || normalize(prov.name)).replace(/^(tinh|thanh pho|tp)\s+/, '');
      if (dbClean === provClean) {
        return {
          provinceCode: prov.code,
          provinceName: prov.name,
          remaining: words.slice(0, -wordCount).join(' '),
        };
      }
    }

    // Levenshtein for typos
    if (provClean.length >= 3) {
      let bestProv: ProvinceInfo | null = null;
      let bestScore = 0;
      for (const prov of provinces) {
        const dbClean = (prov.nameNormalized || normalize(prov.name)).replace(/^(tinh|thanh pho|tp)\s+/, '');
        const score = levenshteinScore(provClean, dbClean);
        if (score > bestScore && score >= 75) {
          bestScore = score;
          bestProv = prov;
        }
      }
      if (bestProv) {
        return {
          provinceCode: bestProv.code,
          provinceName: bestProv.name,
          remaining: words.slice(0, -wordCount).join(' '),
        };
      }
    }
  }

  return null;
}

function matchProvinceFromParts(
  parts: string[],
  provinces: ProvinceInfo[]
): { provinceCode: string; provinceName: string; remainingParts: string[] } | null {
  for (let i = parts.length - 1; i >= 0; i--) {
    const partExpanded = expandAbbreviations(parts[i]);
    const partNorm = normalize(partExpanded);

    // Check aliases first
    const aliasCode = PROVINCE_ALIASES[partNorm];
    if (aliasCode) {
      const prov = provinces.find(p => p.code === aliasCode);
      if (prov) {
        return {
          provinceCode: prov.code,
          provinceName: prov.name,
          remainingParts: parts.filter((_, idx) => idx !== i),
        };
      }
    }

    // Exact match only (no includes — avoids eating commune words mixed in the same part)
    const partClean = stripAdminPrefix(partExpanded);
    for (const prov of provinces) {
      const provClean = (prov.nameNormalized || normalize(prov.name)).replace(/^(tinh|thanh pho|tp)\s+/, '');
      if (provClean === partClean) {
        return {
          provinceCode: prov.code,
          provinceName: prov.name,
          remainingParts: parts.filter((_, idx) => idx !== i),
        };
      }
    }

    // Levenshtein fallback for typos (threshold: 80%+ similarity)
    if (partClean.length >= 3) {
      let bestProv: ProvinceInfo | null = null;
      let bestScore = 0;
      for (const prov of provinces) {
        const provClean = (prov.nameNormalized || normalize(prov.name)).replace(/^(tinh|thanh pho|tp)\s+/, '');
        const score = levenshteinScore(partClean, provClean);
        if (score > bestScore && score >= 80) {
          bestScore = score;
          bestProv = prov;
        }
      }
      if (bestProv) {
        return {
          provinceCode: bestProv.code,
          provinceName: bestProv.name,
          remainingParts: parts.filter((_, idx) => idx !== i),
        };
      }
    }
  }

  return null;
}

function isNumeric(s: string): boolean {
  return /^\d+$/.test(s);
}

function hasDistrictPrefix(text: string): boolean {
  return /^(quan|huyen|thanh pho|tp|thi xa|tx)\s/i.test(normalize(text));
}

function scoreCommune(
  needle: string,
  rowName: string,
  rowNameNormalized: string | null,
): number {
  const needleNorm = normalize(needle);
  const rowNorm = rowNameNormalized || normalize(rowName);
  const needleClean = stripAdminPrefix(needle);
  const rowClean = rowNorm.replace(/^(phuong|xa|thi tran)\s+/, '');

  if (!needleClean || !rowClean) return 0;

  if (rowNorm === needleNorm) return 100;
  if (rowClean === needleClean) return 95;

  // For numeric values (Phường 1, Phường 10), includes would false-match — exact only
  if (isNumeric(needleClean) || isNumeric(rowClean)) {
    const levScore = levenshteinScore(needleClean, rowClean);
    if (levScore >= 65) return levScore;
    return 0;
  }

  if (rowNorm.includes(needleNorm) || needleNorm.includes(rowNorm)) return 85;
  if (rowClean.includes(needleClean) || needleClean.includes(rowClean)) return 80;

  const levScore = levenshteinScore(needleClean, rowClean);
  if (levScore >= 65) return levScore;

  return 0;
}

function scoreDistrict(
  needle: string,
  rowName: string,
  rowNameNormalized: string | null,
): number {
  const needleNorm = normalize(needle);
  const rowNorm = rowNameNormalized || normalize(rowName);
  const needleClean = needleNorm.replace(/^(quan|huyen|thanh pho|tp|thi xa|tx)\s+/, '');
  const rowClean = rowNorm.replace(/^(quan|huyen|thanh pho|tp|thi xa|tx)\s+/, '');

  if (!needleClean || !rowClean) return 0;

  if (rowClean === needleClean || rowNorm === needleNorm) return 25;

  // For numeric districts (Quận 1, Quận 10), includes would false-match — exact only
  if (isNumeric(needleClean) || isNumeric(rowClean)) {
    const levScore = levenshteinScore(needleClean, rowClean);
    if (levScore >= 75) return Math.round(levScore * 0.25);
    return 0;
  }

  if (rowClean.includes(needleClean) || needleClean.includes(rowClean)) return 20;

  const levScore = levenshteinScore(needleClean, rowClean);
  if (levScore >= 75) return Math.round(levScore * 0.25);

  return 0;
}

export function convertAddress(text: string, direction: 'new_to_old' | 'old_to_new'): ConvertResult {
  const db = getDb();

  // Step 1: Clean input
  let cleaned = stripPhone(text);
  cleaned = stripNoise(cleaned);
  cleaned = expandAbbreviations(cleaned);

  // Step 2: Smart split
  const parts = smartSplit(cleaned);

  if (parts.length === 0) {
    return { input: text, direction, result: null, original: null };
  }

  // Step 3: Match province (right to left)
  const provinces = getProvinces(db);
  let provinceMatch: { provinceCode: string; provinceName: string; remainingParts: string[] } | null = null;
  let remaining: string[];

  if (parts.length === 1) {
    // Single string, no delimiters — use word-by-word extraction
    const extracted = extractProvinceFromText(parts[0], provinces);
    if (extracted) {
      provinceMatch = {
        provinceCode: extracted.provinceCode,
        provinceName: extracted.provinceName,
        remainingParts: extracted.remaining.trim() ? [extracted.remaining] : [],
      };
    }
    remaining = provinceMatch ? provinceMatch.remainingParts : parts;
  } else {
    // Multiple parts — try matching each part as a province
    provinceMatch = matchProvinceFromParts(parts, provinces);
    remaining = provinceMatch ? provinceMatch.remainingParts : parts;

    // Fallback: try word-by-word extraction on each part (right to left)
    if (!provinceMatch) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const extracted = extractProvinceFromText(parts[i], provinces);
        if (extracted) {
          const newRemaining = [...parts];
          if (extracted.remaining.trim()) {
            newRemaining[i] = extracted.remaining;
          } else {
            newRemaining.splice(i, 1);
          }
          provinceMatch = {
            provinceCode: extracted.provinceCode,
            provinceName: extracted.provinceName,
            remainingParts: newRemaining,
          };
          remaining = newRemaining;
          break;
        }
      }
    }
  }

  let result: ConvertResult;
  if (direction === 'new_to_old') {
    result = convertNewToOld(text, db, remaining, provinceMatch);
  } else {
    result = convertOldToNew(text, db, remaining, provinceMatch);
  }

  // Auto-fallback: if no result found, try the other direction
  if (!result.result) {
    const otherDirection = direction === 'new_to_old' ? 'old_to_new' : 'new_to_old';
    let fallback: ConvertResult;
    if (otherDirection === 'new_to_old') {
      fallback = convertNewToOld(text, db, remaining, provinceMatch);
    } else {
      fallback = convertOldToNew(text, db, remaining, provinceMatch);
    }
    if (fallback.result) {
      fallback.direction = otherDirection;
      return fallback;
    }
  }

  return result;
}

function convertNewToOld(
  text: string,
  db: ReturnType<typeof getDb>,
  remaining: string[],
  provinceMatch: { provinceCode: string; provinceName: string } | null
): ConvertResult {
  let query = `SELECT * FROM dia_chi_mapping WHERE new_commune_name IS NOT NULL`;
  const params: string[] = [];

  if (provinceMatch) {
    query += ` AND new_province_code = ?`;
    params.push(provinceMatch.provinceCode);
  }

  const rows = db.prepare(query).all(...params) as MappingRow[];
  const allScored: Array<{ row: MappingRow; score: number }> = [];

  for (const part of remaining) {
    for (const row of rows) {
      const score = scoreCommune(part, row.new_commune_name || '', row.new_commune_name_normalized);
      if (score > 0) {
        allScored.push({ row, score });
      }
    }
  }

  if (remaining.length > 1) {
    const joined = remaining.join(' ');
    for (const row of rows) {
      const score = scoreCommune(joined, row.new_commune_name || '', row.new_commune_name_normalized);
      if (score > 0) {
        allScored.push({ row, score });
      }
    }
  }

  // Deduplicate by commune_code, keep highest score
  const bestByCode = new Map<string, { row: MappingRow; score: number }>();
  for (const entry of allScored) {
    const existing = bestByCode.get(entry.row.commune_code);
    if (!existing || entry.score > existing.score) {
      bestByCode.set(entry.row.commune_code, entry);
    }
  }

  const scored = [...bestByCode.values()].sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { input: text, direction: 'new_to_old', result: null, original: null };
  }

  // Prefer entries that have an old mapping, but only within a close score range
  const topScore = scored[0].score;
  const bestWithOld = scored.find(s => s.row.old_commune_name && s.score >= topScore - 5);
  const best = bestWithOld ? bestWithOld.row : scored[0].row;
  return {
    input: text,
    direction: 'new_to_old',
    result: best.old_commune_name
      ? {
          commune_code: best.commune_code,
          commune: best.old_commune_name,
          district: best.old_district_name || undefined,
          province: best.old_province_name || best.new_province_name || '',
        }
      : null,
    original: {
      commune: best.new_commune_name || '',
      province: best.new_province_name || '',
    },
    candidates: scored.length > 1
      ? scored.slice(0, 5).map(s => ({
          commune_code: s.row.commune_code,
          commune: s.row.old_commune_name || s.row.new_commune_name || '',
          district: s.row.old_district_name || undefined,
          province: s.row.old_province_name || s.row.new_province_name || '',
          score: s.score,
        }))
      : undefined,
  };
}

function findDistrictMatch(
  parts: string[],
  db: ReturnType<typeof getDb>,
  provinceCode: string | null,
): { districtCode: string; districtName: string; remainingParts: string[] } | null {
  let query = `SELECT DISTINCT old_district_code, old_district_name, old_district_name_normalized FROM dia_chi_mapping WHERE old_district_name IS NOT NULL`;
  const params: string[] = [];
  if (provinceCode) {
    query += ` AND (old_province_code = ? OR new_province_code = ?)`;
    params.push(provinceCode, provinceCode);
  }
  const districts = db.prepare(query).all(...params) as Array<{ old_district_code: string; old_district_name: string; old_district_name_normalized: string }>;

  let bestIdx = -1;
  let bestScore = 0;
  let bestDistrict: typeof districts[0] | null = null;

  for (let i = 0; i < parts.length; i++) {
    const partNorm = normalize(parts[i]);
    const partClean = partNorm.replace(/^(quan|huyen|thanh pho|tp|thi xa|tx)\s+/, '');
    for (const d of districts) {
      const dClean = (d.old_district_name_normalized || normalize(d.old_district_name)).replace(/^(quan|huyen|thanh pho|tp|thi xa|tx)\s+/, '');
      let score = 0;
      if (dClean === partClean) score = 100;
      else if (dClean === partNorm) score = 95;
      else {
        const lev = levenshteinScore(partClean, dClean);
        if (lev >= 80) score = lev;
      }
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
        bestDistrict = d;
      }
    }
  }

  if (bestDistrict && bestScore >= 80) {
    return {
      districtCode: bestDistrict.old_district_code,
      districtName: bestDistrict.old_district_name,
      remainingParts: parts.filter((_, idx) => idx !== bestIdx),
    };
  }
  return null;
}

function convertOldToNew(
  text: string,
  db: ReturnType<typeof getDb>,
  remaining: string[],
  provinceMatch: { provinceCode: string; provinceName: string } | null
): ConvertResult {
  // Try to identify a district from the remaining parts (first within province, then globally)
  let districtMatch = findDistrictMatch(remaining, db, provinceMatch?.provinceCode || null);
  if (!districtMatch && provinceMatch) {
    districtMatch = findDistrictMatch(remaining, db, null);
  }

  let query = `SELECT * FROM dia_chi_mapping WHERE old_commune_name IS NOT NULL`;
  const params: string[] = [];

  if (districtMatch) {
    query += ` AND old_district_code = ?`;
    params.push(districtMatch.districtCode);
  } else if (provinceMatch) {
    query += ` AND (old_province_code = ? OR new_province_code = ?)`;
    params.push(provinceMatch.provinceCode, provinceMatch.provinceCode);
  }

  const rows = db.prepare(query).all(...params) as MappingRow[];

  // If district matched and no commune parts left, return all communes in that district
  const communeRemaining = districtMatch ? districtMatch.remainingParts : remaining;
  const communeParts = communeRemaining.filter(p => !hasDistrictPrefix(p));
  const allParts = communeRemaining;

  const allScored: Array<{ row: MappingRow; score: number }> = [];

  if (districtMatch && (communeParts.length === 0 || communeParts.every(p => p.trim().length < 2))) {
    // No meaningful commune specified — list all communes in this district
    for (const row of rows) {
      allScored.push({ row, score: 50 });
    }
  } else {
    for (const row of rows) {
      let bestCommuneScore = 0;
      let districtBonus = 0;

      for (const part of communeParts) {
        const cs = scoreCommune(part, row.old_commune_name || '', row.old_commune_name_normalized);
        if (cs > bestCommuneScore) bestCommuneScore = cs;
      }

      if (communeParts.length > 1) {
        const joined = communeParts.join(' ');
        const cs = scoreCommune(joined, row.old_commune_name || '', row.old_commune_name_normalized);
        if (cs > bestCommuneScore) bestCommuneScore = cs;
      }

      if (!districtMatch && bestCommuneScore > 0 && row.old_district_name) {
        for (const part of allParts) {
          const ds = scoreDistrict(part, row.old_district_name, row.old_district_name_normalized);
          if (ds > districtBonus) districtBonus = ds;
        }
      }

      const totalScore = bestCommuneScore + districtBonus;
      if (totalScore > 0) {
        allScored.push({ row, score: totalScore });
      }
    }

    // If district matched but no commune scored well, fall back to listing all in district
    if (allScored.length === 0 && districtMatch) {
      for (const row of rows) {
        allScored.push({ row, score: 50 });
      }
    }
  }

  // Deduplicate
  const bestByCode = new Map<string, { row: MappingRow; score: number }>();
  for (const entry of allScored) {
    const existing = bestByCode.get(entry.row.commune_code);
    if (!existing || entry.score > existing.score) {
      bestByCode.set(entry.row.commune_code, entry);
    }
  }

  const scored = [...bestByCode.values()].sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { input: text, direction: 'old_to_new', result: null, original: null };
  }

  // Prefer entries that have a new mapping, but only within a close score range
  const topScore = scored[0].score;
  const bestWithNew = scored.find(s => s.row.new_commune_name && s.score >= topScore - 5);
  const best = bestWithNew ? bestWithNew.row : scored[0].row;
  return {
    input: text,
    direction: 'old_to_new',
    result: best.new_commune_name
      ? {
          commune_code: best.commune_code,
          commune: best.new_commune_name,
          province: best.new_province_name || '',
        }
      : null,
    original: {
      commune: best.old_commune_name || '',
      district: best.old_district_name || undefined,
      province: best.old_province_name || '',
    },
    candidates: scored.length > 1
      ? scored.slice(0, 5).map(s => ({
          commune_code: s.row.commune_code,
          commune: s.row.new_commune_name || s.row.old_commune_name || '',
          province: s.row.new_province_name || s.row.old_province_name || '',
          score: s.score,
        }))
      : undefined,
  };
}
