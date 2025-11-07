"use client";

import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { LayoutResponse, ModelsJson } from "@/types/models";
import { SceneObjects } from "./SceneObjects";

const degToRad = (d = 0) => (d * Math.PI) / 180;

/**
 * Client-side 3D room viewer. Loads model manifest on mount and renders layout.
 */
export default function RoomViewer({ layout }: { layout?: LayoutResponse }) {
	const [models, setModels] = useState<ModelsJson | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const res = await fetch("/models.json", {
					headers: { Accept: "application/json" },
				});
				if (!res.ok)
					throw new Error(`Failed to load models.json: ${res.status}`);
				const json = (await res.json()) as ModelsJson;
				if (!cancelled) setModels(json);
				} catch (err) {
					const msg = err instanceof Error ? err.message : String(err);
					console.error("[RoomViewer] Failed to load models.json", err);
					if (!cancelled) setError(msg);
				}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const roomSize = useMemo(() => {
		const fallback = { width_m: 4, depth_m: 3.5, height_m: 2.7 };
		const r = layout?.room ?? fallback;
		return {
			width: r.width_m ?? 4,
			depth: r.depth_m ?? 3.5,
			height: r.height_m ?? 2.7,
		};
	}, [layout]);

		return (
			<div className="h-[420px] w-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
				<Canvas camera={{ position: [0, 2.2, 6], fov: 50 }}>
					{/* Subtle non-black background inside the WebGL context */}
					{/* eslint-disable-next-line react/no-unknown-property */}
					<color attach="background" args={["#0b0e14"]} />

					{/* Basic studio lighting */}
					<ambientLight intensity={0.5} />
					<directionalLight intensity={1.0} position={[5, 8, 5]} />

					{/* Floor plane (XZ) - light, visible surface */}
					<group rotation={[degToRad(-90), 0, 0]} position={[0, 0, 0]}>
						<mesh>
							<planeGeometry args={[roomSize.width, roomSize.depth]} />
							<meshStandardMaterial color="#f2f3f5" />
						</mesh>
					</group>

					{/* Render objects only if both layout and models are available */}
					{layout && models ? (
						<SceneObjects layout={layout} models={models} />
					) : null}

					<OrbitControls />
				</Canvas>

				{!layout || !models ? (
					<p className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-xs text-slate-300">
						{error
							? `Model manifest error: ${error}`
							: "Viewer ready — generate a layout to populate the scene."}
					</p>
				) : null}
			</div>
		);
}
