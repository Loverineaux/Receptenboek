/**
 * SSRF-bescherming voor het ophalen van door gebruikers opgegeven URLs.
 *
 * Blokkeert requests naar niet-publieke bestemmingen (loopback, private
 * ranges, link-local incl. cloud-metadata 169.254.169.254, enz.) en staat
 * alleen http(s) toe. DNS wordt hier zelf geresolved zodat een publieke
 * hostname die naar een intern IP wijst (DNS-rebinding) óók geblokkeerd
 * wordt.
 *
 * Gebruik: `await assertPublicUrl(url)` vóór elke fetch/navigatie naar een
 * externe, door de gebruiker aangeleverde URL. Gooit een Error bij een
 * geblokkeerde bestemming.
 */

import { lookup } from 'node:dns/promises'
import net from 'node:net'

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  let n = 0
  for (const p of parts) {
    const b = Number(p)
    if (!Number.isInteger(b) || b < 0 || b > 255) return null
    n = n * 256 + b
  }
  return n >>> 0
}

function inRange(ipInt: number, cidrBase: string, bits: number): boolean {
  const baseInt = ipv4ToInt(cidrBase)
  if (baseInt === null) return false
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
  return (ipInt & mask) === (baseInt & mask)
}

/** True voor loopback / private / link-local / reserved IPv4-adressen. */
function isPrivateIPv4(ip: string): boolean {
  const n = ipv4ToInt(ip)
  if (n === null) return true // niet-parseerbaar → weiger uit voorzorg
  return (
    inRange(n, '0.0.0.0', 8) ||
    inRange(n, '10.0.0.0', 8) ||
    inRange(n, '100.64.0.0', 10) || // CGNAT
    inRange(n, '127.0.0.0', 8) || // loopback
    inRange(n, '169.254.0.0', 16) || // link-local (incl. 169.254.169.254 metadata)
    inRange(n, '172.16.0.0', 12) ||
    inRange(n, '192.0.0.0', 24) ||
    inRange(n, '192.168.0.0', 16) ||
    inRange(n, '198.18.0.0', 15) || // benchmarking
    inRange(n, '224.0.0.0', 4) || // multicast
    inRange(n, '240.0.0.0', 4) // reserved / broadcast
  )
}

/** True voor loopback / unique-local / link-local IPv6-adressen. */
function isPrivateIPv6(ip: string): boolean {
  const addr = ip.toLowerCase().split('%')[0] // zone-id strippen
  // IPv4-mapped (::ffff:127.0.0.1) → controleer het ingebedde v4-adres
  const mapped = addr.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isPrivateIPv4(mapped[1])
  if (addr === '::1' || addr === '::') return true
  if (addr.startsWith('fe8') || addr.startsWith('fe9') || addr.startsWith('fea') || addr.startsWith('feb')) return true // fe80::/10 link-local
  if (addr.startsWith('fc') || addr.startsWith('fd')) return true // fc00::/7 unique-local
  return false
}

function isBlockedIp(ip: string): boolean {
  const type = net.isIP(ip)
  if (type === 4) return isPrivateIPv4(ip)
  if (type === 6) return isPrivateIPv6(ip)
  return true // geen geldig IP → weiger
}

/**
 * Valideer een door de gebruiker opgegeven URL vóór hij server-side wordt
 * opgehaald. Gooit een Error bij een niet-http(s) scheme of een bestemming
 * die (na DNS-resolutie) naar een niet-publiek IP wijst.
 */
export async function assertPublicUrl(rawUrl: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error('Ongeldige URL')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Alleen http(s)-URLs zijn toegestaan')
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '') // IPv6-brackets strippen

  // Als de host al een letterlijk IP is: direct controleren.
  if (net.isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new Error('Toegang tot dit adres is niet toegestaan')
    }
    return url
  }

  // Anders: DNS resolven en álle resultaten controleren (voorkomt dat een
  // publieke hostname naar een intern IP wijst).
  let addresses: { address: string }[]
  try {
    addresses = await lookup(hostname, { all: true })
  } catch {
    throw new Error('Host kon niet worden opgezocht')
  }

  if (addresses.length === 0) {
    throw new Error('Host kon niet worden opgezocht')
  }

  for (const { address } of addresses) {
    if (isBlockedIp(address)) {
      throw new Error('Toegang tot dit adres is niet toegestaan')
    }
  }

  return url
}

/** Niet-gooiende variant — geeft `true` als de URL veilig publiek is. */
export async function isPublicUrl(rawUrl: string): Promise<boolean> {
  try {
    await assertPublicUrl(rawUrl)
    return true
  } catch {
    return false
  }
}
