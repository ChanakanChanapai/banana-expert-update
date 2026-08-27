import rawData from "thai-address-database/database/db.json";

export interface ThaiAddressItem {
  subdistrict: string;
  district: string;
  province: string;
  zipcode: string;
}

export interface StructuredAddress {
  houseNumber?: string;
  moo?: string;
  soi?: string;
  road?: string;
  detail: string; // Combined or specific house/building/street detail
  subdistrict: string; // แขวง/ตำบล
  district: string; // เขต/อำเภอ
  province: string; // จังหวัด
  zipcode: string; // รหัสไปรษณีย์
}

// Decompact the raw database once
let expandedAddresses: ThaiAddressItem[] | null = null;
let provinceList: string[] | null = null;

const preprocess = (): ThaiAddressItem[] => {
  if (expandedAddresses) return expandedAddresses;

  const { lookup: rawLookup, words: rawWords, data } = rawData as {
    lookup: string;
    words: string;
    data: any[];
  };

  const lookup = rawLookup.split("|");
  const words = rawWords.split("|");

  const translate = (text: string | number): string => {
    const repl = (m: string) => {
      const ch = m.charCodeAt(0);
      return words[ch < 97 ? ch - 65 : 26 + ch - 97];
    };
    if (typeof text === "number") {
      text = lookup[text];
    }
    return String(text).replace(/[A-Za-z]/g, repl);
  };

  const items: ThaiAddressItem[] = [];

  data.forEach((prov: any) => {
    const provName = translate(prov[0]);
    prov[1].forEach((amphoe: any) => {
      const amphoeName = translate(amphoe[0]);
      amphoe[1].forEach((dist: any) => {
        const distName = translate(dist[0]);
        const zipcodes = Array.isArray(dist[1]) ? dist[1] : [dist[1]];
        zipcodes.forEach((zip: any) => {
          items.push({
            subdistrict: distName,
            district: amphoeName,
            province: provName,
            zipcode: String(zip),
          });
        });
      });
    });
  });

  expandedAddresses = items;
  return expandedAddresses;
};

/**
 * Get all 77 unique provinces sorted in Thai alphabetical order
 */
export const getProvinces = (): string[] => {
  if (provinceList) return provinceList;
  const db = preprocess();
  const set = new Set<string>();
  db.forEach((item) => set.add(item.province));
  provinceList = Array.from(set).sort((a, b) => a.localeCompare(b, "th"));
  return provinceList;
};

/**
 * Get districts (อำเภอ/เขต) in a province
 */
export const getDistricts = (province: string): string[] => {
  if (!province) return [];
  const db = preprocess();
  const set = new Set<string>();
  db.forEach((item) => {
    if (item.province === province) {
      set.add(item.district);
    }
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, "th"));
};

/**
 * Get subdistricts (ตำบล/แขวง) and corresponding zipcodes for a district & province
 */
export const getSubdistricts = (
  province: string,
  district: string
): Array<{ subdistrict: string; zipcode: string }> => {
  if (!province || !district) return [];
  const db = preprocess();
  const map = new Map<string, string>();
  db.forEach((item) => {
    if (item.province === province && item.district === district) {
      map.set(item.subdistrict, item.zipcode);
    }
  });
  return Array.from(map.entries())
    .map(([subdistrict, zipcode]) => ({ subdistrict, zipcode }))
    .sort((a, b) => a.subdistrict.localeCompare(b.subdistrict, "th"));
};

/**
 * Find postal code for given province, district, subdistrict
 */
export const getZipcode = (
  province: string,
  district: string,
  subdistrict: string
): string => {
  if (!province || !district || !subdistrict) return "";
  const db = preprocess();
  const found = db.find(
    (item) =>
      item.province === province &&
      item.district === district &&
      item.subdistrict === subdistrict
  );
  return found ? found.zipcode : "";
};

/**
 * Search Thai address across subdistrict, district, province, and zipcode
 */
export const searchThaiAddress = (
  query: string,
  maxResults = 25
): ThaiAddressItem[] => {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const db = preprocess();
  const results: ThaiAddressItem[] = [];

  for (const item of db) {
    if (
      item.subdistrict.toLowerCase().includes(trimmed) ||
      item.district.toLowerCase().includes(trimmed) ||
      item.province.toLowerCase().includes(trimmed) ||
      item.zipcode.includes(trimmed)
    ) {
      results.push(item);
      if (results.length >= maxResults) break;
    }
  }

  return results;
};

/**
 * Format structured address fields into a standardized Thai address string
 */
