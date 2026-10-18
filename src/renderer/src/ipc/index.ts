import { AppPingResponse } from '@shared/ipc';

export async function pingApp(): Promise<AppPingResponse> {
  return window.cairn.ping();
}
