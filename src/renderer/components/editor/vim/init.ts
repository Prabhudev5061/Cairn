import { Vim } from '@replit/codemirror-vim';
import { useVaultStore } from '../../../stores/vaultStore';

let isInitialized = false;

export function initVimCommands(): void {
  if (isInitialized) return;
  isInitialized = true;

  // :w / :write
  Vim.defineEx('write', 'w', () => {
    void useVaultStore.getState().saveActiveNote();
  });

  // :q / :quit
  Vim.defineEx('quit', 'q', (_cm, params) => {
    const isDirty = useVaultStore.getState().isDirty;
    const isForce = Boolean(params?.args && params.args.includes('!'));

    if (isDirty && !isForce) {
      useVaultStore.setState({
        conflictBanner: 'No write since last change (add ! to override)'
      });
      return;
    }

    useVaultStore.getState().closeActiveNote();
  });

  // :wq
  Vim.defineEx('wq', 'wq', () => {
    void (async () => {
      await useVaultStore.getState().saveActiveNote();
      useVaultStore.getState().closeActiveNote();
    })();
  });

  // :x
  Vim.defineEx('x', 'x', () => {
    void (async () => {
      await useVaultStore.getState().saveActiveNote();
      useVaultStore.getState().closeActiveNote();
    })();
  });
}
