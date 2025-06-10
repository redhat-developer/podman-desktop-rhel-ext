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

import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

import { MACADAM_IMAGE_PROPERTY_VALUE_RHEL_10 } from './constants';

export class ImageCache {
  #cachedImageDir: string;

  #cachedImageNames: Record<string, string> = {
    [MACADAM_IMAGE_PROPERTY_VALUE_RHEL_10]: 'rhel10',
  };

  constructor(storagePath: string) {
    this.#cachedImageDir = resolve(storagePath, 'images');
  }

  async init(): Promise<void> {
    await this.cleanupv1();
    await mkdir(this.#cachedImageDir, { recursive: true });
  }

  // v1 supported only 1 image, cached as `images/image`
  async cleanupv1(): Promise<void> {
    const imagePath = resolve(this.#cachedImageDir, 'image');
    if (existsSync(imagePath)) {
      await rm(imagePath);
    }
  }

  getPath(image: string): string {
    if (!(image in this.#cachedImageNames)) {
      throw new Error(`image ${image} is unknown`);
    }
    return resolve(this.#cachedImageDir, this.#cachedImageNames[image]);
  }
}
