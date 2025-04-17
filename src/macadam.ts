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

import * as os from 'node:os';
import { normalize } from 'node:path';

import * as extensionApi from '@podman-desktop/api';

import { getSystemBinaryPath, whereBinary } from './utils';

export class Macadam {
  constructor(private readonly storagePath: string) {}

  /**
   * Calculate the name of the macadam executable based on the OS and arch.
   * E.g. on macOS arm64 systems it is macadam-darwin-arm64
   */
  getExecutableName(): string {
    let ext = '';
    let osName: string = os.platform();
    if (osName === 'win32') {
      osName = 'windows';
      ext = '.exe';
    }

    let arch = os.arch();
    if (arch === 'x64') {
      arch = 'amd64';
    }

    return `macadam-${osName}-${arch}${ext}`;
  }

  /**
   * Returns the macadam executable path
   */
  async getExecutable(): Promise<string> {
    return await whereBinary(this.storagePath, this.getExecutableName());
  }

  /**
   * Return the version and the path of an executable
   * @param executable
   */
  async getBinaryInfo(): Promise<{ version: string; path: string; installationSource: 'external' | 'extension' }> {
    // retrieve the path of the macadam executable
    const executable = await whereBinary(this.storagePath, this.getExecutableName());

    // retrieve its version
    const version = await this.getInstalledVersion(executable);

    // calculate the path that macadam should have if installed system wide
    const systemPath = getSystemBinaryPath(this.getExecutableName());

    return {
      version,
      path: executable,
      installationSource: normalize(executable) !== normalize(systemPath) ? 'extension' : 'external',
    };
  }

  /**
   * Retrieve the version of macadam by parsing stdout of `macadam --version`
   * @param executable
   */
  async getInstalledVersion(executable?: string): Promise<string> {
    // if the executable is not an absolute path we search for it
    executable ??= await whereBinary(this.storagePath, this.getExecutableName());

    const { stdout } = await extensionApi.process.exec(executable, ['--version']);
    const macadamExecName = this.getExecutableName();
    if (stdout.startsWith(`${macadamExecName} version`)) {
      const skipIndex = `${macadamExecName} version`.length;
      return stdout.substring(skipIndex).trim();
    }
    throw new Error('malformed macadam output');
  }
}
