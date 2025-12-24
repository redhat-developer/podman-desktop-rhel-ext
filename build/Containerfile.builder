#
# Copyright (C) 2025 Red Hat, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# SPDX-License-Identifier: Apache-2.0

# v10.1-1766363988
FROM registry.access.redhat.com/ubi10/nodejs-24@sha256:5a3cea874f0555bcde27d979bbc8a067f1d75b4b324ef3274112c8270e951f5b
USER root
RUN dnf install -y jq
USER default

COPY package.json .
COPY pnpm-lock.yaml .
COPY pnpm-workspace.yaml .
COPY tests/playwright/package.json tests/playwright/package.json
COPY .npmrc .npmrc

RUN PNPM_VERSION=$(cat package.json | jq .packageManager | sed -E 's|.*pnpm@([0-9.]+).*|\1|') && \
    echo Installing pnpm version ${PNPM_VERSION} && \
    npm install --global pnpm@${PNPM_VERSION} && \
    pnpm --frozen-lockfile install
