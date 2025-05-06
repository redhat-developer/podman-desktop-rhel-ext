/**********************************************************************
 * Copyright (C) 2025 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ***********************************************************************/

import type { NavigationBar } from '@podman-desktop/tests-playwright';
import {
  expect as playExpect,
  RunnerOptions,
  test,
  waitForPodmanMachineStartup,
} from '@podman-desktop/tests-playwright';

const extensionName = 'macadam';
const extensionLabel = 'redhat.macadam';
const extensionHeading = 'Macadam';
let extensionInstalled = false;
const skipInstallation = process.env.SKIP_INSTALLATION;
const extensionURL = process.env.OCI_IMAGE ?? 'ghcr.io/redhat-developer/podman-desktop-rhel-ext:next';

test.use({
  runnerOptions: new RunnerOptions({
    customFolder: 'rhel-e2e-tests',
    customOutputFolder: 'tests/output',
    autoUpdate: false,
    autoCheckUpdates: false,
  }),
});

test.beforeAll(async ({ runner, welcomePage, page }) => {
  runner.setVideoAndTraceName('rhel-extension-e2e');
  await welcomePage.handleWelcomePage(true);
  await waitForPodmanMachineStartup(page);
});

test.afterAll(async ({ runner }) => {
  await runner.close();
});

test.describe.serial('RHEL Extension E2E Tests', () => {
  test('Go to settings and check if extension is already installed', async ({ navigationBar }) => {
    const extensionsPage = await navigationBar.openExtensions();
    if (await extensionsPage.extensionIsInstalled(extensionLabel)) extensionInstalled = true;
  });

  test('Uninstalled previous version of bootc extension', async ({ navigationBar }) => {
    test.skip(!extensionInstalled || !!skipInstallation);
    test.setTimeout(120_000);
    console.log('Extension found already installed, trying to remove!');
    await ensureRhelExtensionIsRemoved(navigationBar);
  });

  test('Install extension through Extension page', async ({ navigationBar }) => {
    test.skip(!!skipInstallation);
    test.setTimeout(200_000);

    const extensionsPage = await navigationBar.openExtensions();
    await extensionsPage.installExtensionFromOCIImage(extensionURL);

    await playExpect
      .poll(async () => await extensionsPage.extensionIsInstalled(extensionLabel), { timeout: 30_000 })
      .toBeTruthy();
  });

  test('Remove RHEL extension through Settings', async ({ navigationBar }) => {
    await ensureRhelExtensionIsRemoved(navigationBar);
  });
});

async function ensureRhelExtensionIsRemoved(navigationBar: NavigationBar): Promise<void> {
  let extensionsPage = await navigationBar.openExtensions();
  if (!(await extensionsPage.extensionIsInstalled(extensionLabel))) return;

  const rhelExtensionDetailsPage = await extensionsPage.openExtensionDetails(
    extensionName,
    extensionLabel,
    extensionHeading,
  );
  await playExpect(rhelExtensionDetailsPage.heading).toBeVisible({ timeout: 10_000 });
  await rhelExtensionDetailsPage.removeExtension();
  extensionsPage = await navigationBar.openExtensions();
  await playExpect(extensionsPage.heading).toBeVisible({ timeout: 10_000 });

  await playExpect
    .poll(async () => await extensionsPage.extensionIsInstalled(extensionLabel), { timeout: 30_000 })
    .toBeFalsy();
}
