"use client";

import { useEffect } from "react";
import { useGLTF } from "@react-three/drei";

/**
 * Convenience wrapper that loads a GLB/GLTF scene and injects it into the graph.
 */
export function GLTFModel({ path, scale = 1 }: { path: string; scale?: number }) {
    // Preload the path on mount to help with repeated usage. Errors are non-fatal here.
    useEffect(() => {
        try {
            useGLTF.preload(path);
        } catch (err) {
            // Preload is optional; log and continue.
            console.warn("[GLTFModel] Preload warning for", path, err);
        }
    }, [path]);

    // Important: Hooks must be called unconditionally at the top level.
    // useGLTF will throw for Suspense while loading or on failure; handle those at usage sites.
    const { scene } = useGLTF(path);
    return <primitive object={scene} scale={scale} />;
}

// Ensure TS sees preload; drei provides it at runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(useGLTF.preload as any);
