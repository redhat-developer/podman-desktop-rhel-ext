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

import * as extensionApi from '@podman-desktop/api';
import { beforeEach, expect, test, vi } from 'vitest';

import { initAuthentication } from './authentication';
import { SubscriptionManagerClientV1 } from './rh-api/rh-api-sm';

vi.mock('./rh-api/rh-api-sm', async () => {
  return {
    SubscriptionManagerClientV1: vi.fn(),
  };
});

beforeEach(() => {
  vi.resetAllMocks();
});

test('init authetication throws error if no current session', async () => {
  vi.mocked(extensionApi.authentication.getSession).mockResolvedValue(undefined);

  await expect(async () => {
    await initAuthentication();
  }).rejects.toThrowError('unable to connect to Red Hat SSO, please configure the RH authentication');
});

test('init authetication returns SubscriptionManagerClientV1 if there is current session', async () => {
  vi.mocked(extensionApi.authentication.getSession).mockResolvedValue({
    accessToken: 'token-1',
  } as unknown as extensionApi.AuthenticationSession);

  await initAuthentication();

  expect(SubscriptionManagerClientV1).toBeCalledWith({
    BASE: 'https://api.access.redhat.com/management/v1/',
    TOKEN: 'token-1',
  });
});
