import React, { memo } from 'react';
import { Handle, Position, NodeProps, type Node } from '@xyflow/react';
import { Bot, Cpu, Zap, Settings2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export type AgentNodeData = {
  label: string;
  type: 'router' | 'worker' | 'evaluator';
  status?: 'idle' | 'running' | 'success' | 'error';
  prompt?: string;
  errors?: string[];
};

export type AgentNode = Node<AgentNodeData, 'agent'>;

const AgentNodeComponent = ({ data, selected }: NodeProps<AgentNode>) => {
  const getIcon = () => {
    switch (data.type) {
      case 'router': return <Cpu className="w-4 h-4" />;
      case 'worker': return <Bot className="w-4 h-4" />;
      case 'evaluator': return <Zap className="w-4 h-4" />;
      default: return <Settings2 className="w-4 h-4" />;
    }
  };

  const getStatusColor = () => {
    if (data.errors && data.errors.length > 0) return 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]';
    switch (data.status) {
      case 'running': return 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]';
      case 'success': return 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]';
      case 'error': return 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]';
      default: return selected ? 'border-indigo-500' : 'border-zinc-700';
    }
  };

  return (
    <div className={cn(
      "px-4 py-3 rounded-xl bg-zinc-900 border-2 transition-all duration-300 min-w-[180px] relative",
      getStatusColor()
    )}>
      {data.errors && data.errors.length > 0 && (
        <div className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center animate-bounce shadow-lg border-2 border-zinc-900">
          <span className="text-[10px] font-bold text-white">!</span>
        </div>
      )}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-4 h-4 bg-indigo-500 border-2 border-white hover:scale-125 transition-transform" 
      />
      
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-lg bg-zinc-800 text-zinc-400",
          selected && "text-indigo-400"
        )}>
          {getIcon()}
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{data.type}</p>
          <p className="text-sm font-semibold text-zinc-100">{data.label}</p>
        </div>
      </div>

      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-4 h-4 bg-indigo-500 border-2 border-white hover:scale-125 transition-transform" 
      />
    </div>
  );
};

export default memo(AgentNodeComponent);
