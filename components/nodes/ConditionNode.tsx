import { Handle, Position } from '@xyflow/react';

export const ConditionNode = ({ data }: any) => (
    <div className="bg-yellow-50 rounded-lg border-2 border-yellow-400 shadow-sm min-w-[120px] text-xs text-center">
        <Handle type="target" position={Position.Top} className="!bg-yellow-500 !w-3 !h-3 !border-2 !border-white" />

        <div className="px-4 py-3">
            <span className="text-[10px] text-yellow-700 font-medium uppercase tracking-wide">{data.conditionType || 'if'}</span>
            <div className="text-sm font-bold text-yellow-900 mt-0.5">{data.label}</div>
        </div>

        {(data.sourceContexts?.length > 0 || data.sourceStates?.length > 0 || data.sourceProps?.length > 0) && (
            <div className="border-t border-yellow-200 px-3 py-1 text-yellow-700 text-left">
                {data.sourceContexts?.length > 0 && <div>ctx: {data.sourceContexts.join(', ')}</div>}
                {data.sourceStates?.length > 0 && <div>state: {data.sourceStates.join(', ')}</div>}
                {data.sourceProps?.length > 0 && <div>props: {data.sourceProps.join(', ')}</div>}
            </div>
        )}

        <Handle type="source" position={Position.Bottom} className="!bg-yellow-500 !w-3 !h-3 !border-2 !border-white" />
    </div>
);
