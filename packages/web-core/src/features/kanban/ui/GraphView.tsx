import { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  NodeProps,
  Handle,
  Position,
  Node,
  Edge,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useProjectContext } from '@/shared/hooks/useProjectContext';
import { useAppNavigation } from '@/shared/hooks/useAppNavigation';
import { KanbanCardContent } from '@vibe/ui/components/KanbanCardContent';
import { getLayoutedElements } from '@/shared/lib/layoutGraph';
import { resolveRelationshipsForIssue } from '@/shared/lib/resolveRelationships';

function TaskNodeComponent({ data }: NodeProps) {
  return (
    <div className="bg-primary border border-brand/20 rounded-md shadow-sm w-[300px]">
      <Handle type="target" position={Position.Top} className="!bg-brand" />
      <KanbanCardContent
        displayId={data.simpleId as string}
        title={data.title as string}
        description={data.description as string | null}
        priority={data.priority as any}
        tags={data.tags as any}
        assignees={data.assignees as any}
        pullRequests={data.pullRequests as any}
        relationships={data.relationships as any}
        isSubIssue={data.isSubIssue as boolean}
        isMobile={false}
        onPriorityClick={() => {}}
        onAssigneeClick={() => {}}
        onMoreActionsClick={() => {}}
      />
      <Handle type="source" position={Position.Bottom} className="!bg-brand" />
    </div>
  );
}

const nodeTypes = {
  task: TaskNodeComponent,
};

export function GraphView({}: { selectedKanbanIssueId?: string | null }) {
  const {
    projectId,
    issues,
    issueRelationships,
    issuesById,
    getTagObjectsForIssue,
    getRelationshipsForIssue,
  } = useProjectContext();

  const appNavigation = useAppNavigation();

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      appNavigation.goToProjectIssue(projectId, node.id);
    },
    [appNavigation, projectId]
  );

  const initialNodesAndEdges = useMemo(() => {
    const rawNodes: Node[] = issues.map((issue) => ({
      id: issue.id,
      type: 'task',
      position: { x: 0, y: 0 },
      data: {
        simpleId: issue.simple_id,
        title: issue.title,
        description: issue.description,
        priority: issue.priority,
        tags: getTagObjectsForIssue(issue.id),
        assignees: [], // We can wire assigneeMap later if needed, but for view-only it's fine
        pullRequests: [],
        relationships: resolveRelationshipsForIssue(
          issue.id,
          getRelationshipsForIssue(issue.id),
          issuesById
        ),
        isSubIssue: !!issue.parent_issue_id,
      },
    }));

    const rawEdges: Edge[] = issueRelationships
      .filter((rel) => rel.relationship_type === 'blocking')
      .map((rel) => ({
        id: rel.id,
        source: rel.issue_id,
        target: rel.related_issue_id,
        type: 'smoothstep',
        animated: true,
        style: { stroke: 'hsl(var(--brand))', strokeWidth: 2 },
      }));

    return getLayoutedElements(rawNodes, rawEdges, 'TB');
  }, [
    issues,
    issueRelationships,
    getTagObjectsForIssue,
    getRelationshipsForIssue,
    issuesById,
  ]);

  const [nodes, _setNodes, onNodesChange] = useNodesState(
    initialNodesAndEdges.nodes
  );
  const [edges, _setEdges, onEdgesChange] = useEdgesState(
    initialNodesAndEdges.edges
  );

  return (
    <div className="w-full h-full min-h-[600px] border border-border rounded-md overflow-hidden bg-secondary/30">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-right"
        >
          <MiniMap
            className="!bg-primary !border-border !border"
            maskColor="hsl(var(--brand) / 0.1)"
          />
          <Controls className="!bg-primary !border-border !fill-high !text-high" />
          <Background color="hsl(var(--low))" gap={16} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
