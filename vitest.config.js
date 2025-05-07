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

import path from 'node:path';

const excludeArray = [
  'tests/playwright/**', '**/builtin/**',
  '**/node_modules/**',
  '**/dist/**',
  '**/.{idea,git,cache,output,temp,cdix}/**',
  '**/{.electron-builder,babel,changelog,docusaurus,jest,postcss,prettier,rollup,svelte,tailwind,vite,vitest*,webpack}.config.*',];
  
const config = {
  test: {
    exclude: excludeArray,
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'text'],
      extension: '.ts',
    },
  },
  resolve: {
    alias: {
      '@podman-desktop/api': path.resolve(__dirname, '__mocks__/@podman-desktop/api.js'),
    },
  },
};

export default config;