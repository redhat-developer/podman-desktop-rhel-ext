# RHEL VMs Extension

The RHEL VMs extension helps the user run RHEL Virtual machines.

## Pre-requisites

### On Windows/WSL/x86_64

The `macadam` binary is embedded in the extension, nothing needs to be installed.

### On Mac/arm64

When initialized, the extension checks if the necessary binaries are present in `/opt/macadam/bin`. If they are not, the extension installs them in this directory.

> If this installation fails, you can run the installer manually, using the installer found at https://github.com/crc-org/macadam/releases/tag/v0.1.1. After this, you need to restart the extension which should find and use the binaries.

### On Fedora Linux/x86_64

The `macadam` binary must be installed in the directory `/opt/macadam/bin/`: download the binary from https://github.com/crc-org/macadam/releases/tag/v0.1.1, rename it `macadam` and make it executable.

```
curl -L -o macadam https://github.com/crc-org/macadam/releases/download/v0.1.1/macadam-linux-amd64
chmod 755 macadam
sudo mkdir -p /opt/macadam/bin/
sudo mv macadam /opt/macadam/bin/
```

The `gvproxy` binary must be installed with the command `dnf install gvisor-tap-vsock`.


## Install the extension

OCI Images to install the extensions are available at https://github.com/redhat-developer/podman-desktop-rhel-ext/pkgs/container/podman-desktop-rhel-ext.

The latest development image is ghcr.io/redhat-developer/podman-desktop-rhel-ext:next

## Contributing

Want to help develop and contribute to the RHEL VMs extension?

You can use pnpm watch --extension-folder from the Podman Desktop directory to automatically rebuild and test the RHEL VMs extension:

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
