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

import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Browser, Locator, Page } from '@playwright/test';
import {
  ConfirmInputValue,
  NavigationBar,
  ResourceConnectionCardPage,
  ResourceElementActions,
  ResourceElementState,
  ResourcesPage,
  waitUntil,
} from '@podman-desktop/tests-playwright';
import {
  AuthenticationPage,
  expect as playExpect,
  findPageWithTitleInBrowser,
  getEntryFromLogs,
  performBrowserLogin,
  RunnerOptions,
  startChromium,
  test,
  waitForPodmanMachineStartup,
} from '@podman-desktop/tests-playwright';

const extensionName = 'rhel-vms';
const extensionLabel = 'redhat.rhel-vms';
const extensionHeading = 'RHEL VMs';
let extensionInstalled = false;
const skipInstallation = process.env.SKIP_INSTALLATION;
const extensionURL = process.env.OCI_IMAGE ?? 'ghcr.io/redhat-developer/podman-desktop-rhel-ext:next';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const browserOutputPath = [__dirname, '..', 'output', 'browser'];

const expectedAuthPageTitle = 'Log In';
const regex = new RegExp(/((http|https):\/\/.*$)/);
let signInButton: Locator;
let browser: Browser;
let chromiumPage: Page;
const chromePort = '9222';

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
  test.describe.serial('Authentication Extension', () => {
    test('Go to settings and check if extension is already installed', async ({ navigationBar }) => {
      const extensionsPage = await navigationBar.openExtensions();
      if (await extensionsPage.extensionIsInstalled(extensionLabel)) extensionInstalled = true;
    });

    test('Uninstalled previous version of rhel extension', async ({ navigationBar }) => {
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
  });

  test.describe.serial('Red Hat Authentication extension installation', () => {
    test('SSO provider is available in Authentication Page', async ({ page, navigationBar }) => {
      const settingsBar = await navigationBar.openSettings();
      await settingsBar.openTabPage(AuthenticationPage);

      const authPage = new AuthenticationPage(page);
      await playExpect(authPage.heading).toBeVisible({ timeout: 10_000 });

      signInButton = page.getByRole('button', { name: 'Sign in' });
      await playExpect(signInButton).toBeVisible();
    });

    test('Can open authentication page in browser', async ({ navigationBar, page }) => {
      test.setTimeout(120_000);
      const settingsBar = await navigationBar.openSettings();
      await settingsBar.openTabPage(AuthenticationPage);
      const authPage = new AuthenticationPage(page);
      await playExpect(authPage.heading).toBeVisible({ timeout: 10_000 });

      // start up chrome instance and return browser object
      browser = await startChromium(chromePort, path.join(...browserOutputPath));

      // open the link from PD
      await page.bringToFront();

      await playExpect(signInButton).toBeEnabled({ timeout: 10_000 });
      await signInButton.click();

      await page.waitForTimeout(5_000);

      const urlMatch = await getEntryFromLogs(page, /\.*openid-connect.*/, regex, 'sso.redhat.com');
      if (urlMatch) {
        const context = await browser.newContext();
        const newPage = await context.newPage();
        await newPage.goto(urlMatch);
        await newPage.waitForURL(/sso.redhat.com/);
        chromiumPage = newPage;
        const page = await findPageWithTitleInBrowser(browser, expectedAuthPageTitle);
        console.log(`Found page with title: ${await page?.title()}`);
      } else {
        throw new Error('Did not find Initial SSO Login Page');
      }
    });

    test('User can authenticate via browser', async () => {
      // Activate the browser window and perform login
      playExpect(chromiumPage).toBeDefined();
      if (!chromiumPage) {
        throw new Error('Chromium browser page was not initialized');
      }
      await chromiumPage.bringToFront();
      console.log(`Switched to Chrome tab with title: ${await chromiumPage.title()}`);
      const usernameAction: ConfirmInputValue = {
        inputLocator: chromiumPage.getByRole('textbox', { name: 'Red Hat login or email' }),
        inputValue: process.env.DVLPR_USERNAME ?? 'unknown',
        confirmLocator: chromiumPage.getByRole('button', { name: 'Next' }),
      };
      const passwordAction: ConfirmInputValue = {
        inputLocator: chromiumPage.getByRole('textbox', { name: 'Password' }),
        inputValue: process.env.DVLPR_PASSWORD ?? 'unknown',
        confirmLocator: chromiumPage.getByRole('button', { name: 'Log in' }),
      };
      await performBrowserLogin(chromiumPage, /Log In/, usernameAction, passwordAction, async chromiumPage => {
        const backButton = chromiumPage.getByRole('button', { name: 'Go back to Podman Desktop' });
        await playExpect(backButton).toBeEnabled();
        await backButton.click();
      });
      await chromiumPage.close();
    });
  });

  test.describe.serial('RHEL VMs Extension', () => {
    test('Create RHEL VM', async ({ page }) => {
      await createRhelVM(page);

      const resourcesPage = new ResourcesPage(page);
      await playExpect(resourcesPage.heading).toBeVisible({ timeout: 10_000 });

      const machineCard = new ResourceConnectionCardPage(page, 'macadam', 'rhel');
      await playExpect.poll(async () => machineCard.doesResourceElementExist(), { timeout: 30_000 }).toBeTruthy();
      playExpect(await machineCard.resourceElementConnectionStatus.innerText()).toContain(ResourceElementState.Off);
    });

    test('Start RHEL VM', async ({ page }) => {
      test.setTimeout(70_000);
      const machineCard = new ResourceConnectionCardPage(page, 'macadam', 'rhel');
      await machineCard.performConnectionAction(ResourceElementActions.Start);

      await waitUntil(
        async () =>
          (await machineCard.resourceElementConnectionStatus.innerText()).includes(ResourceElementState.Running),
        { timeout: 60_000, sendError: true },
      );
    });

    test('Stop RHEL VM', async ({ page }) => {
      test.setTimeout(70_000);
      const machineCard = new ResourceConnectionCardPage(page, 'macadam', 'rhel');
      await machineCard.performConnectionAction(ResourceElementActions.Stop);

      await waitUntil(
        async () => (await machineCard.resourceElementConnectionStatus.innerText()).includes(ResourceElementState.Off),
        { timeout: 30_000, sendError: true },
      );
    });

    test('Remove RHEL VM', async ({ page }) => {
      test.setTimeout(70_000);
      const machineCard = new ResourceConnectionCardPage(page, 'macadam', 'rhel');
      await machineCard.performConnectionAction(ResourceElementActions.Delete);

      await playExpect.poll(async () => machineCard.doesResourceElementExist(), { timeout: 30_000 }).toBeFalsy();
    });
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

async function createRhelVM(page: Page, timeout = 120_000): Promise<void> {
  const navigationBar = new NavigationBar(page);
  const rhelResourceCard = new ResourceConnectionCardPage(page, 'macadam');

  const settingsPage = await navigationBar.openSettings();
  const resourcesPage = await settingsPage.openTabPage(ResourcesPage);
  await playExpect(resourcesPage.heading).toBeVisible({ timeout: 10_000 });
  await playExpect.poll(async () => resourcesPage.resourceCardIsVisible('macadam')).toBeTruthy();
  await playExpect(rhelResourceCard.createButton).toBeVisible();

  await rhelResourceCard.createButton.click();

  const rhelVMNameInput = page.getByLabel('Machine Name', { exact: true });
  await playExpect(rhelVMNameInput).toBeVisible({ timeout: 10_000 });
  await playExpect(rhelVMNameInput).toHaveValue('rhel');

  const createRhelVMButton = page.getByRole('button', { name: 'Create', exact: true });
  await playExpect(createRhelVMButton).toBeEnabled({ timeout: 10_000 });
  await createRhelVMButton.click();

  const goBackButton = page.getByRole('button', { name: 'Go back to resources' });
  await playExpect(goBackButton).toBeEnabled({ timeout: timeout });
  await goBackButton.click();
}
