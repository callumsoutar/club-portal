import { companyWordmark } from '@/lib/company-settings'

type LogoProps = {
  companyName: string
  logoUrl?: string | null
}

export function Logo({ companyName, logoUrl }: LogoProps) {
  if (logoUrl) {
    return (
      <div className="logo">
        <img className="logo-image" src={logoUrl} alt={companyName} />
      </div>
    )
  }

  const mark = companyWordmark(companyName)

  return (
    <div className="logo">
      <div className="logo-mark" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div>
        <strong>{mark.primary}</strong>
        {mark.secondary ? <small>{mark.secondary}</small> : null}
      </div>
    </div>
  )
}
