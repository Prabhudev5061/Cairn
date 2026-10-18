import { contextBridge, ipcRenderer } from 'electron';
import { AppPingResponse, CairnApi, IPC_CHANNELS } from '@shared/ipc';

const api: CairnApi = {
  ping: (): Promise<AppPingResponse> => ipcRenderer.invoke(IPC_CHANNELS.APP_PING)
};

contextBridge.exposeInMainWorld('cairn', api);
