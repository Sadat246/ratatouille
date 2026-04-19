import { format, isValid, parse } from "date-fns";

import { packageDateKindLabels, type PackageDateKind } from "./shared";

const packageDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parsePackageDateInput(value: string) {
  const match = packageDatePattern.exec(value);

  if (!match) {
    return null;
  }

  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);

  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(candidate.getTime()) ||
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return {
    year,
    month,
    day,
    value: `${yearValue}-${monthValue}-${dayValue}`,
  };
}

export function getPackageDateCutoff(value: string) {
  const parsed = parsePackageDateInput(value);

  if (!parsed) {
    return null;
  }

  return new Date(
    Date.UTC(parsed.year, parsed.month - 1, parsed.day, 23, 59, 59, 999),
  );
}

export function isAuctionEndBeforePackageDate(
  auctionEndsAtIso: string,
  packageDate: string,
) {
  const cutoff = getPackageDateCutoff(packageDate);
  const auctionEndsAt = new Date(auctionEndsAtIso);

  if (!cutoff || Number.isNaN(auctionEndsAt.getTime())) {
    return false;
  }

  return auctionEndsAt.getTime() < cutoff.getTime();
}

export function getPackageDateLabel(kind: keyof typeof packageDateKindLabels) {
  return packageDateKindLabels[kind];
}

const monthPattern =
  "(?:JAN(?:UARY)?|FEB(?:RUARY)?|MAR(?:CH)?|APR(?:IL)?|MAY|JUN(?:E)?|JUL(?:Y)?|AUG(?:UST)?|SEP(?:T(?:EMBER)?)?|OCT(?:OBER)?|NOV(?:EMBER)?|DEC(?:EMBER)?)";

const numericDatePatterns = [
  "yyyy-MM-dd",
  "yyyy-M-d",
  "yyyy-MM-d",
  "yyyy-M-dd",
  "yyyy/MM/dd",
  "yyyy.MM.dd",
  "M/d/yyyy",
  "M/d/yy",
  "MM/dd/yyyy",
  "MM/dd/yy",
  "M-d-yyyy",
  "M-d-yy",
  "M.d.yyyy",
  "M.d.yy",
  "d/M/yyyy",
  "d/M/yy",
  "dd/MM/yyyy",
  "dd/MM/yy",
  "d-M-yyyy",
  "dd-MM-yyyy",
  "d.M.yyyy",
  "dd.MM.yyyy",
];

const wordDatePatterns = [
  "MMM d yyyy",
  "MMM d, yyyy",
  "MMMM d yyyy",
  "MMMM d, yyyy",
  "d MMM yyyy",
  "d MMMM yyyy",
];

const labelMatchers: Array<{
  kind: PackageDateKind;
  regex: RegExp;
}> = [
  { kind: "best_if_used_by", regex: /BEST\s*(?:IF\s*)?USED?\s*BY/ },
  { kind: "best_by", regex: /BEST\s*BY/ },
  { kind: "use_by", regex: /USE\s*BY/ },
  { kind: "sell_by", regex: /SELL\s*BY/ },
  { kind: "fresh_by", regex: /FRESH\s*BY/ },
  { kind: "freeze_by", regex: /FREEZE\s*BY/ },
  { kind: "expires_on", regex: /EXP(?:I|1)R(?:E|F)S?\s*(?:ON)?/ },
];

function normalizeNumericCandidate(candidate: string) {
  return candidate
    .toUpperCase()
    .replace(/[OQ]/g, "0")
    .replace(/[IL]/g, "1");
}

