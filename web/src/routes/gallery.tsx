import { createFileRoute, lazyRouteComponent, notFound } from '@tanstack/react-router'

const devOnly = (): void => {
  if (!import.meta.env.DEV) {
    throw notFound()
  }
}

export const Route = createFileRoute('/gallery')({
  beforeLoad: devOnly,
  ...(import.meta.env.DEV
    ? { component: lazyRouteComponent(() => import('./-gallery/gallery-page'), 'GalleryPage') }
    : {}),
})
