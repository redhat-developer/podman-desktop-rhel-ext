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

import { EventEmitter } from 'node:events';

import * as extensionApi from '@podman-desktop/api';
import type { ClientChannel } from 'ssh2';
import { Client } from 'ssh2';
import { beforeEach, expect, test, vi } from 'vitest';

import type { MachineInfo } from './extension';
import { ProviderConnectionShellAccessImpl } from './macadam-machine-stream';

vi.mock('node:fs', () => ({ readFileSync: vi.fn() }));

vi.mock('ssh2', () => {
  const Client = vi.fn();
  Client.prototype.on = EventEmitter.prototype.on;
  Client.prototype.emit = EventEmitter.prototype.emit;
  Client.prototype.connect = vi.fn();
  Client.prototype.shell = vi.fn();
  Client.prototype.end = vi.fn();
  Client.prototype.destroy = vi.fn();
  return { Client };
});

// clients created by the shell access, in creation order
function clients(): Client[] {
  return vi.mocked(Client).mock.instances;
}

class MockStream extends EventEmitter {
  close = vi.fn();
}

// make the client ready and open a shell, returns the shell stream
function openShell(client: Client): ClientChannel {
  const stream = new MockStream() as unknown as ClientChannel;
  vi.mocked(client.shell).mockImplementation(callback => {
    callback(undefined, stream);
    return client;
  });
  client.emit('ready');
  return stream;
}

let status: extensionApi.ProviderConnectionStatus;
let shellAccess: ProviderConnectionShellAccessImpl;

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(extensionApi.EventEmitter).mockImplementation(function () {
    return { fire: vi.fn() } as unknown as extensionApi.EventEmitter<unknown>;
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  status = 'started';
  shellAccess = new ProviderConnectionShellAccessImpl({} as MachineInfo, () => status);
});

test.each<extensionApi.ProviderConnectionStatus>(['stopping', 'stopped', 'starting', 'unknown'])(
  'open does not connect when the machine is %s',
  machineStatus => {
    status = machineStatus;
    shellAccess.open();

    expect(clients()).toHaveLength(0);
  },
);

test('open closes the previous session', () => {
  shellAccess.open();
  const stream = openShell(clients()[0]);

  shellAccess.open();

  expect(stream.close).toHaveBeenCalled();
  expect(vi.mocked(Client.prototype.end).mock.contexts).toStrictEqual([clients()[0]]);
  expect(vi.mocked(Client.prototype.destroy).mock.contexts).toStrictEqual([clients()[0]]);
  expect(clients()).toHaveLength(2);
});

test('end of a replaced shell is not sent to the new session', () => {
  shellAccess.open();
  const oldStream = openShell(clients()[0]);

  shellAccess.open();
  // the old stream is closed asynchronously after the new session is opened
  oldStream.emit('close');

  expect(shellAccess.onEndEmit.fire).not.toHaveBeenCalled();
  // only the old client has been ended, when the new session was opened
  expect(Client.prototype.end).toHaveBeenCalledOnce();
});

test('shell opened by a replaced client is closed', () => {
  shellAccess.open();
  const oldClient = clients()[0];
  shellAccess.open();

  const stream = openShell(oldClient);

  expect(stream.close).toHaveBeenCalled();
});

test('error of the current session is reported when the machine is being stopped', () => {
  shellAccess.open();

  status = 'stopping';
  const error = new Error('Connection lost before handshake');
  clients()[0].emit('error', error);

  expect(console.error).toHaveBeenCalledWith(error);
  expect(shellAccess.onErrorEmit.fire).toHaveBeenCalledWith({ error: 'Connection lost before handshake' });
});

test('error of a replaced client is ignored', () => {
  shellAccess.open();
  const oldClient = clients()[0];
  shellAccess.open();

  oldClient.emit('error', new Error('Connection lost before handshake'));

  expect(console.error).not.toHaveBeenCalled();
  expect(shellAccess.onErrorEmit.fire).not.toHaveBeenCalled();
});
