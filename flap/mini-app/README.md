# Tug of War Mini App (Flap Mini App v2)

Source for the Flap standalone Mini App at `/apps/tug-of-war`. It handles the actions Flap's Launcher page can't take because they need arguments: creating a game (config plus a salt that ends the token in `7777`) and pulling for a crew (`contribute(team)`). Flap's Launcher package links each game to `/apps/tug-of-war/game/<launcher>`.

The four files only build inside Flap's template, [flap-sh/flap-vault-component-template](https://github.com/flap-sh/flap-vault-component-template):

```sh
git clone https://github.com/flap-sh/flap-vault-component-template && cd flap-vault-component-template
yarn install --ignore-engines
mkdir -p src/vaults/tug-of-war && cp <this repo>/flap/mini-app/tug-of-war/* src/vaults/tug-of-war/
yarn app:check tug-of-war && yarn app:e2e tug-of-war
yarn app:package tug-of-war && yarn app:verify-package dist/tug-of-war.zip
```

- The slug `tug-of-war` and `artifactId` in `manifest.json` stay fixed once the app is published.
- The contract addresses in `manifest.json` and `Component.tsx` come from `contracts/deployments/97.json`. Update both if the factory is redeployed.
- `VaultABI.ts` holds hand-picked fragments of the launcher, factory and Portal ABIs. Regenerate it if a function they use changes.
