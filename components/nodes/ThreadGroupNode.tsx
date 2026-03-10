export const ThreadGroupNode = ({ data }: any) => (
    <div
        className="rounded-xl border-2 text-xs h-full w-full overflow-visible"
        style={{
            borderColor: data.color || '#6b7280',
            backgroundColor: `${data.color}08`,
        }}
    >
        <div
            className="flex items-center gap-2 px-3 py-2 rounded-t-[10px]"
            style={{ backgroundColor: `${data.color}15` }}
        >
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: data.color }} />
            <strong className="text-sm font-bold">{data.label}</strong>
            {data.description && (
                <span className="text-[10px] text-gray-500 truncate">— {data.description}</span>
            )}
        </div>
    </div>
);
