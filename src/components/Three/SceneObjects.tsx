"use client";

import type { LayoutResponse, ModelsJson } from "@/types/models";
import { GLTFModel } from "./GLTFModel";
import { PrimitiveBuilder } from "./PrimitiveBuilder";
import { getModelMeta, resolveModelPath } from "@/lib/modelLoader";

const degToRad = (d = 0) => (d * Math.PI) / 180;

/**
 * Maps layout objects to rendered GLTF models or primitive constructions.
 */
export function SceneObjects({
	layout,
	models,
}: {
	layout: LayoutResponse;
	models: ModelsJson;
}) {
	return (
		<group>
			{layout.objects?.map((obj) => {
				const id = obj.id ?? `${obj.model ?? "primitive"}`;
				const modelKey = obj.model ?? "";
				const path = resolveModelPath(models, modelKey);
				const meta = getModelMeta(models, modelKey);
				const h = meta?.h ?? 1;

				const px = obj.position_m?.x ?? 0;
				const pz = obj.position_m?.z ?? 0;
				const py = obj.position_m?.y ?? h / 2;

				const rx = degToRad(obj.rotation_deg?.x ?? 0);
				const ry = degToRad(obj.rotation_deg?.y ?? 0);
				const rz = degToRad(obj.rotation_deg?.z ?? 0);

        // Diagnostics to ensure placement and path resolution are visible in DevTools
        console.log(
          "[SceneObjects] Rendering object",
          id,
          "at",
          { x: px, y: py, z: pz },
          "path:",
          path
        );

        // Render GLTF if we have a path; otherwise try construction, else a fallback box.
        if (path) {
          return (
            <group key={id} position={[px, py, pz]} rotation={[rx, ry, rz]}>
              <GLTFModel path={path} />
            </group>
          );
        }

        if (!meta) {
          const extracted =
            (modelKey.includes(":") ? modelKey.split(":")[1] : modelKey) ?? modelKey;
          console.warn("[SceneObjects] Missing meta for key:", extracted);
        }

        if (!path && obj.construction && obj.construction.length > 0) {
          return (
            <group key={id} position={[px, py, pz]} rotation={[rx, ry, rz]}>
              <PrimitiveBuilder construction={obj.construction} />
            </group>
          );
        }

        const w = meta?.w ?? 0.8;
        const d = meta?.d ?? 0.8;
        return (
          <mesh key={id} position={[px, py, pz]} rotation={[rx, ry, rz]}>
            <boxGeometry args={[w, h, d]} />
						<meshStandardMaterial color="#9ca3af" />
					</mesh>
				);
			})}
		</group>
	);
}
