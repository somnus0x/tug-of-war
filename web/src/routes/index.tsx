import { createFileRoute } from '@tanstack/react-router'

import { HOME_COPY } from '@/copy/home'

const HomePage = () => <h1>{HOME_COPY.heading}</h1>

export const Route = createFileRoute('/')({
  component: HomePage,
})
