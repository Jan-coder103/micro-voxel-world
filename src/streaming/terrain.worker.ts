import { generateTerrain, type ChunkSpec } from './terrain-data';
self.onmessage = (event: MessageEvent<{ id: number; spec: ChunkSpec }>) => {
  const {id,spec}=event.data;
  try {
    const data=generateTerrain(spec);
    self.postMessage({id,data}, { transfer: [data.positions.buffer,data.normals.buffer,data.colors.buffer] });
  } catch (error) { self.postMessage({id,error:String(error)}); }
};
