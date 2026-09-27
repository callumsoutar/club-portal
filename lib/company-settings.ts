export const defaultCompanyName = 'Kapiti Aero Club'

export const brandingBucket = 'branding'

export const companyLogoMaxBytes = 2 * 1024 * 1024

const logoExtensions = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])

export const companyLogoPathPattern =
  /^logos\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/

export type CompanySettings = {
  companyName: string
  logoUrl: string | null
}

export function companyLogoExtension(file: File) {
  return logoExtensions.get(file.type) ?? null
}

export function isCompanyLogoPath(path: string) {
  return companyLogoPathPattern.test(path)
}

export function companyInitials(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')

  return letters || 'KA'
}

export function companyWordmark(name: string) {
  const trimmed = name.trim().replace(/\s+/g, ' ')
  const aeroClub = trimmed.match(/^(.*?)\s+aero\s+club$/i)
  if (aeroClub?.[1]) {
    return { primary: aeroClub[1].toUpperCase(), secondary: 'AERO CLUB' }
  }

  const words = trimmed.split(' ')
  if (words.length < 2) return { primary: trimmed.toUpperCase(), secondary: '' }
  return {
    primary: words[0].toUpperCase(),
    secondary: words.slice(1).join(' ').toUpperCase(),
  }
}
