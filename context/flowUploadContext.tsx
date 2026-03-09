"use client"
import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction } from "react";

export interface RawGraph {
    nodes: any[];
    edges: any[];
}

interface FlowUploadContextType {
    rawGraph: RawGraph | null;
    setRawGraph: Dispatch<SetStateAction<RawGraph | null>>;
    loading: boolean;
    setLoading: Dispatch<SetStateAction<boolean>>;
}

const FlowUploadContext = createContext<FlowUploadContextType | null>(null);

export function FlowUploadProvider({ children }: { children: ReactNode }) {
    const [rawGraph, setRawGraph] = useState<RawGraph | null>(null);
    const [loading, setLoading] = useState(false);

    return (
        <FlowUploadContext.Provider value={{ rawGraph, setRawGraph, loading, setLoading }}>
            {children}
        </FlowUploadContext.Provider>
    );
}

export function useFlowUpload() {
    const ctx = useContext(FlowUploadContext);
    if (!ctx) {
        throw new Error("useFlowUpload must be used within a <FlowUploadProvider>");
    }
    return ctx;
}
