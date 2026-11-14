// Static painted layers. Each layer is painted ONCE into an offscreen canvas
// in world coordinates and reused for every frame, so the per-frame cost is
// only the character and the effects.
//
//   defineLayer({ id, parallax, blur, paint(ctx, { width, height, rng }) })
//   drawLayer(ctx, id, camera)

import { WORLD_W, WORLD_H } from '../config.js';
import { mulberry32, hashString, helpers } from '../rng.js';
import { applyLayerTransform } from '../camera.js';

const registry = new Map();
const cache = new Map();

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/**
 * Register a static layer.
 *   id        unique name
 *   parallax  depth factor from the spec (0.2 far … 1.0 foreground)
 *   blur      depth-of-field blur in px, baked into the cached canvas
 *   paint     function drawing the layer in world coordinates; `rng` is seeded
 *             from the layer id, so the painting is identical on every run
 */
export function defineLayer({ id, parallax = 1, blur = 0, width = WORLD_W, height = WORLD_H, paint }) {
  if (!id) throw new Error('defineLayer(): id is required');
  if (typeof paint !== 'function') throw new Error(`defineLayer("${id}"): paint must be a function`);
  if (registry.has(id)) throw new Error(`defineLayer(): layer "${id}" is already defined`);
  registry.set(id, { id, parallax, blur, width, height, paint });
  return id;
}

export function hasLayer(id) {
  return registry.has(id);
}

export function layerInfo(id) {
  const layer = registry.get(id);
  if (!layer) throw new Error(`Unknown layer "${id}"`);
  return layer;
}

/** The cached canvas for a layer; painted on first use. */
export function getLayerCanvas(id) {
  if (cache.has(id)) return cache.get(id);
  const layer = layerInfo(id);
  const sharp = makeCanvas(layer.width, layer.height);
  const rng = helpers(mulberry32(hashString(`layer|${id}`)));
  layer.paint(sharp.getContext('2d'), { width: layer.width, height: layer.height, rng });

  let result = sharp;
  if (layer.blur > 0) {
    result = makeCanvas(layer.width, layer.height);
    const g = result.getContext('2d');
    g.filter = `blur(${layer.blur}px)`;
    g.drawImage(sharp, 0, 0);
  }
  cache.set(id, result);
  return result;
}

/** Draw a cached layer through the camera, using the layer's own parallax. */
export function drawLayer(ctx, id, camera, { alpha = 1, composite = null } = {}) {
  const layer = layerInfo(id);
  ctx.save();
  applyLayerTransform(ctx, camera, layer.parallax);
  ctx.globalAlpha *= alpha;
  if (composite) ctx.globalCompositeOperation = composite;
  ctx.drawImage(getLayerCanvas(id), 0, 0);
  ctx.restore();
}

/** Forget cached paintings (all, or one layer) so they are repainted. For the preview. */
export function clearLayerCache(id) {
  if (id) cache.delete(id);
  else cache.clear();
}

/** Paint every registered layer now, so the first rendered frame is not slower. */
export function warmLayers() {
  for (const id of registry.keys()) getLayerCanvas(id);
}
