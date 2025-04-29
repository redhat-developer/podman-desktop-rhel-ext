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
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

import * as extensionApi from '@podman-desktop/api';

import { macadam } from './extension';

const localBinDir = '/usr/local/bin';

/**
 * Calculate the system path of the binary
 * @returns
 */
export function getSystemBinaryPath(binaryName: string): string {
  switch (process.platform) {
    case 'win32':
      return join(
        homedir(),
        'AppData',
        'Local',
        'Microsoft',
        'WindowsApps',
        binaryName.endsWith('.exe') ? binaryName : `${binaryName}.exe`,
      );
    case 'darwin':
    case 'linux':
      return join(localBinDir, binaryName);
    default:
      throw new Error(`unsupported platform: ${process.platform}.`);
  }
}

/**
 * Given an executable name, it will find where it is installed on the system.
 * It first try to search it in the system-wide folder, then in the extension storage
 * @param executable
 */
export async function whereBinary(storagePath: string, binaryName: string): Promise<string> {
  const macadamSystemWidePath = getSystemBinaryPath(binaryName);
  if (existsSync(macadamSystemWidePath)) {
    return macadamSystemWidePath;
  }

  const macadamStoragePath = resolve(storagePath, 'bin', binaryName);
  if (existsSync(macadamStoragePath)) {
    return macadamStoragePath;
  }

  // if it's not installed either in the extension storage path or system wide throw an error
  throw new Error('no macadam binary found');
}

export function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    return String(err.message);
  } else if (typeof err === 'string') {
    return err;
  }
  return '';
}

export function verifyContainerProivder(containerProvider: string): 'wsl' | 'hyperv' | 'applehv' | undefined {
  if (containerProvider === 'wsl' || containerProvider === 'hyperv' || containerProvider === 'applehv') {
    return containerProvider;
  } else {
    return undefined;
  }
}
