import { HomePage } from '@/components/home-page'
import { getAdminUser } from '@/lib/auth'
import { getCompanySettings } from '@/lib/get-company-settings'
import { getPublishedSafetyMessages } from '@/lib/get-published-safety-messages'

export default async function Page() {
  const [messages, admin, company] = await Promise.all([
    getPublishedSafetyMessages(),
    getAdminUser(),
    getCompanySettings(),
  ])

  return <HomePage messages={messages} isAdmin={admin !== null} company={company} />
}
