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

import { env } from '@podman-desktop/api';
import { vol } from 'memfs';
import { beforeEach, expect, test, vi } from 'vitest';

import { ImageCache } from './cache';

vi.mock('node:fs');
vi.mock('node:fs/promises');
vi.mock('@podman-desktop/api');

beforeEach(() => {
  vi.resetAllMocks();
  vol.reset();
  vi.mocked(env).isWindows = false;
  vi.mocked(env).isMac = false;
  vi.mocked(env).isLinux = false;
});

test('images/image and images/rhel9_6 are deleted during init if they exist, rhel9 is not deleted, on Windows', async () => {
  vi.mocked(env).isWindows = true;
  const cachePath = resolve('/', 'path', 'to', 'cache');
  const cache = new ImageCache(cachePath);
  vol.fromJSON({
    '/path/to/cache/images/image': '',
    '/path/to/cache/images/rhel9_6.tar.gz': '',
    '/path/to/cache/images/rhel9.tar.gz': '',
  });

  await cache.init();

  expect(vol.toJSON()).toEqual({
    '/path/to/cache/images/rhel9.tar.gz': '',
  });
});

test('images/image and images/rhel9_6 are deleted during init if they exist, rhel9 is not deleted, on Mac', async () => {
  vi.mocked(env).isMac = true;
  const cachePath = resolve('/', 'path', 'to', 'cache');
  const cache = new ImageCache(cachePath);
  vol.fromJSON({
    '/path/to/cache/images/image': '',
    '/path/to/cache/images/rhel9_6.tar.gz': '',
    '/path/to/cache/images/rhel9.qcow2': '',
  });

  await cache.init();

  expect(vol.toJSON()).toEqual({
    '/path/to/cache/images/rhel9.qcow2': '',
  });
});

test('images directory is created', async () => {
  const cache = new ImageCache(resolve('/', 'path', 'to', 'cache'));

  await cache.init();

  expect(vol.toJSON()).toEqual({
    '/path/to/cache/images': null,
  });
});

test('getPath returns path for known image on Windows', async () => {
  vi.mocked(env).isWindows = true;
  const cache = new ImageCache(resolve('/', 'path', 'to', 'cache'));
  await cache.init();
  const path = cache.getPath('RHEL 10');
  expect(path).toBe(resolve('/', 'path', 'to', 'cache', 'images', 'rhel10.tar.gz'));
});

test('getPath returns path for known image on Linux', async () => {
  vi.mocked(env).isMac = true;
  const cache = new ImageCache(resolve('/', 'path', 'to', 'cache'));
  await cache.init();
  const path = cache.getPath('RHEL 10');
  expect(path).toBe(resolve('/', 'path', 'to', 'cache', 'images', 'rhel10.qcow2'));
});

test('getPath returns path for known image on Mac', async () => {
  vi.mocked(env).isMac = true;
  const cache = new ImageCache(resolve('/', 'path', 'to', 'cache'));
  await cache.init();
  const path = cache.getPath('RHEL 10');
  expect(path).toBe(resolve('/', 'path', 'to', 'cache', 'images', 'rhel10.qcow2'));
});

test('getPath raises an exception for an unknown image', async () => {
  const cache = new ImageCache(resolve('/', 'path', 'to', 'cache'));
  await cache.init();
  expect(() => cache.getPath('??')).toThrowError('image ?? is unknown');
});
