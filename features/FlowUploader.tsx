"use client"
import { useFlowUpload } from "@/context/flowUploadContext";

const FlowUploader = () => {
    const { setRawGraph, setLoading } = useFlowUpload();

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);

                if (!json.nodes || !json.edges) {
                    alert("Invalid graph JSON format — needs nodes and edges");
                    setLoading(false);
                    return;
                }

                setRawGraph(json);
                setLoading(false);

            } catch (err) {
                alert("Error parsing JSON file");
                setLoading(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="flex flex-col bg-white/90 p-4 shadow border backdrop-blur">
            <h2 className="text-xs font-bold mb-2">Frontend Tree Logic Graph</h2>
            <p className="text-xs text-gray-500 mb-4">Upload <code>reactflow-graph.json</code> to visualize.</p>
            <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
        </div>
    )
}

export default FlowUploader;