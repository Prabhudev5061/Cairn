import { CairnApi } from '../shared/ipc';

declare global {
  interface Window {
    cairn: CairnApi;
  }
}
