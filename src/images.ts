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

import { RHEL_VMS_IMAGE_PROPERTY_VALUE_RHEL_9, RHEL_VMS_IMAGE_PROPERTY_VALUE_RHEL_10 } from './constants';

const IMAGES: { [provider: string]: { [version: string]: string } } = {
  applehv: {
    [RHEL_VMS_IMAGE_PROPERTY_VALUE_RHEL_10]: 'a522f6abacab1c5804477332bbd14a467c3f9812d3f2c46ee05c71b07df05bcf', // 10.1
    [RHEL_VMS_IMAGE_PROPERTY_VALUE_RHEL_9]: 'e424cba737c5d6315160111043f40108b3bc458c09c937454a3331c52503d877', // 9.7
  },
  wsl: {
    [RHEL_VMS_IMAGE_PROPERTY_VALUE_RHEL_10]: 'e1871004d0075e0ce10cfb4c1aae7c1fb56cf2162e9d494d1f9c9d061902fec6', // 10.1
    [RHEL_VMS_IMAGE_PROPERTY_VALUE_RHEL_9]: 'bf4fa1142e0090e7f6fe163bf03d5f0de12ebafce02d4f8ea71dd5de3f1769c8', // 9.7
  },
  linux_native_x64: {
    [RHEL_VMS_IMAGE_PROPERTY_VALUE_RHEL_10]: 'dc74ad1a9ccd3c62a02cc29f7f4715e47fa0fdaf08a8080dd20906f885f29bae', // 10.1
    [RHEL_VMS_IMAGE_PROPERTY_VALUE_RHEL_9]: 'e89e0a3e28c3e7fb73a97483b60130d5a3e4bba9481ae282ec6e0551ccf30047', // 9.7
  },
};

export function getImageSha(provider: string | undefined, version: string): string {
  if (!provider) {
    if (arch() === 'x64') {
      return IMAGES['linux_native_x64'][version];
    } else {
      throw new Error('linux non-x64 is not supported');
    }
  }
  if (provider in IMAGES) {
    return IMAGES[provider][version];
  }
  throw new Error(`provider ${provider} is not supported`);
}
