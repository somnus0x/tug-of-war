import { defineConfig } from 'react-doctor/api'

export default defineConfig({
  ignore: {
    files: ['src/routeTree.gen.ts', 'src/contracts/generated.ts'],
    rules: [],
  },
})