export const formatFullAddress = (addr: {
  houseNumber?: string;
  moo?: string;
  soi?: string;
  road?: string;
  detail?: string;
  subdistrict: string;
  district: string;
  province: string;
  zipcode: string;
}): string => {
  const parts: string[] = [];

  // Build detail line if components provided
  const detailParts: string[] = [];
  if (addr.houseNumber?.trim()) {
    const num = addr.houseNumber.trim();
    detailParts.push(num.startsWith("เลขที่") ? num : `เลขที่ ${num}`);
  }
  if (addr.moo?.trim()) {
    const m = addr.moo.trim();
    detailParts.push(m.startsWith("หมู่") || m.startsWith("ม.") ? m : `หมู่ ${m}`);
  }
  if (addr.soi?.trim()) {
    const s = addr.soi.trim();
    detailParts.push(s.startsWith("ซอย") || s.startsWith("ซ.") ? s : `ซอย ${s}`);
  }
  if (addr.road?.trim()) {
    const r = addr.road.trim();
    detailParts.push(r.startsWith("ถนน") || r.startsWith("ถ.") ? r : `ถนน ${r}`);
  }

  if (detailParts.length > 0) {
    parts.push(detailParts.join(" "));
  } else if (addr.detail?.trim()) {
    parts.push(addr.detail.trim());
  }

  const isBKK =
    addr.province.includes("กรุงเทพ") || addr.province.includes("Bangkok");

  if (addr.subdistrict?.trim()) {
    const sub = addr.subdistrict.trim();
    const prefix = isBKK ? "แขวง" : "ตำบล ";
    if (!sub.startsWith("แขวง") && !sub.startsWith("ตำบล") && !sub.startsWith("ต.")) {
      parts.push(`${prefix}${sub}`);
    } else {
      parts.push(sub);
    }
  }

  if (addr.district?.trim()) {
    const dist = addr.district.trim();
    const prefix = isBKK ? "เขต" : "อำเภอ ";
    if (!dist.startsWith("เขต") && !dist.startsWith("อำเภอ") && !dist.startsWith("อ.")) {
      parts.push(`${prefix}${dist}`);
    } else {
      parts.push(dist);
    }
  }

  if (addr.province?.trim()) {
    const prov = addr.province.trim();
    const prefix = isBKK ? "" : "จังหวัด ";
    if (!prov.startsWith("จังหวัด") && !prov.startsWith("จ.") && !isBKK) {
      parts.push(`${prefix}${prov}`);
    } else {
      parts.push(prov);
    }
  }

  if (addr.zipcode?.trim()) {
    parts.push(addr.zipcode.trim());
  }

  return parts.join(" ").trim();
};

/**
 * Parse an existing unstructured or semi-structured address string into structured parts
 */
export const parseAddressString = (fullStr: string): StructuredAddress => {
  if (!fullStr || !fullStr.trim()) {
    return {
      houseNumber: "",
      moo: "",
      soi: "",
      road: "",
      detail: "",
      subdistrict: "",
      district: "",
      province: "",
      zipcode: "",
    };
  }

  const clean = fullStr.trim();
  const db = preprocess();

  // Extract 5-digit zipcode if present
  const zipMatch = clean.match(/(\d{5})/);
  const zipcode = zipMatch ? zipMatch[1] : "";

  // Try to find matching province
  const provinces = getProvinces();
  let foundProvince = "";
  for (const prov of provinces) {
    if (clean.includes(prov)) {
      foundProvince = prov;
      break;
    }
  }

  // If province found, look for district
  let foundDistrict = "";
  let foundSubdistrict = "";

  if (foundProvince) {
    const districts = getDistricts(foundProvince);
    for (const dist of districts) {
      if (clean.includes(dist)) {
        foundDistrict = dist;
        break;
      }
    }

    if (foundDistrict) {
      const subdistricts = getSubdistricts(foundProvince, foundDistrict);
      for (const sub of subdistricts) {
        if (clean.includes(sub.subdistrict)) {
          foundSubdistrict = sub.subdistrict;
          break;
        }
      }
    }
  } else {
    // Search by zipcode or scan all
    const candidates = zipcode ? db.filter((i) => i.zipcode === zipcode) : db;
    for (const item of candidates) {
      if (clean.includes(item.subdistrict) && clean.includes(item.district)) {
        foundSubdistrict = item.subdistrict;
        foundDistrict = item.district;
        foundProvince = item.province;
        break;
      }
    }
  }

  // Remove found parts from detail
  let detail = clean;
  if (zipcode) detail = detail.replace(new RegExp(`\\b${zipcode}\\b`, "g"), "");
  if (foundProvince) {
    detail = detail.replace(new RegExp(`(จังหวัด|จ\\.?\\s*)?${foundProvince}`, "g"), "");
  }
  if (foundDistrict) {
    detail = detail.replace(new RegExp(`(อำเภอ|เขต|อ\\.?\\s*)?${foundDistrict}`, "g"), "");
  }
  if (foundSubdistrict) {
    detail = detail.replace(new RegExp(`(ตำบล|แขวง|ต\\.?\\s*)?${foundSubdistrict}`, "g"), "");
  }

  // Clean trailing punctuation or extra spaces
  detail = detail.replace(/\s+/g, " ").trim();

  // Try extracting houseNumber, moo, soi, road
  let houseNumber = "";
  let moo = "";
  let soi = "";
  let road = "";

  const houseMatch = detail.match(/(?:เลขที่\s*|บ้านเลขที่\s*)?([0-9]+(?:\/[0-9]+)?)/i);
  const mooMatch = detail.match(/(?:หมู่ที่|หมู่|ม\.)\s*([0-9]+)/i);
  const soiMatch = detail.match(/(?:ซอย|ซ\.)\s*([^\s,]+(?:\s+[0-9]+)?)/i);
  const roadMatch = detail.match(/(?:ถนน|ถ\.)\s*([^\s,]+)/i);

  if (houseMatch) houseNumber = houseMatch[1] || "";
  if (mooMatch) moo = mooMatch[1] || "";
  if (soiMatch) soi = soiMatch[1] || "";
  if (roadMatch) road = roadMatch[1] || "";

  return {
    houseNumber,
    moo,
    soi,
    road,
    detail,
    subdistrict: foundSubdistrict,
    district: foundDistrict,
    province: foundProvince,
    zipcode: zipcode || (foundProvince && foundDistrict && foundSubdistrict ? getZipcode(foundProvince, foundDistrict, foundSubdistrict) : ""),
  };
};
