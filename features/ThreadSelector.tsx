"use client"
import { useThreadSelect } from "@/context/threadSelectContext";

const ThreadSelector = () => {
    const { availableThreads, selectedThreadIds, toggleThread, selectAll, deselectAll } = useThreadSelect();

    if (availableThreads.length === 0) return null;

    const allSelected = selectedThreadIds.size === availableThreads.length;
    const noneSelected = selectedThreadIds.size === 0;

    return (
        <div className="flex flex-col p-4 border-t">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-700">Threads</h3>
                <button
                    onClick={allSelected ? deselectAll : selectAll}
                    className="text-[10px] font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                    {allSelected ? "Deselect All" : "Select All"}
                </button>
            </div>

            <div className="flex flex-col gap-1.5">
                {availableThreads.map((thread) => {
                    const isSelected = selectedThreadIds.has(thread.id);
                    return (
                        <label
                            key={thread.id}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-xs ${isSelected ? "bg-gray-50" : "opacity-50 hover:opacity-75"
                                }`}
                        >
                            <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleThread(thread.id)}
                                className="sr-only"
                            />
                            <span
                                className={`w-3 h-3 rounded-full shrink-0 border-2 transition-all ${isSelected ? "border-transparent" : "border-gray-300 bg-transparent"
                                    }`}
                                style={isSelected ? { backgroundColor: thread.color } : {}}
                            />
                            <div className="flex flex-col min-w-0">
                                <span className="font-semibold truncate">{thread.label}</span>
                                {thread.description && (
                                    <span className="text-[10px] text-gray-400 truncate">{thread.description}</span>
                                )}
                            </div>
                        </label>
                    );
                })}
            </div>
        </div>
    );
};

export default ThreadSelector;