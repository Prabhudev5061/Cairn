export interface Command {
  id: string;
  title: string;
  category?: string;
  description?: string;
  keys?: string;
  run: () => void | Promise<void>;
}

class CommandRegistry {
  private commands = new Map<string, Command>();

  register(cmd: Command): () => void {
    this.commands.set(cmd.id, cmd);
    return () => {
      this.commands.delete(cmd.id);
    };
  }

  get(id: string): Command | undefined {
    return this.commands.get(id);
  }

  getAll(): Command[] {
    return Array.from(this.commands.values());
  }

  execute(id: string): void {
    const cmd = this.commands.get(id);
    if (cmd) {
      void cmd.run();
    }
  }

  handleKeyDown(event: KeyboardEvent): boolean {
    const isMod = event.ctrlKey || event.metaKey;
    const isShift = event.shiftKey;
    const isAlt = event.altKey;
    const key = event.key.toLowerCase();

    for (const cmd of this.commands.values()) {
      if (!cmd.keys) continue;

      const parts = cmd.keys.toLowerCase().split('+');
      const reqMod = parts.includes('mod') || parts.includes('ctrl') || parts.includes('cmd');
      const reqShift = parts.includes('shift');
      const reqAlt = parts.includes('alt');
      const targetKey = parts.find((p) => p !== 'mod' && p !== 'ctrl' && p !== 'cmd' && p !== 'shift' && p !== 'alt');

      if (
        isMod === reqMod &&
        isShift === reqShift &&
        isAlt === reqAlt &&
        key === targetKey
      ) {
        event.preventDefault();
        event.stopPropagation();
        void cmd.run();
        return true;
      }
    }
    return false;
  }
}

export const commandRegistry = new CommandRegistry();
