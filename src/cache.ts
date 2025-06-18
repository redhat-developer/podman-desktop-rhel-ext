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

import { mkdir, readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

import { RHEL_VMS_IMAGE_PROPERTY_VALUE_RHEL_9, RHEL_VMS_IMAGE_PROPERTY_VALUE_RHEL_10 } from './constants';

export class ImageCache {
  #cachedImageDir: string;

  #cachedImageNames: Record<string, string> = {
    [RHEL_VMS_IMAGE_PROPERTY_VALUE_RHEL_10]: 'rhel10_0',
    [RHEL_VMS_IMAGE_PROPERTY_VALUE_RHEL_9]: 'rhel9_6',
  };

  constructor(storagePath: string) {
    this.#cachedImageDir = resolve(storagePath, 'images');
  }

  async init(): Promise<void> {
    await mkdir(this.#cachedImageDir, { recursive: true });
    await this.cleanup();
  }

  // delete all files not listed in cachedImageNames
  async cleanup(): Promise<void> {
    const possibleValues = Object.values(this.#cachedImageNames);
    const files = await readdir(this.#cachedImageDir, { recursive: false, withFileTypes: true });
    for (const file of files) {
      if (!file.isFile() || possibleValues.includes(file.name)) {
        continue;
      }
      console.log('deleting unused image from cache', resolve(file.parentPath, file.name));
      await rm(resolve(file.parentPath, file.name));
    }
  }

  getPath(image: string): string {
    if (!(image in this.#cachedImageNames)) {
      throw new Error(`image ${image} is unknown`);
    }
    return resolve(this.#cachedImageDir, this.#cachedImageNames[image]);
  }
}
