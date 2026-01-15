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

import { EventEmitter } from 'node:stream';

import type { Macadam } from '@crc-org/macadam.js';

const SIGNAL = 'emit';

export class MacadamInitializer {
  #onMacadamInit = new EventEmitter();
  #initialized = false;

  constructor(private readonly macadam: Macadam) {}

  async init(): Promise<void> {
    await this.macadam.init();
    this.#initialized = true;
    this.#onMacadamInit.emit(SIGNAL);
  }

  async ensureBinariesUpToDate(): Promise<void> {
    await this.macadam.ensureBinariesUpToDate();
    if (!this.#initialized) {
      await this.init();
    }
  }

  onInitialized(callback: () => void): void {
    this.#onMacadamInit.on(SIGNAL, callback);
  }
}
