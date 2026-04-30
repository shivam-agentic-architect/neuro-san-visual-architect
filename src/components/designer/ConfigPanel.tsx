import React from 'react';
import { X, Play, Save, Trash2, Terminal, Activity } from 'lucide-react';
import { AgentNodeData } from './AgentNode';
import { cn } from '@/src/lib/utils';

type ConfigPanelProps = {
  selectedNode: { id: string, data: AgentNodeData } | null;
  onUpdate: (id: string, data: Partial<AgentNodeData>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onRun: () => void;
  isExecuting?: boolean;
};

const ConfigPanel = ({ selectedNode, onUpdate, onDelete, onClose, onRun, isExecuting }: ConfigPanelProps) => {
  if (!selectedNode) return null;

  return (
    <div className="absolute top-4 right-4 bottom-4 w-96 bg-zinc-950/90 backdrop-blur-md border border-zinc-800 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-tighter">Agent Config</h2>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-zinc-500 uppercase">Agent Name</label>
            {!selectedNode.data.label && <span className="text-[10px] text-rose-500 font-bold uppercase">Required</span>}
          </div>
          <input
            type="text"
            value={selectedNode.data.label}
            onChange={(e) => onUpdate(selectedNode.id, { label: e.target.value })}
            className={cn(
              "w-full bg-zinc-900 border rounded-lg px-4 py-2 text-zinc-100 focus:ring-1 focus:ring-indigo-500 outline-none transition-all",
              !selectedNode.data.label ? "border-rose-500/50" : "border-zinc-800"
            )}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-500 uppercase">Type</label>
          <select
            value={selectedNode.data.type}
            onChange={(e) => onUpdate(selectedNode.id, { type: e.target.value as any })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
          >
            <option value="router">Router (AAOSA)</option>
            <option value="worker">Worker</option>
            <option value="evaluator">Evaluator</option>
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-zinc-500 uppercase">System Prompt</label>
            {!selectedNode.data.prompt && <span className="text-[10px] text-rose-500 font-bold uppercase">Required</span>}
          </div>
          <textarea
            value={selectedNode.data.prompt || ''}
            onChange={(e) => onUpdate(selectedNode.id, { prompt: e.target.value })}
            placeholder="Describe what this agent should do..."
            rows={6}
            className={cn(
              "w-full bg-zinc-900 border rounded-lg px-4 py-2 text-zinc-100 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none text-sm leading-relaxed",
              !selectedNode.data.prompt ? "border-rose-500/50" : "border-zinc-800"
            )}
          />
        </div>

        {selectedNode.data.errors && selectedNode.data.errors.length > 0 && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 space-y-1">
            <p className="text-[10px] font-bold text-rose-500 uppercase flex items-center gap-1">
              <X className="w-3 h-3" /> Fix required fields
            </p>
            <ul className="text-xs text-rose-400 list-disc list-inside">
              {selectedNode.data.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="pt-4 border-t border-zinc-800">
          <p className="text-[10px] text-zinc-500 mb-4 leading-relaxed uppercase tracking-widest font-medium">Advanced settings are configured via HOCON export.</p>
          <button 
            onClick={() => onDelete(selectedNode.id)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition-all text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" /> Delete Agent
          </button>
        </div>
      </div>

      <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex gap-2">
        <button 
          onClick={onRun}
          disabled={isExecuting}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-bold shadow-lg",
            isExecuting 
              ? "bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none" 
              : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20"
          )}
        >
          {isExecuting ? <Activity className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
          {isExecuting ? "Executing..." : "Run Network"}
        </button>
        <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg transition-all text-sm font-bold">
          <Save className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ConfigPanel;
