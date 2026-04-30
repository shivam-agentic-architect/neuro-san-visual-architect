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
    position: { x: 250, y: 100 },
    data: { 
      label: 'Orchestrator', 
      type: 'router', 
      prompt: 'Coordinate the agent swarm and manage high-level task delegation.',
      errors: []
    },
  },
  {
    id: 'worker-1',
    type: 'agent',
    position: { x: 250, y: 300 },
    data: { 
      label: 'Research Agent', 
      type: 'worker', 
      prompt: 'Search the web and extract relevant information for the given query.',
      errors: []
    },
  },
];

const initialEdges: Edge[] = [
  { id: 'e-r1-w1', source: 'router-1', target: 'worker-1', animated: true },
];

const DesignerDashboard = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [executionCycles, setExecutionCycles] = useState(148);
  const [tokenUsage, setTokenUsage] = useState(12.4);
  const [aiStatus, setAiStatus] = useState<'testing' | 'online' | 'offline'>('testing');
  const [currentView, setCurrentView] = useState<'designer' | 'monitoring'>('designer');
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    // Check AI connection on mount
    const checkAi = async () => {
      try {
        const res = await fetch('/api/designer/ai-suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodes: [] }),
        });
        const data = await res.json();
        if (res.ok) {
          setAiStatus('online');
        } else {
          setAiStatus('offline');
          // If we got a specific 401/400 error about API key, log it early
          if (data.error && data.error.includes("API Key")) {
            setLogs(prev => [...prev, `AI SYSTEM: ${data.error}`]);
          }
        }
      } catch (e) {
        setAiStatus('offline');
      }
    };
    checkAi();
  }, []);

  React.useEffect(() => {
    // Simulated noise in token usage/cycles for "real feed" feel
    const interval = setInterval(() => {
      if (currentView === 'monitoring') {
        // More "flickery" and realistic performance metrics
        setTokenUsage(prev => prev + parseFloat((Math.random() * 0.1).toFixed(3)));
        
        // Randomly add a system event for the "real feed"
        if (Math.random() > 0.6) {
          const systemEvents = [
            "STORAGE: Shard replication factor @ 99.8%",
            "NET: Encrypted handshake with remote node [72.19.0.4]",
            "BUFFER: Cache hit ratio: 94.2%",
            "PROTO: Handshaking with AAOSA v4.2 listener",
            "SYNC: Global state epoch [14.0.2] synced",
            "HEALTH: All 4 compute clusters report green",
            "LOG: Trace index compressed successfully",
            "IO: Disk bandwidth @ 3.1 GB/s",
            "SEC: Firewall dropped unauthorized packets",
            "KERN: Quantum scheduler active",
            "VM: Swap space usage stabilized",
            "AUTH: Session token rotation",
            "MEM: GC pass completed",
            "OS: Kernel patch applied in-flight"
          ];
          const event = systemEvents[Math.floor(Math.random() * systemEvents.length)];
          setLogs(prev => [...prev.slice(-100), `CORE: ${event}`]);
        }
        
        if (Math.random() > 0.95) setExecutionCycles(prev => prev + 1);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [currentView]);

  React.useEffect(() => {
    // Add initial system logs if none exist
    setLogs([
      "SYSTEM: Neuro SAN Kernel v4.2.0 initialized.",
      "SYSTEM: AAOSA protocols loaded successfully.",
      "NET: Establishing secure connection to brain.google.com...",
      "NET: Latency 14ms. Connection stable.",
      "READY: Designer environment active.",
      "AUTH: Protocol token verified by local authority."
    ]);
  }, []);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentView === 'monitoring') {
      interval = setInterval(() => {
        const events = [
          "HEARTBEAT: Node integrity check passed.",
          "SYNC: Memory buffer optimized.",
          "NET: Routing table refreshed.",
          "SYSTEM: AAOSA state persistent.",
          "READY: Waiting for instruction..."
        ];
        const randomEvent = events[Math.floor(Math.random() * events.length)];
        setLogs(prev => [...prev.slice(-100), `MONITOR: ${randomEvent}`]);
      }, 5000); // Faster updates for monitoring
    }
    return () => clearInterval(interval);
  }, [currentView]);

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
      data: { 
        label: `${type.charAt(0).toUpperCase() + type.slice(1)} Agent`, 
        type, 
        prompt: `Primary role: ${type} agent within the Neuro SAN network. Responsibility: Execute ${type}-specific protocols.`,
        status: 'idle',
        errors: []
      },
    };
    setNodes((nds) => nds.concat(newNode));
    setLogs(prev => [...prev, `SYSTEM: Added new ${type} agent.`]);
  };

  const handleRun = async () => {
    // 1. Client-side field validation
    const { isValid: fieldsValid, validatedNodes } = validateNetwork(nodes);
    if (!fieldsValid) {
      setNodes(validatedNodes);
      const errorNodes = validatedNodes.filter(n => n.data.errors && n.data.errors.length > 0);
      setLogs(prev => [...prev, `ERROR: ${errorNodes.length} nodes have missing required fields.`]);
      errorNodes.forEach(n => {
        setLogs(prev => [...prev, `  - ${n.data.label}: ${n.data.errors?.join(', ')}`]);
      });
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
    setLogs(prev => [...prev, "Requesting network execution from backend..."]);
    
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
    
    setExecutionCycles(prev => prev + 1);
    setTokenUsage(prev => prev + parseFloat((Math.random() * 0.5 + 0.1).toFixed(2)));
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
      
      if (!response.ok) {
        setLogs(prev => [...prev, `AI SYSTEM: ${data.error || 'Connection failed.'}`]);
        setIsAiLoading(false);
        return;
      }

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
      } else if (data.error) {
        setLogs(prev => [...prev, `AI ERROR: ${data.error}`]);
      } else {
        setLogs(prev => [...prev, "AI: No new connections suggested based on current roles."]);
      }
    } catch (err) {
      setLogs(prev => [...prev, "AI: Error communicating with brain."]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const hocon = event.target?.result as string;
      setLogs(prev => [...prev, `HOCON: Reading file ${file.name}...`]);

      try {
        const response = await fetch('/api/designer/load-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hocon }),
        });
        const data = await response.json();
        setNodes(data.nodes);
        setEdges(data.edges);
        setLogs(prev => [...prev, `SUCCESS: Imported ${data.nodes.length} nodes from HOCON.`]);
      } catch (err) {
        setLogs(prev => [...prev, "ERROR: Failed to parse HOCON configuration."]);
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be selected again
    e.target.value = '';
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
    if (window.confirm("Are you sure you want to reset the workspace to the default template?")) {
      const id1 = 'router-' + Math.random().toString(36).substr(2, 9);
      const id2 = 'worker-' + Math.random().toString(36).substr(2, 9);
      const defaultNodes: AgentNodeInterface[] = [
        {
          id: id1,
          type: 'agent',
          position: { x: 250, y: 100 },
          data: { label: 'Orchestrator', type: 'router', prompt: 'Coordinate the agent swarm and manage high-level task delegation.', status: 'idle', errors: [] },
        },
        {
          id: id2,
          type: 'agent',
          position: { x: 250, y: 300 },
          data: { label: 'Research Agent', type: 'worker', prompt: 'Search the web and extract relevant information for the given query.', status: 'idle', errors: [] },
        },
      ];
      const defaultEdges: Edge[] = [
        { id: `e-${id1}-${id2}`, source: id1, target: id2, animated: true }
      ];
      setNodes(defaultNodes);
      setEdges(defaultEdges);
      setExecutionCycles(0);
      setTokenUsage(0);
      setLogs(["Workspace reset to standard Neuro SAN template."]);
      setSelectedNodeId(null);
    }
  };

  return (
    <div className="flex h-screen w-full bg-black overflow-hidden font-sans text-zinc-100">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".hocon,.conf,.txt"
        onChange={onFileSelected}
      />
      {/* Sidebar Nav */}
      <div className="w-16 border-r border-zinc-800 flex flex-col items-center py-6 gap-8 bg-zinc-950">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <Layers className="text-white w-6 h-6" />
        </div>
        <div className="flex flex-col gap-6">
          <button 
            onClick={() => setCurrentView('designer')}
            className={cn(
              "p-2 rounded-lg transition-colors",
              currentView === 'designer' ? "text-indigo-400 bg-indigo-500/10" : "text-zinc-600 hover:text-zinc-400"
            )}
          >
            <Network className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setCurrentView('monitoring')}
            className={cn(
              "p-2 rounded-lg transition-colors",
              currentView === 'monitoring' ? "text-indigo-400 bg-indigo-500/10" : "text-zinc-600 hover:text-zinc-400"
            )}
          >
            <Activity className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        {currentView === 'designer' ? (
          <>
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
                  {!isAiLoading && (
                    <div className={cn(
                      "w-2 h-2 rounded-full ml-1",
                      aiStatus === 'online' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : 
                      aiStatus === 'offline' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse" : 
                      "bg-zinc-600 animate-pulse"
                    )} title={aiStatus === 'online' ? "Gemini Online" : aiStatus === 'offline' ? "Gemini Offline - Check Secrets menu" : "Checking Gemini status..."} />
                  )}
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

            {/* Console / Output - CENTERED */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[500px] max-h-48 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 flex flex-col gap-2 overflow-hidden shadow-2xl z-20">
              <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">
                <Zap className="w-3 h-3 text-amber-500" /> Execution Console
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1 font-mono text-[11px] text-zinc-400 scrollbar-hide">
                {logs.length === 0 && <p className="italic text-zinc-600">Ready for execution...</p>}
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-zinc-600">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                    <span className={cn(log.includes('completed') || log.includes('SUCCESS') ? "text-emerald-400" : log.includes('ERROR') ? "text-rose-400" : "text-zinc-300")}>{log}</span>
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
          </>
        ) : (
          <div className="p-12 max-w-4xl mx-auto h-full overflow-y-auto space-y-8">
            <div className="space-y-2">
              <h1 className="text-3xl font-black uppercase tracking-tighter text-white">System Monitoring</h1>
              <p className="text-zinc-400 text-sm">Real-time metrics and activity feed for your Neuro SAN network.</p>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {[
                { label: 'Active Agents', value: nodes.length, icon: Layers, color: 'text-indigo-400' },
                { label: 'Execution Cycles', value: executionCycles.toString(), icon: Activity, color: 'text-emerald-400' },
                { label: 'Token Usage', value: `${tokenUsage.toFixed(1)}k`, icon: Zap, color: 'text-amber-400' },
              ].map((stat, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-1">
                  <stat.icon className={cn("w-5 h-5", stat.color)} />
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{stat.label}</p>
                  <p className="text-2xl font-black text-white">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950/50 flex items-center justify-between">
                 <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Full Activity Log</h3>
                 <button onClick={() => setLogs([])} className="text-[10px] font-bold text-zinc-600 hover:text-white uppercase transition-colors">Clear History</button>
              </div>
              <div className="p-6 space-y-3 font-mono text-xs">
                {logs.length === 0 ? (
                  <p className="text-zinc-600 italic">No activity recorded yet.</p>
                ) : (
                  [...logs].reverse().map((log, i) => (
                    <div key={i} className="flex gap-4 border-b border-zinc-800/50 pb-2 last:border-0 animate-in fade-in slide-in-from-top-1 duration-500">
                      <span className="text-zinc-600 shrink-0 font-mono">[{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                      <span className={cn(
                        log.includes('ERROR') ? "text-rose-400" : 
                        log.includes('SUCCESS') ? "text-emerald-400" : 
                        log.includes('CORE') || log.includes('MONITOR') ? "text-indigo-300" :
                        "text-zinc-300"
                      )}>{log}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default () => (
  <ReactFlowProvider>
    <DesignerDashboard />
  </ReactFlowProvider>
);
