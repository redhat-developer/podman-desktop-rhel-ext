/**********************************************************************
 * Copyright (C) 2024-2025 Red Hat, Inc.
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
/* eslint-disable @typescript-eslint/explicit-function-return-type */

import type { Client } from 'openapi-fetch';
import createClient from 'openapi-fetch';

import type { paths } from '../../src-gen/subscription-v1';

export const REGISTRY_REDHAT_IO = 'registry.redhat.io';

class ClientHolder<T extends object> {
  protected client: Client<T>;
  constructor(client: Client<T>, token?: string) {
    this.client = client;
    if (token) {
      this.client.use({
        onRequest({ request }) {
          request.headers.set('Authorization', `Bearer ${token}`);
          return request;
        },
      });
    }
  }
}

export class Images extends ClientHolder<paths> {
  downloadImageUsingSha(checksum: string) {
    return this.client.GET('/images/{checksum}/download', {
      params: {
        path: {
          checksum,
        },
      },
      parseAs: 'stream',
    });
  }
}

export class SubscriptionManagerClientV1 extends ClientHolder<paths> {
  images: Images;
  constructor(options: { BASE: string; TOKEN: string }) {
    super(createClient<paths>({ baseUrl: options.BASE }), options.TOKEN);
    this.images = new Images(this.client);
  }
}
