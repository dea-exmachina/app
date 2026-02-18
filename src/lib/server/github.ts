/**
 * GitHub API — fetch file content from the vault repo
 *
 * Uses GITHUB_TOKEN (fine-grained PAT with read access to dea-exmachina).
 * Returns decoded UTF-8 content or null on failure.
 */

const OWNER = process.env.GITHUB_OWNER ?? 'george-a-ata'
const REPO = process.env.GITHUB_REPO ?? 'dea-exmachina'

export async function fetchVaultFile(
  path: string,
  ref = 'dev'
): Promise<string | null> {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    console.warn('github: GITHUB_TOKEN not set — cannot fetch vault files')
    return null
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${ref}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.raw+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        next: { revalidate: 300 }, // cache 5 minutes
      }
    )

    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}
