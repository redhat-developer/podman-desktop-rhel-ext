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
import { rm } from 'node:fs/promises';

import type * as extensionApi from '@podman-desktop/api';

import type { SubscriptionManagerClientV1 } from './rh-api/rh-api-sm';

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

export async function pullImageFromRedHatRegistry(
  rhsmClientV1: SubscriptionManagerClientV1,
  imageSha: string,
  pathToSave: string,
  logger?: extensionApi.Logger,
  token?: extensionApi.CancellationToken,
): Promise<void> {
  const controller = new AbortController();
  const signal = controller.signal;

  const redirectToImage = await rhsmClientV1.images.downloadImageUsingSha(imageSha);
  const output = fs.createWriteStream(pathToSave);
  const stream = new WritableStream({
    write(chunk): void {
      output.write(chunk);
    },
  });

  token?.onCancellationRequested(() => {
    logger?.log('Download canceled\n');
    controller.abort();
    output.close(() => {
      rm(pathToSave).catch((err: unknown) => console.error(`error removing canceled image doanloaded: ${String(err)}`));
    });
  });

  await redirectToImage.data?.pipeTo(stream, { signal });
}
