# Macadam Extension

The Macadam extension is a POC to show how macadam tool can be used to init/start/stop any linux image (e.g fedora, rhel) in any OS

## Pre-requisites

- Build macadam binary from sources (https://github.com/crc-org/macadam), and install it in the extension's directory `~/.local/share/containers/podman-desktop/extensions-storage/redhat.macadam/bin/` (keep the name as `macadam-${osName}-${arch}`).
- Configure containers (`~/.config/containers/containers.conf`) to use default machine provider (not libkrun).
- Install latest versions of `vfkit` (main branch) and `gvproxy` (v0.8.4) in a directory, and export the environment variable `CONTAINERS_HELPER_BINARY_DIR` with the name of the directory containing these executables.


## Contributing

Want to help develop and contribute to the Macadam extension?

You can use pnpm watch --extension-folder from the Podman Desktop directory to automatically rebuild and test the Macadam extension:

Note: make sure you have the appropriate [pre-requisites](https://github.com/podman-desktop/podman-desktop/blob/main/CONTRIBUTING.md#prerequisites-prepare-your-environment) installed.

```
git clone https://github.com/containers/podman-desktop
git clone https://github.com/redhat-developer/podman-desktop-rhel-ext
cd podman-desktop-rhel-ext
pnpm install
pnpm build
cd ../podman-desktop
pnpm watch --extension-folder ../podman-desktop-rhel-ext
```
