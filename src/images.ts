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

import { arch } from 'node:os';

const IMAGES: { [provider: string]: string } = {
  applehv: '24f35ffb80911f2687f0bcd4237f62e46c19a6f0445aacb951b77d1974130187',
  wsl: '1351d19fddb169ed01dc8815e9318027d27d7fe8c80e1844559ccd9c041ad9ca',
  linux_native_x64: '9d11248599b91178a600202412ad3ffc6f1c75c050d7b3c5484dc3f46fc06582',
};

export function getImageSha(provider?: string): string {
  if (!provider) {
    if (arch() === 'x64') {
      return IMAGES['linux_native_x64'];
    } else {
      throw new Error('linux non-x64 is not supported');
    }
  }
  if (provider in IMAGES) {
    return IMAGES[provider];
  }
  throw new Error(`provider ${provider} is not supported`);
}
