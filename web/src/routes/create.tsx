import { createFileRoute } from '@tanstack/react-router'

import { CREATE_COPY } from '@/copy/create'

const CreatePage = () => <h1>{CREATE_COPY.heading}</h1>

export const Route = createFileRoute('/create')({
  component: CreatePage,
})
