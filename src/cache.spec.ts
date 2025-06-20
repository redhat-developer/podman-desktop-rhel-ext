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

import { vol } from 'memfs';
import { beforeEach, expect, test, vi } from 'vitest';

import { ImageCache } from './cache';

vi.mock('node:fs');
vi.mock('node:fs/promises');

beforeEach(() => {
  vol.reset();
});

test('images/image and images/rhel9_5 are deleted during init if they exist, rhel9_§ is not deleted', async () => {
  const cachePath = resolve('/', 'path', 'to', 'cache');
  const cache = new ImageCache(cachePath);
  vol.fromJSON({
    '/path/to/cache/images/image': '',
    '/path/to/cache/images/rhel9_5': '',
    '/path/to/cache/images/rhel9_6': '',
  });

  await cache.init();

  expect(vol.toJSON()).toEqual({
    '/path/to/cache/images/rhel9_6': '',
  });
});

test('images directory is created', async () => {
  const cache = new ImageCache(resolve('/', 'path', 'to', 'cache'));

  await cache.init();

  expect(vol.toJSON()).toEqual({
    '/path/to/cache/images': null,
  });
});

test('getPath returns path for known image', async () => {
  const cache = new ImageCache(resolve('/', 'path', 'to', 'cache'));
  await cache.init();
  const path = cache.getPath('RHEL 10.0');
  expect(path).toBe(resolve('/', 'path', 'to', 'cache', 'images', 'rhel10_0'));
});

test('getPath raises an exception for an unknown image', async () => {
  const cache = new ImageCache(resolve('/', 'path', 'to', 'cache'));
  await cache.init();
  expect(() => cache.getPath('??')).toThrowError('image ?? is unknown');
});
