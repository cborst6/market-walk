const BASE_ID = 'appiVshE8JG5sBWZT'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const table = searchParams.get('table')
  const path = searchParams.get('path')

  if (!table && !path) {
    return Response.json({ error: 'Missing table or path' }, { status: 400 })
  }

  const pat = process.env.AIRTABLE_PAT
  if (!pat) {
    return Response.json({ error: 'AIRTABLE_PAT not configured' }, { status: 500 })
  }

  // Build query string from all params except 'table' and 'path'
  const params = new URLSearchParams()
  for (const [key, val] of searchParams.entries()) {
    if (key !== 'table' && key !== 'path') {
      params.append(key, val)
    }
  }

  const endpoint = path
    ? `https://api.airtable.com/v0/${BASE_ID}/${path}`
    : `https://api.airtable.com/v0/${BASE_ID}/${table}?${params.toString()}`

  try {
    const resp = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${pat}` },
      cache: 'no-store'
    })
    const data = await resp.json()
    return Response.json(data, { status: resp.status })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
