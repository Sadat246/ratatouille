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
  "M/d/yyyy",
  "M/d/yy",
  "M-d-yyyy",
  "M-d-yy",
  "M.d.yyyy",
  "M.d.yy",
  "yyyy-MM-dd",
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

  return [...new Set([...numericMatches, ...wordMonthMatches, ...leadingDayMatches])];
}

export function parsePackageDateCandidate(candidate: string) {
  const normalizedCandidate = normalizeNumericCandidate(candidate);

  for (const pattern of numericDatePatterns) {
    const parsed = parse(normalizedCandidate, pattern, new Date());

    if (isValid(parsed) && isReasonablePackageDate(parsed)) {
      return format(parsed, "yyyy-MM-dd");
    }
  }

  for (const pattern of wordDatePatterns) {
    const parsed = parse(normalizedCandidate, pattern, new Date());

    if (isValid(parsed) && isReasonablePackageDate(parsed)) {
      return format(parsed, "yyyy-MM-dd");
    }
  }

  return null;
}
