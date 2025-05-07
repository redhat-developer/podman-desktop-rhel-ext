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

import * as fs from 'node:fs';
import { resolve } from 'node:path';

import * as macadamJSPackage from '@crc-org/macadam.js';
import * as extensionApi from '@podman-desktop/api';
import { assert, beforeEach, describe, expect, test, vi } from 'vitest';

import * as authentication from './authentication';
import { activate } from './extension';
import type { SubscriptionManagerClientV1 } from './rh-api/rh-api-sm';
import * as utils from './utils';
import * as winutils from './win/utils';

vi.mock('./authentication');
vi.mock('./utils');
vi.mock('node:fs/promises');
vi.mock('node:fs');
vi.mock('./win/utils');
vi.mock('@crc-org/macadam.js', async () => {
  const Macadam = vi.fn();
  Macadam.prototype.init = vi.fn();
  Macadam.prototype.createVm = vi.fn();
  Macadam.prototype.listVms = vi.fn();
  return { Macadam };
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe('activate', () => {
  const extensionContext: extensionApi.ExtensionContext = {
    subscriptions: {
      push: vi.fn(),
    },
    storagePath: resolve('/', 'path', 'to', 'storage'),
  } as unknown as extensionApi.ExtensionContext;

  const provider: extensionApi.Provider = {
    setVmProviderConnectionFactory: vi.fn(),
  } as unknown as extensionApi.Provider;

  beforeEach(async () => {
    vi.mocked(extensionApi.provider.createProvider).mockReturnValue(provider);
  });

  test('macadam library is initialized', async () => {
    await activate(extensionContext);
    expect(macadamJSPackage.Macadam.prototype.init).toHaveBeenCalled();
  });

  test('createCliTool is called and its result is added to subscriptions', async () => {
    const cliTool = {} as extensionApi.CliTool;
    vi.mocked(extensionApi.cli.createCliTool).mockReturnValue(cliTool);
    await activate(extensionContext);
    expect(extensionApi.cli.createCliTool).toHaveBeenCalled();
    expect(extensionContext.subscriptions.push).toHaveBeenCalledWith(cliTool);
  });

  test('createProvider is called and its result is added to subscriptions', async () => {
    await activate(extensionContext);
    expect(extensionApi.provider.createProvider).toHaveBeenCalled();
    expect(extensionContext.subscriptions.push).toHaveBeenCalledWith(provider);
  });

  test('setVmProviderConnectionFactory is called on provider', async () => {
    await activate(extensionContext);
    expect(provider.setVmProviderConnectionFactory).toHaveBeenCalledOnce();
  });

  describe('create', () => {
    let create: (
      params: {
        [key: string]: unknown;
      },
      logger?: extensionApi.Logger,
      token?: extensionApi.CancellationToken,
    ) => Promise<void>;

    beforeEach(async () => {
      await activate(extensionContext);
      expect(provider.setVmProviderConnectionFactory).toHaveBeenCalledOnce();
      const call = vi.mocked(provider.setVmProviderConnectionFactory).mock.calls[0];
      assert(!!call[0].create);
      create = call[0].create;
    });

    describe('calling create on Mac', async () => {
      const authClient: SubscriptionManagerClientV1 = {
        images: {
          downloadImageUsingSha: vi.fn(),
        },
      } as unknown as SubscriptionManagerClientV1;
      beforeEach(async () => {
        vi.mocked(extensionApi.env).isMac = true;
        vi.mocked(extensionApi.env).isWindows = false;
        vi.mocked(authentication.initAuthentication).mockResolvedValue(authClient);
      });

      test('image is pulled when image is not cached', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        await create({});
        expect(fs.existsSync).toHaveBeenCalledTimes(1);
        expect(fs.existsSync).toHaveBeenCalledWith(resolve('/', 'path', 'to', 'storage', 'images', 'image'));
        expect(utils.pullImageFromRedHatRegistry).toHaveBeenCalled();
      });

      test('image is not pulled when image is cached', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        await create({});
        expect(fs.existsSync).toHaveBeenCalledTimes(1);
        expect(fs.existsSync).toHaveBeenCalledWith(resolve('/', 'path', 'to', 'storage', 'images', 'image'));
        expect(utils.pullImageFromRedHatRegistry).not.toHaveBeenCalled();
      });

      test('createVm is called with provided name', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        await create({
          'macadam.factory.machine.name': 'name1',
        });
        expect(macadamJSPackage.Macadam.prototype.createVm).toHaveBeenCalledWith({
          containerProvider: 'applehv',
          imagePath: resolve('/', 'path', 'to', 'storage', 'images', 'image'),
          name: 'name1',
          username: 'core',
          runOptions: {},
        });
      });

      test('createVm is called with provided image path', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        await create({
          'macadam.factory.machine.name': 'name1',
          'macadam.factory.machine.image-path': resolve('/', 'path', 'to', 'provided', 'image'),
        });
        expect(macadamJSPackage.Macadam.prototype.createVm).toHaveBeenCalledWith({
          containerProvider: 'applehv',
          imagePath: resolve('/', 'path', 'to', 'provided', 'image'),
          name: 'name1',
          username: 'core',
          runOptions: {},
        });
      });
    });

    describe('calling create on Windows and wsl is enabled', async () => {
      const authClient: SubscriptionManagerClientV1 = {
        images: {
          downloadImageUsingSha: vi.fn(),
        },
      } as unknown as SubscriptionManagerClientV1;
      beforeEach(async () => {
        vi.mocked(extensionApi.env).isMac = false;
        vi.mocked(extensionApi.env).isWindows = true;
        vi.mocked(authentication.initAuthentication).mockResolvedValue(authClient);
        vi.mocked(winutils.isWSLEnabled).mockResolvedValue(true);
      });

      test('image is pulled when image is not cached', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        await create({});
        expect(fs.existsSync).toHaveBeenCalledTimes(1);
        expect(fs.existsSync).toHaveBeenCalledWith(resolve('/', 'path', 'to', 'storage', 'images', 'image'));
        expect(utils.pullImageFromRedHatRegistry).toHaveBeenCalled();
      });

      test('image is not pulled when image is cached', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        await create({});
        expect(fs.existsSync).toHaveBeenCalledTimes(1);
        expect(fs.existsSync).toHaveBeenCalledWith(resolve('/', 'path', 'to', 'storage', 'images', 'image'));
        expect(utils.pullImageFromRedHatRegistry).not.toHaveBeenCalled();
      });

      test('createVm is called with provided name', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        await create({
          'macadam.factory.machine.name': 'name1',
        });
        expect(macadamJSPackage.Macadam.prototype.createVm).toHaveBeenCalledWith({
          containerProvider: 'wsl',
          imagePath: resolve('/', 'path', 'to', 'storage', 'images', 'image'),
          name: 'name1',
          username: 'core',
          runOptions: {},
        });
      });

      test('createVm is called with provided image path', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        await create({
          'macadam.factory.machine.name': 'name1',
          'macadam.factory.machine.image-path': resolve('/', 'path', 'to', 'provided', 'image'),
        });
        expect(macadamJSPackage.Macadam.prototype.createVm).toHaveBeenCalledWith({
          containerProvider: 'wsl',
          imagePath: resolve('/', 'path', 'to', 'provided', 'image'),
          name: 'name1',
          username: 'core',
          runOptions: {},
        });
      });
    });

    describe('calling create on Windows and wsl is disabled', async () => {
      const authClient: SubscriptionManagerClientV1 = {
        images: {
          downloadImageUsingSha: vi.fn(),
        },
      } as unknown as SubscriptionManagerClientV1;
      beforeEach(async () => {
        vi.mocked(extensionApi.env).isMac = false;
        vi.mocked(extensionApi.env).isWindows = true;
        vi.mocked(authentication.initAuthentication).mockResolvedValue(authClient);
        vi.mocked(winutils.isWSLEnabled).mockResolvedValue(false);
      });

      test('hyperv is not supported', async () => {
        await expect(create({})).rejects.toThrowError('provider hyperv is not supported');
      });
    });

    describe('initAuthentication fails', () => {
      beforeEach(async () => {
        vi.mocked(extensionApi.env).isMac = true;
        vi.mocked(extensionApi.env).isWindows = false;
        vi.mocked(authentication.initAuthentication).mockRejectedValue('an init error');
      });

      test('calling create fails', async () => {
        await expect(create({})).rejects.toThrowError('an init error');
      });
    });

    describe('macadam.createVm fails', () => {
      const authClient: SubscriptionManagerClientV1 = {
        images: {
          downloadImageUsingSha: vi.fn(),
        },
      } as unknown as SubscriptionManagerClientV1;
      beforeEach(async () => {
        vi.mocked(extensionApi.env).isMac = true;
        vi.mocked(extensionApi.env).isWindows = false;
        vi.mocked(authentication.initAuthentication).mockResolvedValue(authClient);
        vi.mocked(macadamJSPackage.Macadam.prototype.createVm).mockRejectedValue({
          name: 'an error',
          message: 'a message',
          stderr: 'bla bla',
        } as extensionApi.RunError);
      });

      test('calling create fails', async () => {
        await expect(create({})).rejects.toThrowError(`an error
a message
bla bla
`);
      });
    });
  });

  describe('list', () => {
    beforeEach(() => {
      vi.mocked(utils.verifyContainerProivder).mockImplementation((f): 'wsl' | 'hyperv' | 'applehv' | undefined => {
        if (!f) {
          return undefined;
        }
        return f as 'wsl' | 'hyperv' | 'applehv' | undefined;
      });
      vi.mocked(macadamJSPackage.Macadam.prototype.listVms).mockResolvedValue([]);
    });

    describe('on Mac', async () => {
      const authClient: SubscriptionManagerClientV1 = {
        images: {
          downloadImageUsingSha: vi.fn(),
        },
      } as unknown as SubscriptionManagerClientV1;
      beforeEach(async () => {
        vi.mocked(extensionApi.env).isMac = true;
        vi.mocked(extensionApi.env).isWindows = false;
        vi.mocked(authentication.initAuthentication).mockResolvedValue(authClient);
      });

      test('listVms is called once', async () => {
        await activate(extensionContext);
        await vi.waitFor(() => {
          expect(macadamJSPackage.Macadam.prototype.listVms).toHaveBeenCalledWith({ containerProvider: 'applehv' });
        });
      });
    });

    describe('on Windows and wsl and hyperv enabled', async () => {
      const authClient: SubscriptionManagerClientV1 = {
        images: {
          downloadImageUsingSha: vi.fn(),
        },
      } as unknown as SubscriptionManagerClientV1;
      beforeEach(async () => {
        vi.mocked(extensionApi.env).isMac = false;
        vi.mocked(extensionApi.env).isWindows = true;
        vi.mocked(authentication.initAuthentication).mockResolvedValue(authClient);
        vi.mocked(winutils.isWSLEnabled).mockResolvedValue(true);
        vi.mocked(winutils.isHyperVEnabled).mockResolvedValue(true);
      });

      test('listVms is called for each provider', async () => {
        await activate(extensionContext);
        await vi.waitFor(() => {
          expect(macadamJSPackage.Macadam.prototype.listVms).toHaveBeenCalledTimes(2);
        });
        expect(macadamJSPackage.Macadam.prototype.listVms).toHaveBeenCalledWith({ containerProvider: 'wsl' });
        expect(macadamJSPackage.Macadam.prototype.listVms).toHaveBeenCalledWith({ containerProvider: 'hyperv' });
      });
    });
  });
});
