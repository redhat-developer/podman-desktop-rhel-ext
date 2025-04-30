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

FROM registry.access.redhat.com/ubi9/nodejs-22

USER root
RUN dnf install -y jq
USER default

COPY package.json .
COPY pnpm-lock.yaml .
COPY .npmrc .

RUN npm i -g ssh2@1.16.0 && \
    npm install --global pnpm@10 && \
    pnpm --frozen-lockfile install
