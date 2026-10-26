import { BufferAttribute, BufferGeometry, Color, Mesh, MeshStandardMaterial } from 'three';
import { meshVoxelSource, MESH_VERSION, type MeshMode } from '../assets/voxel-mesh.ts';
import { assetMetres } from '../assets/voxel-source.ts';

/** One opaque matte batch with linear vertex colors; flat normals remain per face. */
export function createVoxelMesh(value: unknown, mode: MeshMode = 'greedy') {
  const { source, quads, stats } = meshVoxelSource(value, mode);
  const positions = new Float32Array(stats.vertices * 3);
  const normals = new Float32Array(stats.vertices * 3);
  const colors = new Float32Array(stats.vertices * 3);
  const indices = stats.vertices <= 65536 ? new Uint16Array(stats.triangles * 3) : new Uint32Array(stats.triangles * 3);
  const palette = source.palette.map((entry) => new Color(entry.color));
  const [width, , depth] = assetMetres(source);
  quads.forEach((quad, index) => {
    const u = (quad.axis + 1) % 3;
    const v = (quad.axis + 2) % 3;
    const color = palette[quad.palette];
    for (let corner = 0; corner < 4; corner++) {
      const position = [...quad.origin];
      if (corner === 1 || corner === 2) position[u] += quad.width;
      if (corner === 2 || corner === 3) position[v] += quad.height;
      const offset = (index * 4 + corner) * 3;
      positions.set([position[0] * source.voxelSize - width / 2, position[1] * source.voxelSize, position[2] * source.voxelSize - depth / 2], offset);
      normals[offset + quad.axis] = quad.sign;
      colors.set([color.r, color.g, color.b], offset);
    }
    const base = index * 4;
    indices.set((quad.sign === 1 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]).map((n) => n + base), index * 6);
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(normals, 3));
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 });
  material.name = 'mvw-opaque-matte';
  const mesh = new Mesh(geometry, material);
  mesh.name = source.id;
  mesh.userData = { assetId: source.id, name: source.name, sourceSchemaVersion: source.schemaVersion,
    meshVersion: MESH_VERSION, units: source.units, voxelSize: source.voxelSize, gridSize: [...source.size],
    pivot: source.pivot, orientation: { ...source.orientation }, provenance: source.provenance };
  let disposed = false;
  return { mesh, source, stats, dispose() {
    if (disposed) return;
    disposed = true;
    geometry.dispose();
    material.dispose();
    mesh.removeFromParent();
  } };
}
