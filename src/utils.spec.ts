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

import type { FetchResponse } from 'openapi-fetch';
import { expect, test, vi } from 'vitest';

import type { SubscriptionManagerClientV1 } from './rh-api/rh-api-sm';
import { getErrorMessage, pullImageFromRedHatRegistry, verifyContainerProivder } from './utils';

vi.mock('node:fs', () => {
  return {
    createWriteStream: vi.fn(),
  };
});

test('getErrorMessage', () => {
  expect(getErrorMessage({ id: 1, message: 'some error 1' })).toBe('some error 1');
  expect(getErrorMessage('some error 2')).toBe('some error 2');
  expect(getErrorMessage(5)).toBe('');
});

test('verifyContainerProivder', () => {
  expect(verifyContainerProivder('wsl')).toBe('wsl');
  expect(verifyContainerProivder('applehv')).toBe('applehv');
  expect(verifyContainerProivder('hyperv')).toBe('hyperv');
  expect(verifyContainerProivder('someOtherProvider')).toBe(undefined);
});

test('pullImageFromRedHatRegistry', async () => {
  const rhsmClientV1 = { images: { downloadImageUsingSha: vi.fn() } } as unknown as SubscriptionManagerClientV1;

  vi.mocked(rhsmClientV1.images.downloadImageUsingSha).mockResolvedValue({
    data: { pipeTo: vi.fn() } as unknown as ReadableStream,
  } as unknown as FetchResponse<Record<string, unknown>, unknown, '/'>);

  await pullImageFromRedHatRegistry(rhsmClientV1, 'image1234', '/path/to/save');

  expect(rhsmClientV1.images.downloadImageUsingSha).toBeCalledWith('image1234');
  expect(fs.createWriteStream).toBeCalledWith('/path/to/save');
});
