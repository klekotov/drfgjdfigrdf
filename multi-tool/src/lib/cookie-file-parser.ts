const COOKIE_MARKER = '_|WARNING:-DO-NOT-SHARE-THIS.';
const COOKIE_MARKER_PATTERN = /_\|WARNING:-DO-NOT-SHARE-THIS\./g;
const COOKIE_TAIL_CHARACTER = /^[A-Za-z0-9%._~+/=-]$/;
const COOKIE_SUFFIX_PATTERN = /\|_[A-Za-z0-9%._~+/=-]{16,}$/;
const COOKIE_HARD_DELIMITERS = ['"', "'", '`', ',', ';', '<', '>'] as const;

export type ExtractedRobloxCookies = {
  cookies: string[];
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
};

function isValidRobloxCookie(value: string) {
  return value.startsWith(COOKIE_MARKER) && COOKIE_SUFFIX_PATTERN.test(value);
}

export function extractRobloxCookies(contents: string): ExtractedRobloxCookies {
  const markers = Array.from(contents.matchAll(COOKIE_MARKER_PATTERN));
  const extracted: string[] = [];
  let invalid = 0;

  markers.forEach((marker, index) => {
    const start = marker.index;
    if (start === undefined) {
      invalid += 1;
      return;
    }

    let endLimit = markers[index + 1]?.index ?? contents.length;
    for (const delimiter of COOKIE_HARD_DELIMITERS) {
      const delimiterIndex = contents.indexOf(delimiter, start + COOKIE_MARKER.length);
      if (delimiterIndex >= 0 && delimiterIndex < endLimit) endLimit = delimiterIndex;
    }

    const separatorIndex = contents.indexOf('|_', start + COOKIE_MARKER.length);
    if (separatorIndex < 0 || separatorIndex + 2 >= endLimit) {
      invalid += 1;
      return;
    }

    let end = separatorIndex + 2;
    while (end < endLimit && COOKIE_TAIL_CHARACTER.test(contents[end])) end += 1;

    const candidate = contents.slice(start, end);
    if (isValidRobloxCookie(candidate)) extracted.push(candidate);
    else invalid += 1;
  });

  const cookies = Array.from(new Set(extracted));
  return {
    cookies,
    total: markers.length,
    valid: cookies.length,
    invalid,
    duplicates: extracted.length - cookies.length,
  };
}
