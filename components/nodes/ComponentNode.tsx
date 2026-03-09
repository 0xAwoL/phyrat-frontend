import { Handle, Position } from '@xyflow/react';

export const ComponentNode = ({ data }: any) => (
    <div className="bg-white rounded-lg border-2 border-blue-300 shadow-md min-w-[220px] max-w-[280px] text-xs">
        <Handle type="target" position={Position.Top} className="!bg-blue-400 !w-3 !h-3 !border-2 !border-white" />

        <div className={`flex items-center gap-2 px-3 py-2 rounded-t-md ${data.isServer ? 'bg-indigo-50 border-b border-indigo-200' : 'bg-amber-50 border-b border-amber-200'}`}>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${data.isServer ? 'bg-indigo-200 text-indigo-800' : 'bg-amber-200 text-amber-800'}`}>
                {data.isServer ? 'Server' : 'Client'}
            </span>
            <strong className="text-sm font-bold truncate">{data.label}</strong>
        </div>

        {data.summary && (
            <p className="px-3 py-1.5 text-gray-600 leading-snug border-b border-gray-100">{data.summary}</p>
        )}

        <div className="flex gap-3 px-3 py-1.5 text-gray-500">
            {data.stateCount > 0 && <span>🗂 {data.stateCount} state{data.stateCount > 1 ? 's' : ''}</span>}
            {data.contextCount > 0 && <span>🔗 {data.contextCount} ctx</span>}
            {data.requestCount > 0 && <span>📡 {data.requestCount} req</span>}
        </div>

        {data.contexts?.length > 0 && (
            <div className="px-3 py-1 border-t border-gray-100 text-gray-500">
                ctx: {data.contexts.join(', ')}
            </div>
        )}

        <Handle type="source" position={Position.Bottom} className="!bg-blue-400 !w-3 !h-3 !border-2 !border-white" />
    </div>
);
