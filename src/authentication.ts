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

import * as extensionApi from '@podman-desktop/api';

import { SubscriptionManagerClientV1 } from './rh-api/rh-api-sm';

const currentSession = await extensionApi.authentication.getSession('redhat.authentication-provider', []);

if (!currentSession) {
  console.log('unable to connect to Red Hat SSO, please configure the RH authentication');
}

const rhsmClientV1 = new SubscriptionManagerClientV1({
  BASE: 'https://api.access.redhat.com/management/v1/',
  TOKEN: currentSession!.accessToken,
});

const redirectToImage = await rhsmClientV1.images.downloadImageUsingSha('1351d19fddb169ed01dc8815e9318027d27d7fe8c80e1844559ccd9c041ad9ca');

console.log('Redirected =>', redirectToImage.data);

console.log('Redirected =>', redirectToImage.data);
const output = fs.createWriteStream('/Users/eskimo/Temp/file-name.iso');
const stream = new WritableStream({
  write(chunk) {
    output.write(chunk);
  },
});
redirectToImage?.data?.pipeTo(stream);