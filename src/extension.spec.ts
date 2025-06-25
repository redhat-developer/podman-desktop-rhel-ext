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
import { resolve } from 'node:path';

import * as macadamJSPackage from '@crc-org/macadam.js';
import * as extensionApi from '@podman-desktop/api';
import { vol } from 'memfs';
import { afterEach, assert, beforeEach, describe, expect, test, vi } from 'vitest';

import * as authentication from './authentication';
import { ImageCache } from './cache';
import { activate } from './extension';
import type { SubscriptionManagerClientV1 } from './rh-api/rh-api-sm';
import * as utils from './utils';
import * as winutils from './win/utils';

vi.mock('./authentication');
vi.mock('./utils');
vi.mock('node:fs/promises');
vi.mock('node:fs');
vi.mock('./win/utils');
vi.mock('./cache', async () => {
  const ImageCache = vi.fn();
  ImageCache.prototype.init = vi.fn();
  ImageCache.prototype.getPath = vi.fn();
  return { ImageCache };
});
vi.mock('@crc-org/macadam.js', async () => {
  const Macadam = vi.fn();
  Macadam.prototype.init = vi.fn();
  Macadam.prototype.createVm = vi.fn();
  Macadam.prototype.listVms = vi.fn();
  Macadam.prototype.startVm = vi.fn();
  Macadam.prototype.stopVm = vi.fn();
  Macadam.prototype.removeVm = vi.fn();
  Macadam.prototype.executeCommand = vi.fn();
  return { Macadam };
});
vi.mock('./macadam-machine-stream.js', async () => {
  const ProviderConnectionShellAccessImpl = vi.fn();
  return { ProviderConnectionShellAccessImpl };
});

