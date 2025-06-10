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
import * as fsPromises from 'node:fs/promises';
import { resolve } from 'node:path';

import { expect, test, vi } from 'vitest';

import { ImageCache } from './cache';

vi.mock('node:fs');
vi.mock('node:fs/promises');

test('images/image file is deleted during init if it exists', async () => {
  const cache = new ImageCache(resolve('/', 'path', 'to', 'cache'));

  vi.mocked(fs.existsSync).mockImplementation((path: fs.PathLike): boolean => {
    return path === resolve('/', 'path', 'to', 'cache', 'images', 'image');
  });
  await cache.init();

  expect(fsPromises.rm).toHaveBeenCalledWith(resolve('/', 'path', 'to', 'cache', 'images', 'image'));
});

test('images directory is created', async () => {
  const cache = new ImageCache(resolve('/', 'path', 'to', 'cache'));

  await cache.init();

  expect(fsPromises.mkdir).toHaveBeenCalledWith(resolve('/', 'path', 'to', 'cache', 'images'), { recursive: true });
});

test('getPath returns path for known image', async () => {
  const cache = new ImageCache(resolve('/', 'path', 'to', 'cache'));
  await cache.init();
  const path = cache.getPath('RHEL 10');
  expect(path).toBe(resolve('/', 'path', 'to', 'cache', 'images', 'rhel10'));
});

test('getPath raises an exception for an unknown image', async () => {
  const cache = new ImageCache(resolve('/', 'path', 'to', 'cache'));
  await cache.init();
  expect(() => cache.getPath('??')).toThrowError('image ?? is unknown');
});
