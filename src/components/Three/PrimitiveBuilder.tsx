"use client";

import { Fragment } from "react";
import type { ConstructionPrimitive } from "@/types/models";

const degToRad = (d = 0) => (d * Math.PI) / 180;

/**
 * Renders a minimal set of construction primitives (box, cylinder, plane).
 */
export function PrimitiveBuilder({
	construction,
}: {
	construction: ConstructionPrimitive[];
}) {
	return (
		<group>
			{construction.map((item, idx) => {
				// Only support "box", "cylinder", and "plane" as requested.
				if (
					item.prim !== "box" &&
					item.prim !== "cylinder" &&
					item.prim !== "plane"
				) {
					return <Fragment key={item.id ?? idx} />;
				}

				const pos = item.pos ?? { x: 0, y: 0, z: 0 };
				const rot = item.rotation_deg ?? {};
				const size = item.size ?? {};
				const mat = item.material ?? {};

				const rotation = [
					degToRad(rot.x ?? 0),
					degToRad(rot.y ?? 0),
					degToRad(rot.z ?? 0),
				] as const;

				const color = mat.base_color ?? "#9ca3af"; // slate-400 default
				const emissive = mat.emissive ?? "#000000";
				const metalness = mat.metalness ?? 0.1;
				const roughness = mat.roughness ?? 0.8;

				if (item.prim === "box") {
					const w = size.w ?? 1;
					const h = size.h ?? 1;
					const d = size.d ?? 1;
					return (
						<mesh
							key={item.id ?? idx}
							position={[pos.x, pos.y, pos.z]}
							rotation={rotation}
						>
							<boxGeometry args={[w, h, d]} />
							<meshStandardMaterial
								color={color}
								emissive={emissive}
								metalness={metalness}
								roughness={roughness}
							/>
						</mesh>
					);
				}

				if (item.prim === "cylinder") {
					const r = size.r ?? 0.5;
					const h = size.h ?? 1;
					return (
						<mesh
							key={item.id ?? idx}
							position={[pos.x, pos.y, pos.z]}
							rotation={rotation}
						>
							<cylinderGeometry args={[r, r, h, 16]} />
							<meshStandardMaterial
								color={color}
								emissive={emissive}
								metalness={metalness}
								roughness={roughness}
							/>
						</mesh>
					);
				}

				// plane: width x height; useful for quick surfaces or panels
				const w = size.w ?? 1;
				const h = size.h ?? 1;
				return (
					<mesh
						key={item.id ?? idx}
						position={[pos.x, pos.y, pos.z]}
						rotation={rotation}
					>
						<planeGeometry args={[w, h]} />
						<meshStandardMaterial
							color={color}
							emissive={emissive}
							metalness={metalness}
							roughness={roughness}
							side={2}
						/>
					</mesh>
				);
			})}
		</group>
	);
}
