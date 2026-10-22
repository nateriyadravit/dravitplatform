import { useEffect, useEffectEvent, useState } from 'react'

export type DemoProject = {
  slug: string
  name: string
  category_slug: string
  category: string
  description: string
  live_url: string
  preview_image: string
  mobile_preview_image: string
  highlights: string[]
  is_live: number
}

export type DemoCategory = {
  slug: string
  name: string
  demo_count: number
  live_count: number
}

type CatalogOptions = { category?: string; search?: string; sort?: string }

export function useDemoCatalog({ category = 'all', search = '', sort = 'name' }: CatalogOptions = {}) {
  const [demos, setDemos] = useState<DemoProject[]>([])
  const [categories, setCategories] = useState<DemoCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadCatalog = useEffectEvent(async () => {
    setLoading(true)
    setError('')
    const query = new URLSearchParams({ sort })
    if (category !== 'all') query.set('category', category)
    if (search.trim()) query.set('search', search.trim())

    try {
      const [demoResponse, categoryResponse] = await Promise.all([
        fetch(`/api/demos?${query.toString()}`),
        fetch('/api/demo-categories'),
      ])
      if (!demoResponse.ok || !categoryResponse.ok) throw new Error('Project catalog is unavailable.')
      const [demoPayload, categoryPayload] = await Promise.all([
        demoResponse.json() as Promise<{ demos: DemoProject[] }>,
        categoryResponse.json() as Promise<{ categories: DemoCategory[] }>,
      ])
      setDemos(demoPayload.demos)
      setCategories(categoryPayload.categories)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Project catalog is unavailable.')
    } finally {
      setLoading(false)
    }
  })

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCatalog(), search ? 180 : 0)
    return () => window.clearTimeout(timer)
  }, [category, search, sort])

  return { demos, categories, loading, error }
}
