export type Site = {
  title: string
  description: string
  href: string
  author: string
  locale: string
  featuredPostCount: number
  postsPerPage: number
  featuredCraftCount: number
}

export type SocialLink = {
  href: string
  label: string
}

export type IconMap = {
  [key: string]: string
}

export type Tech = {
  name: string
  href?: string
  icon: string
  highlightColor?: string
}

export type TechArea = {
  area: string
  items: Tech[]
}
