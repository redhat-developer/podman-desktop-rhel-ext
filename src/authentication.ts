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

import { SubscriptionManagerClientV1 } from './rh-api/rh-api-sm';

export async function initAuthentication(): Promise<SubscriptionManagerClientV1> {
  const currentSession = await extensionApi.authentication.getSession(
    'redhat.authentication-provider',
    ['api.iam.registry_service_accounts', 'api.console'],
    { createIfNone: true },
  );

  if (!currentSession) {
    throw new Error('unable to connect to Red Hat SSO, please configure the RH authentication');
  } else {
    return new SubscriptionManagerClientV1({
      BASE: 'https://api.access.redhat.com/management/v1/',
      TOKEN: currentSession.accessToken,
    });
  }
}
