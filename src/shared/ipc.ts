export type IpcResult<T> = { ok: true; value: T } | { ok: false; error: string };

export interface AppPingPayload {
  version: string;
  platform: string;
}

export type AppPingResponse = IpcResult<AppPingPayload>;

export const IPC_CHANNELS = {
  APP_PING: 'app:ping'
} as const;

export interface CairnApi {
  ping: () => Promise<AppPingResponse>;
}
