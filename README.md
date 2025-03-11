# Macadam Extension

The Macadam extension is a POC to show how macadam tool can be used to init/start/stop any linux image (e.g fedora, rhel) in any OS

## Contributing

Want to help develop and contribute to the Macadam extension?

You can use pnpm watch --extension-folder from the Podman Desktop directory to automatically rebuild and test the Macadam extension:

Note: make sure you have the appropriate [pre-requisits](https://github.com/podman-desktop/podman-desktop/blob/main/CONTRIBUTING.md#prerequisites-prepare-your-environment) installed.

```
git clone https://github.com/containers/podman-desktop
git clone https://github.com/containers/podman-desktop-extension-macadam
cd podman-desktop-extension-macadam
pnpm install
pnpm build
cd ../podman-desktop
pnpm watch --extension-folder ../podman-desktop-extension-macadam
```
