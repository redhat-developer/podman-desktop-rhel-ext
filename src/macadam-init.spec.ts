/**********************************************************************
 * Copyright (C) 2026 Red Hat, Inc.
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

import type { Macadam } from '@crc-org/macadam.js';
import { beforeEach, expect, test, vi } from 'vitest';

import { MacadamInitializer } from './macadam-init';

beforeEach(() => {
  vi.resetAllMocks();
});

test('init should initialize the macadam library', async () => {
  const macadam: Macadam = {
    init: vi.fn(),
  } as unknown as Macadam;
  const initializer = new MacadamInitializer(macadam);
  expect(macadam.init).not.toHaveBeenCalled();
  await initializer.init();
  expect(macadam.init).toHaveBeenCalled();
});

test('onInitialized should call the callback when the macadam library is initialized', async () => {
  const macadam: Macadam = {
    init: vi.fn(),
  } as unknown as Macadam;
  const initializer = new MacadamInitializer(macadam);
  const callback = vi.fn();
  initializer.onInitialized(callback);
  await initializer.init();
  expect(callback).toHaveBeenCalled();
});