beforeEach(() => {
  vi.resetAllMocks();
  vol.reset();
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
    registerVmProviderConnection: vi.fn(),
    updateStatus: vi.fn(),
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

      test('RHEL image is pulled when image is not cached', async () => {
        vi.mocked(ImageCache.prototype.getPath).mockReturnValue(
          resolve('/', 'path', 'to', 'storage', 'images', 'rhel10'),
        );
        await create({
          'rhel-vms.factory.machine.image': 'RHEL 10',
          'rhel-vms.factory.machine.register': false,
        });
        expect(utils.pullImageFromRedHatRegistry).toHaveBeenCalled();
      });

      test('RHEL image is pulled when download is forced, not considering if image is cached', async () => {
        vi.mocked(ImageCache.prototype.getPath).mockReturnValue(
          resolve('/', 'path', 'to', 'storage', 'images', 'rhel10'),
        );
        await create({
          'rhel-vms.factory.machine.image': 'RHEL 10',
          'rhel-vms.factory.machine.force-download': true,
          'rhel-vms.factory.machine.register': false,
        });
        vol.fromJSON({
          '/path/to/storage/images/rhel10': '',
        });
        // image is pulled
        expect(utils.pullImageFromRedHatRegistry).toHaveBeenCalled();
      });

      test('RHEL image is not pulled when image is cached', async () => {
        vi.mocked(ImageCache.prototype.getPath).mockReturnValue(
          resolve('/', 'path', 'to', 'storage', 'images', 'rhel10'),
        );
        vol.fromJSON({
          '/path/to/storage/images/rhel10': '',
        });
        await create({
          'rhel-vms.factory.machine.image': 'RHEL 10',
          'rhel-vms.factory.machine.register': false,
        });
        expect(utils.pullImageFromRedHatRegistry).not.toHaveBeenCalled();
      });

      test('createVm is called with provided name', async () => {
        vi.mocked(ImageCache.prototype.getPath).mockReturnValue(
          resolve('/', 'path', 'to', 'storage', 'images', 'rhel10'),
        );
        await create({
          'rhel-vms.factory.machine.name': 'name1',
          'rhel-vms.factory.machine.image': 'RHEL 10',
          'rhel-vms.factory.machine.register': false,
        });
        expect(macadamJSPackage.Macadam.prototype.createVm).toHaveBeenCalledWith({
          containerProvider: 'applehv',
          imagePath: resolve('/', 'path', 'to', 'storage', 'images', 'rhel10'),
          name: 'name1',
          username: 'core',
          runOptions: {},
        });
      });

      test('createVm is called with provided image path', async () => {
        await create({
          'rhel-vms.factory.machine.image': 'local image on disk',
          'rhel-vms.factory.machine.name': 'name1',
          'rhel-vms.factory.machine.image-path': resolve('/', 'path', 'to', 'provided', 'image'),
          'rhel-vms.factory.machine.register': false,
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
        vi.mocked(ImageCache.prototype.getPath).mockReturnValue(
          resolve('/', 'path', 'to', 'storage', 'images', 'rhel10'),
        );
        await create({
          'rhel-vms.factory.machine.image': 'RHEL 10',
          'rhel-vms.factory.machine.register': false,
        });
        expect(utils.pullImageFromRedHatRegistry).toHaveBeenCalled();
      });

      test('image is not pulled when image is cached', async () => {
        vi.mocked(ImageCache.prototype.getPath).mockReturnValue(
          resolve('/', 'path', 'to', 'storage', 'images', 'rhel10'),
        );
        vol.fromJSON({
          '/path/to/storage/images/rhel10': '',
        });
        await create({
          'rhel-vms.factory.machine.image': 'RHEL 10',
          'rhel-vms.factory.machine.register': false,
        });
        expect(utils.pullImageFromRedHatRegistry).not.toHaveBeenCalled();
      });

      test('createVm is called with provided name', async () => {
        vi.mocked(ImageCache.prototype.getPath).mockReturnValue(
          resolve('/', 'path', 'to', 'storage', 'images', 'rhel10'),
        );
        await create({
          'rhel-vms.factory.machine.name': 'name1',
          'rhel-vms.factory.machine.image': 'RHEL 10',
          'rhel-vms.factory.machine.register': false,
        });
        expect(macadamJSPackage.Macadam.prototype.createVm).toHaveBeenCalledWith({
          containerProvider: 'wsl',
          imagePath: resolve('/', 'path', 'to', 'storage', 'images', 'rhel10'),
          name: 'name1',
          username: 'core',
          runOptions: {},
        });
      });

      test('createVm is called with provided image path', async () => {
        await create({
          'rhel-vms.factory.machine.image': 'local image on disk',
          'rhel-vms.factory.machine.name': 'name1',
          'rhel-vms.factory.machine.image-path': resolve('/', 'path', 'to', 'provided', 'image'),
          'rhel-vms.factory.machine.register': false,
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
        await expect(
          create({
            'rhel-vms.factory.machine.image': 'RHEL 10',
            'rhel-vms.factory.machine.register': false,
          }),
        ).rejects.toThrowError('provider hyperv is not supported');
      });
    });

    describe('initAuthentication fails', () => {
      beforeEach(async () => {
        vi.mocked(extensionApi.env).isMac = true;
        vi.mocked(extensionApi.env).isWindows = false;
        vi.mocked(authentication.initAuthentication).mockRejectedValue('an init error');
      });

      test('calling create fails', async () => {
        await expect(
          create({
            'rhel-vms.factory.machine.image': 'RHEL 10',
            'rhel-vms.factory.machine.register': false,
          }),
        ).rejects.toThrowError('an init error');
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
        vi.mocked(macadamJSPackage.Macadam.prototype.listVms).mockResolvedValue([
          {
            Name: 'vm1',
            Image: '/path/to/image1',
            CPUs: 1,
            Memory: '1GB',
            DiskSize: '1GB',
            Running: false,
            Starting: false,
            Port: 80,
            RemoteUsername: 'user',
            IdentityPath: '/path/to/id1',
            VMType: 'applehv',
          },
        ]);
      });

      test('listVms is called once', async () => {
        await activate(extensionContext);
        await vi.waitFor(() => {
          expect(macadamJSPackage.Macadam.prototype.listVms).toHaveBeenCalledWith({ containerProvider: 'applehv' });
        });
      });

      test('registerVmProviderConnection is called once', async () => {
        await activate(extensionContext);
        await vi.waitFor(() => {
          expect(provider.registerVmProviderConnection).toHaveBeenCalledOnce();
        });
        expect(provider.updateStatus).toHaveBeenCalledWith('ready');
      });

      describe('start', async () => {
        let lifecycle: extensionApi.ProviderConnectionLifecycle;
        beforeEach(async () => {
          vi.mocked(provider.updateStatus).mockClear();
          await activate(extensionContext);
          await vi.waitFor(() => {
            expect(provider.registerVmProviderConnection).toHaveBeenCalledOnce();
          });
          const call = vi.mocked(provider.registerVmProviderConnection).mock.calls[0];
          assert(!!call[0].lifecycle);
          lifecycle = call[0].lifecycle;
        });

        test('calling start which fails', async () => {
          vi.mocked(macadamJSPackage.Macadam.prototype.startVm).mockRejectedValue('an error');
          assert(!!lifecycle.start);
          const logger = {} as extensionApi.Logger;
          await expect(
            lifecycle.start({
              log: logger,
            }),
          ).rejects.toThrowError('an error');
        });

        describe('calling start which works correctly', async () => {
          const logger = {} as extensionApi.Logger;
          beforeEach(async () => {
            assert(!!lifecycle.start);
            await lifecycle.start({
              log: logger,
            });
          });
          test('startVm is called and machine is registered as started', async () => {
            expect(macadamJSPackage.Macadam.prototype.startVm).toHaveBeenCalledOnce();
            expect(macadamJSPackage.Macadam.prototype.startVm).toHaveBeenCalledWith({
              containerProvider: 'applehv',
              name: 'vm1',
              runOptions: {
                logger: {
                  loggers: [logger],
                },
              },
            });
            expect(provider.updateStatus).toHaveBeenCalledWith('started');
          });

          test('calling stop which fails', async () => {
            vi.mocked(macadamJSPackage.Macadam.prototype.stopVm).mockRejectedValue('an error');
            assert(!!lifecycle.stop);
            const logger = {} as extensionApi.Logger;
            await expect(
              lifecycle.stop({
                log: logger,
              }),
            ).rejects.toThrowError('an error');
          });

          describe('calling stop which works correctly', async () => {
            const logger = {} as extensionApi.Logger;
            beforeEach(async () => {
              assert(!!lifecycle.stop);
              await lifecycle.stop({
                log: logger,
              });
            });
            test('stopVm is called and machine is registered as stopped', async () => {
              expect(macadamJSPackage.Macadam.prototype.stopVm).toHaveBeenCalledOnce();
              expect(macadamJSPackage.Macadam.prototype.stopVm).toHaveBeenCalledWith({
                containerProvider: 'applehv',
                name: 'vm1',
                runOptions: {
                  logger: {
                    loggers: [logger],
                  },
                },
              });
              expect(provider.updateStatus).toHaveBeenCalledWith('stopped');
            });

            test('calling delete which fails', async () => {
              vi.mocked(macadamJSPackage.Macadam.prototype.removeVm).mockRejectedValue('an error');
              assert(!!lifecycle.delete);
              await expect(lifecycle.delete()).rejects.toThrowError('an error');
            });

            describe('calling delete which works correctly', async () => {
              beforeEach(async () => {
                assert(!!lifecycle.delete);
                await lifecycle.delete();
              });
              test('removeVm is called', async () => {
                expect(macadamJSPackage.Macadam.prototype.removeVm).toHaveBeenCalledOnce();
                expect(macadamJSPackage.Macadam.prototype.removeVm).toHaveBeenCalledWith({
                  containerProvider: 'applehv',
                  name: 'vm1',
                  runOptions: {},
                });
              });
            });
          });
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
        vi.mocked(macadamJSPackage.Macadam.prototype.listVms).mockResolvedValue([]);
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

describe('register', () => {
  let create: (
    params: {
      [key: string]: unknown;
    },
    logger?: extensionApi.Logger,
    token?: extensionApi.CancellationToken,
  ) => Promise<void>;

  const extensionContext: extensionApi.ExtensionContext = {
    subscriptions: {
      push: vi.fn(),
    },
    storagePath: resolve('/', 'path', 'to', 'storage'),
  } as unknown as extensionApi.ExtensionContext;

  const provider: extensionApi.Provider = {
    setVmProviderConnectionFactory: vi.fn(),
    registerVmProviderConnection: vi.fn(),
    updateStatus: vi.fn(),
  } as unknown as extensionApi.Provider;

  const authClient: SubscriptionManagerClientV1 = {
    images: {
      downloadImageUsingSha: vi.fn(),
    },
  } as unknown as SubscriptionManagerClientV1;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.mocked(extensionApi.provider.createProvider).mockReturnValue(provider);

    vi.mocked(extensionApi.env).isMac = true;
    vi.mocked(extensionApi.env).isWindows = false;
    vi.mocked(authentication.initAuthentication).mockResolvedValue(authClient);

    await activate(extensionContext);
    expect(provider.setVmProviderConnectionFactory).toHaveBeenCalledOnce();
    const call = vi.mocked(provider.setVmProviderConnectionFactory).mock.calls[0];
    assert(!!call[0].create);
    create = call[0].create;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('register is true and machine is started and registered', async () => {
    const authClient: SubscriptionManagerClientV1 = {
      getOrganizationId: vi.fn().mockReturnValue('123456'),
    } as unknown as SubscriptionManagerClientV1;
    vi.mocked(authentication.initAuthentication).mockResolvedValue(authClient);
    vi.mocked(macadamJSPackage.Macadam.prototype.listVms).mockResolvedValue([
      {
        Name: 'name1',
        Image: '/path/to/image1',
        CPUs: 1,
        Memory: '1GB',
        DiskSize: '1GB',
        Running: true,
        Starting: true,
        Port: 80,
        RemoteUsername: 'user',
        IdentityPath: '/path/to/id1',
        VMType: 'applehv',
      },
    ]);
    vi.mocked(macadamJSPackage.Macadam.prototype.executeCommand).mockResolvedValue({
      stdout: 'done',
    } as extensionApi.RunResult);
    const createPromise = create({
      'rhel-vms.factory.machine.name': 'name1',
      'rhel-vms.factory.machine.image': 'RHEL 10',
      'rhel-vms.factory.machine.register': true,
    });
    vi.mocked(macadamJSPackage.Macadam.prototype.listVms).mockResolvedValue([
      {
        Name: 'name1',
        Image: '/path/to/image1',
        CPUs: 1,
        Memory: '1GB',
        DiskSize: '1GB',
        Running: true,
        Starting: false,
        Port: 80,
        RemoteUsername: 'user',
        IdentityPath: '/path/to/id1',
        VMType: 'applehv',
      },
    ]);
    vi.advanceTimersToNextTimer();
    await createPromise;
    expect(macadamJSPackage.Macadam.prototype.executeCommand).toHaveBeenCalledWith({
      name: 'name1',
      command: 'sudo',
      args: ['subscription-manager', 'register', '--force', '--activationkey', 'podman-desktop', '--org', '123456'],
      runOptions: {},
    });
  });
});
