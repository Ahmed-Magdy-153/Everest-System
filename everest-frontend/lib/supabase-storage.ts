import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Lazy client — only created on the browser (never during SSR)
let _client: ReturnType<typeof createClient> | null = null

function getClient() {
  if (!_client) _client = createClient(supabaseUrl, supabaseKey)
  return _client
}

/**
 * Upload a contract file to the 'contracts' bucket.
 * Returns the public URL of the uploaded file.
 */
export async function uploadContractFile(
  file: File,
  projectId: number,
): Promise<{ url: string; path: string }> {
  const supabase = getClient()
  const ext  = file.name.split('.').pop() ?? 'pdf'
  const path = `${projectId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('Contranct')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) throw new Error(`Upload failed: ${error.message}`)

  const { data } = supabase.storage.from('contracts').getPublicUrl(path)

  return { url: data.publicUrl, path }
}
