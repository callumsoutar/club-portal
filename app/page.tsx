import { HomePage } from '@/components/home-page'
import { getAdminUser } from '@/lib/auth'
import { getSessionUser } from '@/lib/flight/auth'
import { getCompanySettings } from '@/lib/get-company-settings'
import { getPublishedSafetyMessages } from '@/lib/get-published-safety-messages'

export default async function Page() {
  const [messages, admin, session, company] = await Promise.all([
    getPublishedSafetyMessages(),
    getAdminUser(),
    getSessionUser(),
    getCompanySettings(),
  ])

  return <HomePage messages={messages} isAdmin={admin !== null} canFly={session !== null} company={company} />
}
