export const normalize = (value) => value.toLocaleLowerCase().replace(/[\s\-‐‑–—]+/gu, '').trim();

const brandAliases = {
  apple: '苹果', sony: '索尼', sonycomputerentertainment: '索尼',
  nintendo: '任天堂', motorola: '摩托罗拉', xiaomi: '小米',
  hewlettpackard: '惠普', casio: '卡西欧', amazon: '亚马逊',
  raspberrypifoundation: '树莓派',
};

export function matches(exhibit, filters) {
  const haystack = [exhibit.name, exhibit.brand, brandAliases[normalize(exhibit.brand)] || '', ...(exhibit.aliases || []), ...(exhibit.tags || []), exhibit.summary].join(' ');
  return (!filters.q || normalize(haystack).includes(normalize(filters.q)))
    && (!filters.category || (exhibit.category === filters.category || exhibit.legacyCategory === filters.category))
    && (!filters.line || exhibit.readingLine === filters.line)
    && (!filters.award || (exhibit.awards || []).some(a=>a.programId===filters.award))
    && (!filters.decade || Math.floor(exhibit.year / 10) * 10 === Number(filters.decade));
}

export function selectExhibits(exhibits, filters) {
  return exhibits.filter((exhibit) => matches(exhibit, filters)).sort((a, b) =>
    (filters.sort === 'newest' ? b.year - a.year : a.year - b.year) || a.name.localeCompare(b.name, 'zh-CN'));
}
