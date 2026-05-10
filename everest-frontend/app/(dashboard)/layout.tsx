import NoSSRShell from './NoSSRShell'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <NoSSRShell>{children}</NoSSRShell>
}
