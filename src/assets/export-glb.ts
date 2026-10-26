import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createVoxelMesh } from '../rendering/voxel-mesh.ts';
import { serializeSource } from './voxel-source.ts';

/** A derivative only: source is validated/copied and temporary render resources always released. */
export async function exportVoxelGlb(value: unknown): Promise<ArrayBuffer> {
  const object = createVoxelMesh(value);
  try {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(serializeSource(object.source)));
    object.mesh.userData.sourceHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
    const result = await new GLTFExporter().parseAsync(object.mesh, { binary: true });
    if (!(result instanceof ArrayBuffer)) throw new Error('GLB exporter did not produce binary data.');
    return result;
  } finally { object.dispose(); }
}
