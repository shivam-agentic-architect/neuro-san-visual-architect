import React, { useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Plus,
  Download,
  Upload,
  Zap,
  Layers,
  Network,
  Activity,
  RotateCcw,
} from 'lucide-react';
import AgentNode, { AgentNodeData, AgentNode as AgentNodeInterface } from './AgentNode';
import ConfigPanel from './ConfigPanel';
import { cn } from '@/src/lib/utils';
// import { suggestConnections } from '@/src/services/aiSuggestionService'; // Removed as moved to backend

const nodeTypes = {
  agent: AgentNode,
};

const initialNodes: AgentNodeInterface[] = [
  {
    id: 'router-1',
    type: 'agent',
    position: { x: 250, y: 50 },
    data: { label: 'Orchestrator', type: 'router', prompt: 'You are the central orchestrator of the Neuro SAN network.' },
  },
  {
    id: 'worker-1',
    type: 'agent',
    position: { x: 100, y: 200 },
    data: { label: 'Data Extractor', type: 'worker', prompt: 'Extract technical requirements from user query.' },
  },
  {
    id: 'worker-2',
    type: 'agent',
    position: { x: 400, y: 200 },
    data: { label: 'Code Gen', type: 'worker', prompt: 'Generate TypeScript code based on requirements.' },
  },
];

const initialEdges: Edge[] = [
  { id: 'e-r1-w1', source: 'router-1', target: 'worker-1', animated: true },
  { id: 'e-r1-w2', source: 'router-1', target: 'worker-2', animated: true },
];

