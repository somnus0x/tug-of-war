import type { Abi } from 'viem'

import { defineConfig } from '@wagmi/cli'
import { readFileSync } from 'node:fs'

const readAbi = (file: string): Abi => {
  const parsed: Abi = JSON.parse(
    readFileSync(new URL(`./src/contracts/abi/${file}`, import.meta.url), 'utf8'),
  )
  return parsed
}

export default defineConfig({
  out: 'src/contracts/generated.ts',
  contracts: [
    { name: 'TugLauncher', abi: readAbi('ITugLauncher.json') },
    { name: 'TugLauncherFactory', abi: readAbi('ITugLauncherFactory.json') },
    { name: 'TugVault', abi: readAbi('ITugVault.json') },
    { name: 'Portal', abi: readAbi('IPortal.json') },
  ],
})
