/**
 * Represents a 3D vector in meters.
 */
export type Vec3 = {
	/** X-axis component in meters. */
	x: number;
	/** Y-axis component in meters. */
	y: number;
	/** Z-axis component in meters. */
	z: number;
};

/**
 * Axis-aligned bounding box defined by minimum and maximum corners.
 */
export type BoundingBox = {
	/** Minimum corner coordinates in meters. */
	min: Vec3;
	/** Maximum corner coordinates in meters. */
	max: Vec3;
};

/**
 * Map of anchor names to local-space positions in meters.
 */
export type AnchorMap = Record<string, Vec3>;

/**
 * Metadata describing a static model asset and its spatial properties.
 */
export type ModelMeta = {
	/** Public path to the GLB/GLTF asset. */
	path: string;
	/** Width in meters. */
	w: number;
	/** Depth in meters. */
	d: number;
	/** Height in meters. */
	h: number;
	/** Minimum corner of bounding box in meters. */
	bbox_min: Vec3;
	/** Maximum corner of bounding box in meters. */
	bbox_max: Vec3;
	/** Pivot point offset in meters. */
	pivot: Vec3;
	/** Named attachment anchors in meters. */
	anchors: AnchorMap;
	/** Searchable tags describing the model. */
	tags: string[];
	/** Recommended clearance margin in meters. */
	margin: number;
};

/**
 * Structured lookup of model metadata keyed by model identifier.
 */
export type ModelsJson = Record<string, ModelMeta>;

/**
 * Shared fields for geometric construction primitives.
 */
type BasePrimitive = {
	/** Optional unique identifier for referencing this primitive. */
	id?: string;
	/** Local position offset in meters. */
	pos?: Vec3;
	/** Euler rotations in degrees. */
	rotation_deg?: {
		x?: number;
		y?: number;
		z?: number;
	};
	/** Size parameters in meters (or radius in meters). */
	size?: {
		w?: number;
		d?: number;
		h?: number;
		r?: number;
	};
	/** PBR material settings in linear color space. */
	material?: {
		base_color?: string;
		emissive?: string;
		metalness?: number;
		roughness?: number;
	};
};

/**
 * Procedural construction elements used when no GLTF model is supplied.
 */
export type ConstructionPrimitive =
	| (BasePrimitive & {
			/** Primitive selector. */
			prim: "box" | "cylinder" | "plane";
	  })
	| (BasePrimitive & {
			/** Composite primitive enabling repeated copies. */
			prim: "composite";
			/** Number of instances to generate. */
			count?: number;
			/** Spacing between instances in meters. */
			spacing?: number;
	  });

/**
 * Describes a single object instance placed within the room layout.
 */
export type LayoutObject = {
	/** Unique identifier for the object instance. */
	id: string;
	/** Optional semantic type, e.g., "chair". */
	type?: string;
	/** Human-readable label. */
	label?: string;
	/** Model identifier, e.g., "gltf:desk_basic". */
	model?: string;
	/** Procedural construction recipe when no model is referenced. */
	construction?: ConstructionPrimitive[];
	/** Absolute position in meters. */
	position_m?: Vec3;
	/** Absolute rotation in degrees. */
	rotation_deg?: {
		x?: number;
		y?: number;
		z?: number;
	};
	/** Physical size override in meters. */
	size_m?: {
		w?: number;
		d?: number;
		h?: number;
	};
	/** Parent object ID when nested via anchors. */
	parent?: string;
	/** Offset from parent anchor in meters. */
	relative_position_m?: Vec3;
	/** Arbitrary variant payload for future extensions. */
	variant?: Record<string, unknown>;
};

/**
 * Basic room envelope description in meters.
 */
export type LayoutRoom = {
	/** Interior width in meters along X. */
	width_m: number;
	/** Interior depth in meters along Z. */
	depth_m: number;
	/** Interior height in meters along Y. */
	height_m: number;
	/** Optional floor material identifier. */
	floor_material?: string;
	/** Optional wall color hex string. */
	wall_color?: string;
};

/**
 * AI-generated layout payload containing the room context and placed objects.
 */
export type LayoutResponse = {
	/** Bounding room description in meters. */
	room: LayoutRoom;
	/** Ordered list of objects within the layout. */
	objects: LayoutObject[];
	/** Natural-language rationale explaining placement choices. */
	rationale?: string;
};

/**
 * Standardized API response envelope used by the application.
 */
export type APIResponse<T> = {
	/** Indicates whether the operation succeeded. */
	ok: boolean;
	/** Payload returned when ok is true. */
	data?: T;
	/** Error message provided when ok is false. */
	error?: string;
};

/**
 * Example:
 *
 * const sampleModel: ModelMeta = {
 *   path: "/models/dining-area/table.glb",
 *   w: 1.5,
 *   d: 0.9,
 *   h: 0.75,
 *   bbox_min: { x: -0.75, y: 0, z: -0.45 },
 *   bbox_max: { x: 0.75, y: 0.75, z: 0.45 },
 *   pivot: { x: 0, y: 0, z: 0 },
 *   anchors: { top_center: { x: 0, y: 0.75, z: 0 } },
 *   tags: ["dining", "table"],
 *   margin: 0.2,
 * };
 *
 * const layout: LayoutResponse = {
 *   room: { width_m: 5, depth_m: 4, height_m: 3 },
 *   objects: [
 *     {
 *       id: "table-1",
 *       label: "Dining Table",
 *       model: "gltf:dining_table",
 *       position_m: { x: 0, y: 0, z: 0 },
 *     },
 *   ],
 *   rationale: "Centered the table for balanced flow.",
 * };
 */
// TODO: Extend examples with anchor parenting once implemented.
