import { useMemo } from 'react';
import type { ToolDefinitionView } from '../../api/types.js';
import './ToolPopover.css';

export function ToolPopover({
  tools,
  allowTools,
  allowCommands,
  onChange
}: {
  tools: ToolDefinitionView[];
  allowTools: string[];
  allowCommands: string[];
  onChange(tools: string[], commands: string[]): void;
}) {
  const commandText = useMemo(() => allowCommands.join('\n'), [allowCommands]);

  function toggleTool(tool: string) {
    const nextTools = allowTools.includes(tool)
      ? allowTools.filter((item) => item !== tool)
      : [...allowTools, tool];
    onChange(nextTools, allowCommands);
  }

  return (
    <div className="tool-popover">
      <div className="popover-title">Allowed tools</div>
      <div className="tool-list">
        {tools.map((tool) => (
          <label className="tool-row" key={tool.name}>
            <input type="checkbox" checked={allowTools.includes(tool.name)} onChange={() => toggleTool(tool.name)} />
            <span>
              <strong>{tool.name}</strong>
              <small>{tool.description}</small>
            </span>
          </label>
        ))}
      </div>
      <label className="command-allow">
        <span>Allowed commands</span>
        <textarea
          value={commandText}
          placeholder={'pnpm *\ngit status'}
          onChange={(event) => onChange(allowTools, parseAllowCommands(event.target.value))}
        />
      </label>
    </div>
  );
}

function parseAllowCommands(value: string): string[] {
  return value.split('\n').map((line) => line.trim()).filter(Boolean);
}
