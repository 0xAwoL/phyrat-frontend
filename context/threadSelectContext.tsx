"use client"
import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { useFlowUpload } from "@/context/flowUploadContext";

export interface ThreadInfo {
    id: string;
    label: string;
    color: string;
    description: string;
}

interface ThreadSelectContextType {
    availableThreads: ThreadInfo[];
    selectedThreadIds: Set<string>;
    toggleThread: (id: string) => void;
    selectAll: () => void;
    deselectAll: () => void;
}

const ThreadSelectContext = createContext<ThreadSelectContextType | null>(null);

export function ThreadSelectProvider({ children }: { children: ReactNode }) {
    const { rawGraph } = useFlowUpload();
    const [selectedThreadIds, setSelectedThreadIds] = useState<Set<string>>(new Set());

    // Extract available threads from the raw graph
    const availableThreads = useMemo<ThreadInfo[]>(() => {
        if (!rawGraph) return [];
        return rawGraph.nodes
            .filter((n: any) => n.type === "thread")
            .map((n: any) => ({
                id: n.data.label,
                label: n.data.label,
                color: n.data.color || "#6b7280",
                description: n.data.description || "",
            }));
    }, [rawGraph]);

    // Auto-select all threads when graph changes
    useEffect(() => {
        setSelectedThreadIds(new Set(availableThreads.map((t) => t.id)));
    }, [availableThreads]);

    const toggleThread = useCallback((id: string) => {
        setSelectedThreadIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const selectAll = useCallback(() => {
        setSelectedThreadIds(new Set(availableThreads.map((t) => t.id)));
    }, [availableThreads]);

    const deselectAll = useCallback(() => {
        setSelectedThreadIds(new Set());
    }, []);

    return (
        <ThreadSelectContext.Provider value={{ availableThreads, selectedThreadIds, toggleThread, selectAll, deselectAll }}>
            {children}
        </ThreadSelectContext.Provider>
    );
}

export function useThreadSelect() {
    const ctx = useContext(ThreadSelectContext);
    if (!ctx) {
        throw new Error("useThreadSelect must be used within a <ThreadSelectProvider>");
    }
    return ctx;
}
