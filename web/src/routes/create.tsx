import { createFileRoute } from '@tanstack/react-router'

import { CreatePage } from '@/features/create/components/create-page'

export const Route = createFileRoute('/create')({
  component: CreatePage,
})
