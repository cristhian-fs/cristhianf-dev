import type { CollectionEntry } from 'astro:content'
import { getCollection, render } from 'astro:content'
import { calculateWordCountFromHtml, readingTime } from './utils'

// Cache para evitar múltiplas chamadas
const cache = new Map<string, any>()

// Função genérica para cache
async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  if (!cache.has(key)) {
    cache.set(key, await fetcher())
  }
  return cache.get(key)
}

// Filtros e ordenações reutilizáveis
const filters = {
  notDraft: (item: any) => !item.data.draft,
  notSubpost: (item: any) => !isSubpost(item.id),
  published: (item: any) => !item.data.draft && !isSubpost(item.id),
}

const sorters = {
  byDate: (a: any, b: any) => b.data.date.valueOf() - a.data.date.valueOf(),
  byStartDate: (a: any, b: any) =>
    b.data.startDate.getTime() - a.data.startDate.getTime(),
  bySubpostOrder: (a: any, b: any) => {
    const dateDiff = a.data.date.valueOf() - b.data.date.valueOf()
    if (dateDiff !== 0) return dateDiff
    return (a.data.order ?? 0) - (b.data.order ?? 0)
  },
}

// Funções base otimizadas
export const getAllAuthors = () =>
  getCached('authors', () => getCollection('authors'))

export const getAllPosts = () =>
  getCached('posts', async () => {
    const posts = await getCollection('writing')
    return posts.filter(filters.published).sort(sorters.byDate)
  })

export const getAllCrafts = () =>
  getCached('crafts', async () => {
    const crafts = await getCollection('craft')
    return crafts.filter(filters.published).sort(sorters.byDate)
  })

export const getAllPostsAndSubposts = () =>
  getCached('postsAndSubposts', async () => {
    const posts = await getCollection('writing')
    return posts.filter(filters.notDraft).sort(sorters.byDate)
  })

export const getAllProjects = () =>
  getCached('projects', async () => {
    const projects = await getCollection('projects')
    return projects.sort(sorters.byStartDate)
  })

// Função genérica para adjacências
async function getAdjacent<
  T extends CollectionEntry<'authors' | 'craft' | 'projects' | 'writing'>,
>(
  items: T[],
  currentId: string,
): Promise<{ newer: T | null; older: T | null }> {
  const index = items.findIndex((item) => item.id === currentId)
  return index === -1
    ? { newer: null, older: null }
    : {
        newer: index > 0 ? items[index - 1] : null,
        older: index < items.length - 1 ? items[index + 1] : null,
      }
}

// Posts adjacentes com lógica de subposts
export async function getAdjacentPosts(currentId: string) {
  if (isSubpost(currentId)) {
    const parentId = getParentId(currentId)
    const parent =
      (await getAllPosts()).find((post) => post.id === parentId) || null

    const subposts = await getSubpostsForParent(parentId)
    const { newer, older } = await getAdjacent(subposts, currentId)
    return { newer, older, parent }
  }

  const parentPosts = (await getAllPosts()).filter(filters.notSubpost)
  const { newer, older } = await getAdjacent(parentPosts, currentId)
  return { newer, older, parent: null }
}

// Adjacências simplificadas
export const getAdjacentCrafts = async (currentId: string) =>
  getAdjacent(await getAllCrafts(), currentId)

export const getAdjacentProjects = async (currentId: string) =>
  getAdjacent(await getAllProjects(), currentId)

// Tags otimizado
export async function getAllTags(): Promise<Map<string, number>> {
  const [posts, projects] = await Promise.all([getAllPosts(), getAllProjects()])

  return [...posts, ...projects].reduce((acc, item) => {
    item.data.tags?.forEach((tag) => acc.set(tag, (acc.get(tag) || 0) + 1))
    return acc
  }, new Map<string, number>())
}