const DesignerDashboard = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const selectedNode = useMemo(() => 
    nodes.find(n => n.id === selectedNodeId) as { id: string, data: AgentNodeData } | undefined
  , [nodes, selectedNodeId]);

  const validateNetwork = useCallback((currentNodes: AgentNodeInterface[]) => {
    let isValid = true;
    const validatedNodes = currentNodes.map(node => {
      const errors: string[] = [];
      if (!node.data.label) errors.push('Agent name is required');
      if (!node.data.prompt) errors.push('System prompt is required');
      if (errors.length > 0) isValid = false;
      return { ...node, data: { ...node.data, errors } };
    });
    return { isValid, validatedNodes };
  }, []);

  const updateNodeData = useCallback((id: string, newData: Partial<AgentNodeData>) => {
    setNodes((nds) => {
      const updatedNodes = nds.map((node) => {
        if (node.id === id) {
          const updatedNode = { ...node, data: { ...node.data, ...newData } };
          // Immediate partial validation for the updated node
          const errors: string[] = [];
          if (!updatedNode.data.label) errors.push('Agent name is required');
          if (!updatedNode.data.prompt) errors.push('System prompt is required');
          updatedNode.data.errors = errors;
          return updatedNode;
        }
        return node;
      });
      return updatedNodes;
    });
  }, [setNodes]);

  const deleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedNodeId(null);
  }, [setNodes, setEdges]);

  const addAgent = (type: 'router' | 'worker' | 'evaluator') => {
    const id = `${type}-${Date.now()}`;
    const newNode: AgentNodeInterface = {
      id,
      type: 'agent',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label: `New ${type}`, type, prompt: '', errors: ['Agent name is required', 'System prompt is required'] },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const handleRun = async () => {
    // 1. Client-side field validation
    const { isValid: fieldsValid, validatedNodes } = validateNetwork(nodes);
    if (!fieldsValid) {
      setNodes(validatedNodes);
      setLogs(prev => [...prev, "ERROR: Missing required fields in nodes."]);
      return;
    }

    // 2. Server-side DAG validation
    const valResponse = await fetch('/api/designer/validate-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes, edges }),
    });
    const valData = await valResponse.json();
    if (!valData.valid) {
      setLogs(prev => [...prev, ...valData.errors.map((e: string) => `DAG ERROR: ${e}`)]);
      return;
    }

    setIsExecuting(true);
    setLogs(["Requesting network execution from backend..."]);
    
    const response = await fetch('/api/designer/run-network', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes, edges }),
    });
    const data = await response.json();

    // 3. Process Execution Trace
    for (const step of data.trace) {
      setLogs(prev => [...prev, `${step.step}: ${step.message}`]);
      if (step.nodeId) {
        updateNodeData(step.nodeId, { status: 'running' });
        await new Promise(r => setTimeout(r, 800));
        updateNodeData(step.nodeId, { status: 'success' });
      } else {
        await new Promise(r => setTimeout(r, 400));
      }
    }
    
    setIsExecuting(false);
  };

  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleAiSuggest = async () => {
    setIsAiLoading(true);
    setLogs(prev => [...prev, "AI: Analyzing agent capabilities via backend..."]);
    
    try {
      const response = await fetch('/api/designer/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes }),
      });
      const data = await response.json();
      const suggestions = data.suggestions;

      if (suggestions && suggestions.length > 0) {
        setEdges(prev => {
          const newEdges = [...prev];
          suggestions.forEach((s: any) => {
            if (!newEdges.find(e => e.source === s.source && e.target === s.target)) {
              newEdges.push({ 
                id: `ai-${s.source}-${s.target}`, 
                source: s.source, 
                target: s.target, 
                animated: true,
                style: { stroke: '#fbbf24', strokeWidth: 2 } 
              });
            }
          });
          return newEdges;
        });
        setLogs(prev => [...prev, `AI: Suggested ${suggestions.length} new connections.`]);
      } else {
        setLogs(prev => [...prev, "AI: No new connections suggested. (Check GEMINI_API_KEY)"]);
      }
    } catch (err) {
      setLogs(prev => [...prev, "AI: Error communicating with brain."]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleImport = async () => {
    // Simulate file picking
    const hocon = `agents { demo { label = "Demo" } }`;
    const response = await fetch('/api/designer/load-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hocon }),
    });
    const data = await response.json();
    setNodes(data.nodes);
    setEdges(data.edges);
    setLogs(prev => [...prev, "HOCON: Imported network successfully."]);
  };
  const exportHOCON = async () => {
    const response = await fetch('/api/designer/generate-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes, edges }),
    });
    const data = await response.json();
    const blob = new Blob([data.hocon], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config.hocon';
    a.click();
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to clear the entire workspace?")) {
      setNodes([]);
      setEdges([]);
      setLogs([]);
      setSelectedNodeId(null);
    }
  };

  return (
    <div className="flex h-screen w-full bg-black overflow-hidden font-sans text-zinc-100">
      {/* Sidebar Nav */}
      <div className="w-16 border-r border-zinc-800 flex flex-col items-center py-6 gap-8 bg-zinc-950">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <Layers className="text-white w-6 h-6" />
        </div>
        <div className="flex flex-col gap-6 text-zinc-600">
          <Network className="w-6 h-6 hover:text-indigo-400 cursor-pointer transition-colors" />
          <Activity className="w-6 h-6 hover:text-indigo-400 cursor-pointer transition-colors" />
        </div>
      </div>

      <div className="flex-1 relative">
        {/* Header toolbar */}
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10 pointer-events-none">
          <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 p-1.5 rounded-2xl flex gap-1 pointer-events-auto shadow-2xl">
            <button onClick={() => addAgent('router')} className="p-2.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-indigo-400 transition-all flex items-center gap-2 text-sm font-bold pr-4">
              <Plus className="w-4 h-4" /> Router
            </button>
            <div className="w-[1px] bg-zinc-800 my-2" />
            <button onClick={() => addAgent('worker')} className="p-2.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-indigo-400 transition-all flex items-center gap-2 text-sm font-bold pr-4">
              <Plus className="w-4 h-4" /> Worker
            </button>
          </div>

          <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 p-1.5 rounded-2xl flex gap-1 pointer-events-auto shadow-2xl">
            <button 
              onClick={handleAiSuggest} 
              disabled={isAiLoading}
              className={cn(
                "p-2.5 rounded-xl transition-all flex items-center gap-2 text-sm font-bold px-4",
                isAiLoading ? "opacity-50 cursor-not-allowed bg-zinc-800" : "hover:bg-zinc-800 text-zinc-400 hover:text-indigo-400"
              )}
            >
              <Zap className={cn("w-4 h-4 text-amber-500", isAiLoading && "animate-pulse")} /> 
              {isAiLoading ? "AI Thinking..." : "AI Auto-Connect"}
            </button>
            <div className="w-[1px] bg-zinc-800 my-2" />
            <button onClick={handleReset} className="p-2.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 transition-all flex items-center gap-2 text-sm font-bold px-4">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
            <div className="w-[1px] bg-zinc-800 my-2" />
            <button onClick={exportHOCON} className="p-2.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 transition-all flex items-center gap-2 text-sm font-bold px-4">
              <Download className="w-4 h-4" /> Export HOCON
            </button>
            <button onClick={handleImport} className="p-2.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 transition-all flex items-center gap-2 text-sm font-bold px-4">
              <Upload className="w-4 h-4" /> Import
            </button>
          </div>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          fitView
          colorMode="dark"
          style={{ background: '#09090b' }}
        >
          <Background color="#18181b" variant="dots" gap={20} size={1} />
          <Controls className="bg-zinc-900 border-zinc-800 fill-zinc-100" />
          <MiniMap className="bg-zinc-900/80 border border-zinc-800" nodeColor="#3f3f46" maskColor="rgba(0,0,0,0.5)" />
        </ReactFlow>

        {/* Console / Output */}
        <div className="absolute bottom-6 left-4 w-96 max-h-48 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 flex flex-col gap-2 overflow-hidden shadow-2xl">
          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">
            <Zap className="w-3 h-3 text-amber-500" /> Execution Console
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1 font-mono text-[11px] text-zinc-400 scrollbar-hide">
            {logs.length === 0 && <p className="italic text-zinc-600">Ready for execution...</p>}
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-zinc-600">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                <span className={cn(log.includes('completed') ? "text-emerald-400" : "text-zinc-300")}>{log}</span>
              </div>
            ))}
          </div>
        </div>

        <ConfigPanel
          selectedNode={selectedNode || null}
          onUpdate={updateNodeData}
          onDelete={deleteNode}
          onClose={() => setSelectedNodeId(null)}
          onRun={handleRun}
          isExecuting={isExecuting}
        />
      </div>
    </div>
  );
};

export default () => (
  <ReactFlowProvider>
    <DesignerDashboard />
  </ReactFlowProvider>
);
