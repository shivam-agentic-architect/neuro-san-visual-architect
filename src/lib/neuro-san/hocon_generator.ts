import { Node, Edge } from '@xyflow/react';
import { AgentNodeData } from '@/src/components/designer/AgentNode';

export interface NeuroSANConfig {
  agents: Record<string, any>;
  workflows: any[];
  tools: Record<string, any>;
}

export function generateHOCON(nodes: Node<AgentNodeData>[], edges: Edge[]): string {
  const agents = nodes.filter(n => n.type === 'agent');
  
  let hocon = `// Neuro SAN Studio Designer Export
// Generated: ${new Date().toISOString()}

agents {
`;

  agents.forEach(node => {
    hocon += `  ${node.id} {
    label = "${node.data.label}"
    type = "${node.data.type}"
    prompt = """
${node.data.prompt || 'Default system prompt for ' + node.data.label}
"""
    capabilities = [${node.data.type === 'router' ? '"routing", "orchestration"' : '"execution"'}]
    
    // Connections
    outputs = [${edges.filter(e => e.source === node.id).map(e => `"${e.target}"`).join(', ')}]
  }
`;
  });

  hocon += `}

workflows {
  main {
    entry_point = "${nodes.find(n => n.data.type === 'router')?.id || nodes[0]?.id}"
    pattern = "AAOSA"
  }
}

tools {
  // Built-in tools enabled by default
  web_search {
    enabled = true
  }
}
`;

  return hocon;
}

export function parseHOCON(hocon: string) {
  // Simplistic parser for demo purposes
  // In a real scenario, use a library or more robust regex
  console.log("Parsing HOCON:", hocon);
  return { nodes: [], edges: [] };
}
