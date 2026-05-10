import { redirect } from 'next/navigation'

// Individual project routes redirect back to the projects list page
// (project details are rendered inline via ProjectDetail component)
export default async function ProjectIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/projects?detail=${id}`)
}
