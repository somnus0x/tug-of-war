#!/bin/sh
set -eu

cd "$(dirname "$0")/.."
mkdir -p abi
staging=$(mktemp -d abi/.export-abi.XXXXXX)
trap 'rm -f "$staging/"*.json; rmdir "$staging"' EXIT
trap 'exit 1' HUP INT TERM

for interface in ITugLauncher ITugLauncherFactory ITugVault; do
    forge inspect "src/interfaces/$interface.sol:$interface" abi --json > "$staging/$interface.json"
done
forge inspect "src/flap/IPortal.sol:IPortal" abi --json > "$staging/IPortal.json"

for artifact in "$staging/"*.json; do
    mv "$artifact" abi/
done