export async function getSortedTags() {
  const tagCounts = await getAllTags()
  return [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

// Filtros por tag/autor otimizados
const createFilterBy =
  (field: 'tags' | 'authors') => (value: string) => async (items: any[]) =>
    items.filter((item) => item.data[field]?.includes(value))

export const getPostsByTag = async (tag: string) =>
  createFilterBy('tags')(tag)(await getAllPosts())

export const getPostsByAuthor = async (authorId: string) =>
  createFilterBy('authors')(authorId)(await getAllPosts())

export const getProjectsByTag = async (tag: string) =>
  createFilterBy('tags')(tag)(await getAllProjects())

// Funções de slice otimizadas
const createGetRecent = (getter: () => Promise<any[]>) => (count: number) =>
  getter().then((items) => items.slice(0, count))

export const getRecentPosts = createGetRecent(getAllPosts)
export const getRecentProjects = createGetRecent(getAllProjects)
export const getRecentCrafts = createGetRecent(getAllCrafts)

// Utilitários de subposts
export const isSubpost = (postId: string): boolean => postId.includes('/')
export const getParentId = (subpostId: string): string =>
  subpostId.split('/')[0]

export async function getSubpostsForParent(parentId: string) {
  const posts = await getCollection('writing')
  return posts
    .filter(
      (post) =>
        filters.notDraft(post) &&
        isSubpost(post.id) &&
        getParentId(post.id) === parentId,
    )
    .sort(sorters.bySubpostOrder)
}

export const hasSubposts = async (postId: string): Promise<boolean> =>
  (await getSubpostsForParent(postId)).length > 0

export const getSubpostCount = async (parentId: string): Promise<number> =>
  (await getSubpostsForParent(parentId)).length

// Busca por ID otimizada
const createGetById =
  <T>(getter: () => Promise<T[]>) =>
  async (id: string): Promise<T | null> =>
    (await getter()).find((item: any) => item.id === id) || null

export const getPostById = createGetById(getAllPostsAndSubposts)
export const getCraftById = createGetById(getAllCrafts)
export const getProjectById = createGetById(getAllProjects)

export const getParentPost = async (subpostId: string) =>
  isSubpost(subpostId) ? getPostById(getParentId(subpostId)) : null

// Agrupamento por ano otimizado
const createGroupByYear =
  (dateField: 'date' | 'startDate') =>
  <T extends Record<string, any>>(items: T[]): Record<string, T[]> =>
    items.reduce(
      (acc, item) => {
        const year = item.data[dateField]!.getFullYear().toString()
        return { ...acc, [year]: [...(acc[year] || []), item] }
      },
      {} as Record<string, T[]>,
    )

export const groupPostsByYear = createGroupByYear('date')
export const groupProjectsByYear = createGroupByYear('startDate')
export const groupCraftByYear = createGroupByYear('date')

// Authors parsing otimizado
export async function parseAuthors(authorIds: string[] = []) {
  if (!authorIds.length) return []

  const authors = await getAllAuthors()
  const authorMap = new Map(authors.map((author) => [author.id, author]))

  return authorIds.map((id) => ({
    id,
    name: authorMap.get(id)?.data?.name || id,
    avatar: authorMap.get(id)?.data?.avatar || '/static/logo.png',
    isRegistered: authorMap.has(id),
  }))
}

// Reading time otimizado
const createReadingTime =
  (getter: (id: string) => Promise<any>) =>
  async (id: string): Promise<string> => {
    const item = await getter(id)
    if (!item) return readingTime(0)
    return readingTime(calculateWordCountFromHtml(item.body))
  }

export const getPostReadingTime = createReadingTime(getPostById)
export const getCraftReadingTime = createReadingTime(getCraftById)

export async function getCombinedReadingTime(postId: string): Promise<string> {
  const post = await getPostById(postId)
  if (!post) return readingTime(0)

  let totalWords = calculateWordCountFromHtml(post.body)

  if (!isSubpost(postId)) {
    const subposts = await getSubpostsForParent(postId)
    totalWords += subposts.reduce(
      (sum, subpost) => sum + calculateWordCountFromHtml(subpost.body),
      0,
    )
  }

  return readingTime(totalWords)
}

// TOC types
export type TOCHeading = {
  slug: string
  text: string
  depth: number
  isSubpostTitle?: boolean
}

export type TOCSection = {
  type: 'parent' | 'subpost'
  title: string
  headings: TOCHeading[]
  subpostId?: string
}

// TOC otimizado
export async function getTOCSections(postId: string): Promise<TOCSection[]> {
  const post = await getPostById(postId)
  if (!post) return []

  const parentId = isSubpost(postId) ? getParentId(postId) : postId
  const parentPost = isSubpost(postId) ? await getPostById(parentId) : post
  if (!parentPost) return []

  const sections: TOCSection[] = []
  const { headings: parentHeadings } = await render(parentPost)

  if (parentHeadings.length > 0) {
    sections.push({
      type: 'parent',
      title: 'Overview',
      headings: parentHeadings.map(({ slug, text, depth }) => ({
        slug,
        text,
        depth,
      })),
    })
  }

  const subposts = await getSubpostsForParent(parentId)
  for (const subpost of subposts) {
    const { headings } = await render(subpost)
    if (headings.length > 0) {
      sections.push({
        type: 'subpost',
        title: subpost.data.title,
        headings: headings.map(({ slug, text, depth }, index) => ({
          slug,
          text,
          depth,
          isSubpostTitle: index === 0,
        })),
        subpostId: subpost.id,
      })
    }
  }

  return sections
}

export async function getProjectTOCSections(projectId: string) {
  const project = await getProjectById(projectId)
  if (!project) return []

  const { headings } = await render(project)
  return headings.map(({ slug, text, depth }) => ({ slug, text, depth }))
}