/** Normalizes OCR quirks before scanning for date substrings. */
export function normalizeOcrTextForDateScan(text: string) {
  return text
    .replace(/\u2212|\u2013|\u2014/g, "-")
    .replace(/[·•]/g, " ")
    .replace(/\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildYmdIfValid(year: number, month: number, day: number): string | null {
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(candidate.getTime()) ||
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }
  const y = String(year).padStart(4, "0");
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * For slash/dot dates where month and day are both ≤12, prefers US (month/day) then EU (day/month).
 * If one interpretation is invalid or unreasonable, uses the other.
 */
export function parseAmbiguousSmallPartsDate(candidate: string): string | null {
  const trimmed = normalizeNumericCandidate(candidate.trim());
  const match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(trimmed);
  if (!match) {
    return null;
  }

  let month = Number(match[1]);
  let day = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) {
    year += year >= 70 ? 1900 : 2000;
  }

  const tryUs = (): string | null => {
    if (month < 1 || month > 12) return null;
    return buildYmdIfValid(year, month, day);
  };
  const tryEu = (): string | null => {
    const euMonth = Number(match[2]);
    const euDay = Number(match[1]);
    if (euMonth < 1 || euMonth > 12) return null;
    return buildYmdIfValid(year, euMonth, euDay);
  };

  if (month > 12 && day <= 12) {
    return tryEu();
  }
  if (day > 12 && month <= 12) {
    return tryUs();
  }
  if (month <= 12 && day <= 12) {
    const us = tryUs();
    const eu = tryEu();
    if (us && eu) {
      return us;
    }
    return us ?? eu;
  }

  return null;
}

function isReasonablePackageDate(candidate: Date) {
  const year = candidate.getUTCFullYear();
  const currentYear = new Date().getUTCFullYear();
  return year >= currentYear - 1 && year <= currentYear + 5;
}

export function detectPackageDateLabel(text: string) {
  const normalized = text.toUpperCase();

  for (const matcher of labelMatchers) {
    if (matcher.regex.test(normalized)) {
      return {
        packageDateKind: matcher.kind,
        packageDateLabel: packageDateKindLabels[matcher.kind],
      };
    }
  }

  return {
    packageDateKind: "other" as const,
    packageDateLabel: "",
  };
}

export function collectPackageDateCandidates(text: string) {
  const normalized = text.toUpperCase();
  const numericMatches = [
    ...normalized.matchAll(/\b\d{1,4}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b/g),
  ].map((match) => match[0]);
  /** ISO-like or numeric with flexible spacing (OCR) */
  const isoLike = [...normalized.matchAll(/\b(?:19|20)\d{2}\s*[-/.]\s*\d{1,2}\s*[-/.]\s*\d{1,2}\b/g)].map(
    (m) => m[0].replace(/\s+/g, ""),
  );
  /** Compact YYYYMMDD (common on labels) */
  const compact = [...normalized.matchAll(/\b(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\b/g)].map(
    (m) => m[0],
  );
  const wordMonthMatches = [
    ...normalized.matchAll(
      new RegExp(`\\b${monthPattern}\\.?,?\\s+\\d{1,2},?\\s+\\d{2,4}\\b`, "g"),
    ),
  ].map((match) => match[0]);
  const leadingDayMatches = [
    ...normalized.matchAll(
      new RegExp(`\\b\\d{1,2}\\s+${monthPattern}\\.?,?\\s+\\d{2,4}\\b`, "g"),
    ),
  ].map((match) => match[0]);
  /** Two-digit year with month name */
  const wordShortYear = [
    ...normalized.matchAll(
      new RegExp(`\\b${monthPattern}\\.?,?\\s+\\d{1,2},?\\s+\\d{2}\\b`, "g"),
    ),
  ].map((match) => match[0]);

  return [...new Set([...numericMatches, ...isoLike, ...compact, ...wordMonthMatches, ...leadingDayMatches, ...wordShortYear])];
}

export function parsePackageDateCandidate(candidate: string) {
  const normalizedCandidate = normalizeNumericCandidate(candidate);

  for (const pattern of numericDatePatterns) {
    const parsed = parse(normalizedCandidate, pattern, new Date(2000, 0, 1));

    if (isValid(parsed) && isReasonablePackageDate(parsed)) {
      return format(parsed, "yyyy-MM-dd");
    }
  }

  for (const pattern of wordDatePatterns) {
    const parsed = parse(normalizedCandidate, pattern, new Date(2000, 0, 1));

    if (isValid(parsed) && isReasonablePackageDate(parsed)) {
      return format(parsed, "yyyy-MM-dd");
    }
  }

  const ambiguous = parseAmbiguousSmallPartsDate(normalizedCandidate);
  if (ambiguous) {
    const parsed = parse(ambiguous, "yyyy-MM-dd", new Date(2000, 0, 1));
    if (isValid(parsed) && isReasonablePackageDate(parsed)) {
      return ambiguous;
    }
  }

  /** YYYYMMDD without separators */
  const compact = /^((?:19|20)\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/.exec(
    normalizedCandidate.replace(/\s/g, ""),
  );
  if (compact) {
    const ymd = `${compact[1]}-${compact[2]}-${compact[3]}`;
    const parsed = parse(ymd, "yyyy-MM-dd", new Date(2000, 0, 1));
    if (isValid(parsed) && isReasonablePackageDate(parsed)) {
      return ymd;
    }
  }

  return null;
}

/**
 * Last-resort scan of full OCR text: ISO substrings, compact dates, then token candidates.
 * Used when line-by-line candidates fail (noisy OCR, odd layouts).
 */
export function parseBestEffortPackageDateFromOcr(rawText: string): {
  packageDate: string;
  packageDateKind: PackageDateKind;
  packageDateLabel: string;
} | null {
  const scan = normalizeOcrTextForDateScan(rawText);
  if (!scan) {
    return null;
  }

  const detectedLabel = detectPackageDateLabel(scan);

  for (const candidate of collectPackageDateCandidates(scan)) {
    const packageDate = parsePackageDateCandidate(candidate);
    if (packageDate) {
      return {
        packageDate,
        packageDateKind: detectedLabel.packageDateKind,
        packageDateLabel: detectedLabel.packageDateLabel,
      };
    }
  }

  for (const m of scan.matchAll(/\b(?:19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/g)) {
    const ymd = m[0];
    const parsed = parsePackageDateInput(ymd);
    if (parsed) {
      return {
        packageDate: ymd,
        packageDateKind: detectedLabel.packageDateKind,
        packageDateLabel: detectedLabel.packageDateLabel,
      };
    }
  }

  for (const m of scan.matchAll(/\b(?:19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\b/g)) {
    const full = m[0];
    const fixed = `${full.slice(0, 4)}-${full.slice(4, 6)}-${full.slice(6, 8)}`;
    const parsed = parsePackageDateInput(fixed);
    if (parsed) {
      return {
        packageDate: fixed,
        packageDateKind: detectedLabel.packageDateKind,
        packageDateLabel: detectedLabel.packageDateLabel,
      };
    }
  }

  return null;
}
