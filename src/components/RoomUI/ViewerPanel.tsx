"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LayoutResponse } from "@/types/models";
import RoomViewer from "@/components/Three/RoomViewer";

/**
 * Renders the 3D viewer and listens for layout:update events to keep it in sync.
 */
export default function ViewerPanel() {
    const [layout, setLayout] = useState<LayoutResponse | undefined>(undefined);

    useEffect(() => {
        const onUpdate = (e: Event) => {
            try {
                
                const data = (e as CustomEvent).detail as LayoutResponse;
                if (data && typeof data === "object") setLayout(data);
            } catch (err) {
                console.warn("[ViewerPanel] layout:update event parse error", err);
            }
        };
        window.addEventListener("layout:update", onUpdate as EventListener);
        return () => window.removeEventListener("layout:update", onUpdate as EventListener);
    }, []);

    return (
        <Card className="h-full border-white/10 bg-white/5 text-slate-100 backdrop-blur-xl">
            <CardHeader>
                <CardTitle className="bg-gradient-to-r from-cyan-200 to-blue-200 bg-clip-text text-transparent">
                    3D Viewer
                </CardTitle>
                <p className="text-sm text-slate-300">Interact with the scene via orbit controls.</p>
            </CardHeader>
            <CardContent>
                <RoomViewer layout={layout} />
            </CardContent>
        </Card>
    );
}

/**
 * Testing Guide:
 * 1) Ensure /public/models.json exists with correct GLB paths (e.g., "/models/lowpoly-room/desk_basic.glb").
 * 2) Run: pnpm dev, open http://localhost:3000.
 * 3) Use the ChatPanel to generate a layout; on success it should dispatch a
 *    window event: `window.dispatchEvent(new CustomEvent('layout:update', { detail: data }))`.
 * 4) Expect: floor + simple lights; models appear after response; orbit to inspect.
 * 5) If nothing renders, check DevTools for warnings about missing keys or GLTF load errors.
 * 6) If vertical placement looks off, confirm model heights in models.json; we default y = h/2.
 */
