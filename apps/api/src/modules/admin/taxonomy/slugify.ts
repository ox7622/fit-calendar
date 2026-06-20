const CYRILLIC_MAP: Record<string, string> = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'e',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'ts',
    ч: 'ch',
    ш: 'sh',
    щ: 'sch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
};

/**
 * Build a stable URL/key slug from a (possibly Cyrillic) label. Transliterates
 * Russian letters, lowercases, and collapses everything else to single dashes.
 * Returns '' for input that has no slug-able characters — callers fall back to
 * a generated key in that case.
 */
export function slugify(input: string): string {
    return input
        .toLowerCase()
        .split('')
        .map((ch) => (ch in CYRILLIC_MAP ? CYRILLIC_MAP[ch] : ch))
        .join('')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
