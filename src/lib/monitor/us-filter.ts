/**
 * US location filter for discovered jobs.
 *
 * Keep when:
 *   • location is empty / unspecified
 *   • location mentions the US (any variation) — even if other countries are listed
 *   • location is ambiguous (city-only, remote with no country, etc.)
 *
 * Exclude only when location references a non-US country/region and does NOT
 * also mention the US (e.g. "Toronto, Canada" or "London, UK" alone).
 */

const NON_US_PATTERNS: RegExp[] = [
  /\bcanada\b/i,
  /\bontario\b/i,
  /\balberta\b/i,
  /\bquebec\b/i,
  /\bbritish columbia\b/i,
  /\bunited kingdom\b/i,
  /\buk\b/i,
  /\bengland\b/i,
  /\bscotland\b/i,
  /\bwales\b/i,
  /\bnorthern ireland\b/i,
  /\bireland\b/i,
  /\beu\b/i,
  /\beurope\b/i,
  /\bemea\b/i,
  /\bapac\b/i,
  /\basia[\s-]?pacific\b/i,
  /\blatin america\b/i,
  /\blatam\b/i,
  /\bgermany\b/i,
  /\bfrance\b/i,
  /\bspain\b/i,
  /\bitaly\b/i,
  /\bnetherlands\b/i,
  /\bholland\b/i,
  /\bbelgium\b/i,
  /\bswitzerland\b/i,
  /\baustria\b/i,
  /\bpoland\b/i,
  /\bindia\b/i,
  /\bchina\b/i,
  /\bjapan\b/i,
  /\bsouth korea\b/i,
  /\bkorea\b/i,
  /\btaiwan\b/i,
  /\bthailand\b/i,
  /\bvietnam\b/i,
  /\bindonesia\b/i,
  /\bmalaysia\b/i,
  /\bphilippines\b/i,
  /\bsingapore\b/i,
  /\baustralia\b/i,
  /\bnew zealand\b/i,
  /\bmexico\b/i,
  /\bbrazil\b/i,
  /\bargentina\b/i,
  /\bsweden\b/i,
  /\bnorway\b/i,
  /\bdenmark\b/i,
  /\bfinland\b/i,
  /\bportugal\b/i,
  /\bczech\b/i,
  /\bromania\b/i,
  /\bhungary\b/i,
  /\bisrael\b/i,
  /\buae\b/i,
  /\bunited arab emirates\b/i,
  /\bsouth africa\b/i,
  /\bpakistan\b/i,
  /\bbangladesh\b/i,
  /\bturkey\b/i,
  /\bgreece\b/i,
]

const US_PATTERNS: RegExp[] = [
  /\bunited states\b/i,
  /\bunited states of america\b/i,
  /\bu\.?\s*s\.?\s*a\.?\b/i,
  /\bu\.?\s*s\.?\b/i,
  /\busa\b/i,
]

const US_STATE_ABBREV =
  /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/

const US_STATE_NAMES =
  /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming|district of columbia)\b/i

const REMOTE_PATTERN = /\bremote\b/i

function hasUsLocationSignal(location: string): boolean {
  if (US_PATTERNS.some((p) => p.test(location))) return true
  if (US_STATE_ABBREV.test(location)) return true
  if (US_STATE_NAMES.test(location)) return true
  return false
}

export function isUsEligibleLocation(location: string | null | undefined): boolean {
  const loc = location?.trim()
  if (!loc) return true

  // US mentioned anywhere → keep, even alongside Canada/Europe/etc.
  if (hasUsLocationSignal(loc)) return true

  if (NON_US_PATTERNS.some((p) => p.test(loc))) return false

  if (REMOTE_PATTERN.test(loc)) return true

  // City-only or other ambiguous locations — allow.
  return true
}
