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

import { MACADAM_IMAGE_PROPERTY_VALUE_RHEL_9, MACADAM_IMAGE_PROPERTY_VALUE_RHEL_10 } from './constants';

const IMAGES: { [provider: string]: { [version: string]: string } } = {
  applehv: {
    [MACADAM_IMAGE_PROPERTY_VALUE_RHEL_10]: 'd32f05024821400932b3653647567abcd34dc03b4243d9a8ae5a11ecd11b1544',
    [MACADAM_IMAGE_PROPERTY_VALUE_RHEL_9]: '73c93ad15404a93b2d5bb3b01474e2827e03eb74316132c1067519e4cb598652',
  },
  wsl: {
    [MACADAM_IMAGE_PROPERTY_VALUE_RHEL_10]: 'dccb2abb166981fa7598e948f9cab029aa1775219f8249fd54760ddd0f2b8910',
    [MACADAM_IMAGE_PROPERTY_VALUE_RHEL_9]: 'dca8920b81a0664788a098b20328ee98ee6f822f1a1106ee85e9146c50ae6b98',
  },
  linux_native_x64: {
    [MACADAM_IMAGE_PROPERTY_VALUE_RHEL_10]: '73473542ff4622524ae200ffabd4064bb2a7ff39ac40a012443a43d429d60019',
    [MACADAM_IMAGE_PROPERTY_VALUE_RHEL_9]: '49443696e7f2410e5647aa16f15eb7b7b08610fea92cdf3eba44ab9ec9ff899f',
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
