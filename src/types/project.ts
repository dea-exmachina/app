export interface Project {
  id: string // folder name
  name: string // from brief title (# heading)
  domain: string // from frontmatter
  status: string // active, paused, complete
  created: string
  overview: string // first paragraph after ## Overview
  files: string[] // files in project dir
}

export interface ProjectDetail extends Project {
  content: string // full brief markdown content (after frontmatter)
}
