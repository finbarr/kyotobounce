import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { Group, Mesh, BoxGeometry, MeshBasicMaterial, Scene } from "three";
import sharp from "sharp";
import {
  readGLB,
  writeGLB,
  optimizeGLB,
} from "../../tools/optimize-browser-assets.mjs";
import { freezeStaticTransforms } from "../public/static-transforms.js";
await MeshoptDecoder.ready;
const sizes = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 },
  bytes = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 };
function decode(file) {
  const { json, bin } = readGLB(file),
    views = json.bufferViews.map((v) => {
      const e = v.extensions?.EXT_meshopt_compression;
      if (!e)
        return bin.subarray(
          v.byteOffset || 0,
          (v.byteOffset || 0) + v.byteLength,
        );
      const out = Buffer.alloc(e.count * e.byteStride);
      MeshoptDecoder.decodeGltfBuffer(
        out,
        e.count,
        e.byteStride,
        bin.subarray(e.byteOffset, e.byteOffset + e.byteLength),
        e.mode,
        e.filter,
      );
      return out;
    });
  return {
    json,
    views,
    accessor(index) {
      const a = json.accessors[index],
        v = json.bufferViews[a.bufferView],
        size = sizes[a.type] * bytes[a.componentType],
        out = Buffer.alloc(a.count * size);
      for (let i = 0; i < a.count; i++) {
        const at = (a.byteOffset || 0) + i * (v.byteStride || size);
        views[a.bufferView].copy(out, i * size, at, at + size);
      }
      return { data: out, count: a.count, size, component: a.componentType };
    },
  };
}
function indexAt(a, i) {
  return a.component === 5123
    ? a.data.readUInt16LE(i * 2)
    : a.component === 5125
      ? a.data.readUInt32LE(i * 4)
      : a.data[i];
}
function verifyGeometry(before, after) {
  const a = decode(before),
    b = decode(after);
  assert.deepEqual(
    a.json.nodes,
    b.json.nodes,
    "All node transforms and rig hierarchy stay identical",
  );
  assert.deepEqual(
    a.json.materials,
    b.json.materials,
    "All material definitions stay identical",
  );
  assert.equal(a.json.meshes.length, b.json.meshes.length);
  let triangles = 0;
  for (let m = 0; m < a.json.meshes.length; m++) {
    const old = a.json.meshes[m],
      next = b.json.meshes[m];
    assert.equal(
      old.primitives.length,
      next.primitives.length,
      "Draw batches stay identical",
    );
    for (let p = 0; p < old.primitives.length; p++) {
      const x = old.primitives[p],
        y = next.primitives[p],
        xi = a.accessor(x.indices),
        yi = b.accessor(y.indices);
      assert.equal(x.material, y.material);
      assert.equal(xi.count, yi.count);
      triangles += xi.count / 3;
      for (const name of Object.keys(x.attributes)) {
        const xs = a.accessor(x.attributes[name]),
          ys = b.accessor(y.attributes[name]);
        for (const bound of ["min", "max"])
          assert.deepEqual(
            a.json.accessors[x.attributes[name]][bound],
            b.json.accessors[y.attributes[name]][bound],
            "Authored bounds stay exact for shadows and culling",
          );
        assert.equal(xs.size, ys.size);
        for (let i = 0; i < xi.count; i++) {
          const source = indexAt(xi, i) * xs.size,
            target = indexAt(yi, i) * ys.size;
          assert.ok(
            xs.data
              .subarray(source, source + xs.size)
              .equals(ys.data.subarray(target, target + ys.size)),
            `${name} is bit-exact in original triangle order`,
          );
        }
      }
    }
  }
  for (let i = 0; i < (a.json.skins || []).length; i++)
    assert.ok(
      a
        .accessor(a.json.skins[i].inverseBindMatrices)
        .data.equals(b.accessor(b.json.skins[i].inverseBindMatrices).data),
      "Bind poses remain exact",
    );
  return triangles;
}
const positions = new Float32Array([
    0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0,
    1, 0,
  ]),
  normals = new Float32Array(positions.length);
for (let i = 2; i < normals.length; i += 3) normals[i] = 1;
normals[18] = 1;
normals[20] = 0;
const uv = new Float32Array([
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0.5, 0.5, 1, 0, 0, 1,
  ]),
  indices = new Uint16Array([0, 1, 2, 3, 4, 5, 6, 7, 8]);
const png = await sharp({
  create: { width: 32, height: 32, channels: 4, background: "#b34224" },
})
  .png()
  .toBuffer();
const parts = [
  Buffer.from(positions.buffer),
  Buffer.from(normals.buffer),
  Buffer.from(uv.buffer),
  Buffer.from(indices.buffer),
  Buffer.alloc(2),
  png,
];
let offset = 0;
const bufferViews = [];
for (const part of parts) {
  bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: part.length });
  offset += part.length;
}
const json = {
  asset: { version: "2.0" },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, translation: [1, 2, 3], name: "fixture" }],
  meshes: [
    {
      primitives: [
        {
          attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 },
          indices: 3,
          material: 0,
        },
      ],
    },
  ],
  materials: [
    {
      name: "Textured fixture",
      pbrMetallicRoughness: {
        baseColorTexture: { index: 0 },
        roughnessFactor: 0.45,
      },
    },
  ],
  textures: [{ source: 0 }],
  images: [{ bufferView: 5, mimeType: "image/png" }],
  buffers: [{ byteLength: offset }],
  bufferViews,
  accessors: [
    {
      bufferView: 0,
      componentType: 5126,
      count: 9,
      type: "VEC3",
      min: [0, 0, 0],
      max: [1, 1, 0],
    },
    { bufferView: 1, componentType: 5126, count: 9, type: "VEC3" },
    { bufferView: 2, componentType: 5126, count: 9, type: "VEC2" },
    { bufferView: 3, componentType: 5123, count: 9, type: "SCALAR" },
  ],
};
const source = writeGLB(json, Buffer.concat(parts)),
  { output, stats } = await optimizeGLB(source);
assert.equal(
  stats.verticesAfter,
  4,
  "Only identical full tuples merge; the normal/UV seam stays split",
);
assert.equal(verifyGeometry(source, output), 3);
const after = decode(output),
  image = after.json.images[0];
assert.ok(
  (
    await sharp(after.views[image.bufferView]).ensureAlpha().raw().toBuffer()
  ).equals(await sharp(png).ensureAlpha().raw().toBuffer()),
  "Texture pixel values stay exact",
);
const profiledPNG = await sharp(png).withIccProfile("p3").png().toBuffer();
const profiledJSON = structuredClone(json);
profiledJSON.bufferViews[5].byteLength = profiledPNG.length;
const profiledBIN = Buffer.concat([...parts.slice(0, -1), profiledPNG]);
profiledJSON.buffers[0].byteLength = profiledBIN.length;
const profiled = decode(
  (await optimizeGLB(writeGLB(profiledJSON, profiledBIN))).output,
);
assert.equal(profiled.json.images[0].mimeType, "image/png");
assert.ok(
  profiled.views[profiled.json.images[0].bufferView].equals(profiledPNG),
  "Profiled images retain their exact encoded bytes",
);
const scene = new Scene(),
  root = new Group(),
  child = new Mesh(new BoxGeometry(), new MeshBasicMaterial()),
  actor = new Group();
root.position.set(3, 4, 5);
root.rotation.y = 0.7;
child.position.set(1, 0, 2);
root.add(child);
scene.add(root, actor);
scene.updateMatrixWorld(true);
const expected = child.matrixWorld.clone();
freezeStaticTransforms(root);
actor.position.x = 12;
scene.updateMatrixWorld(true);
assert.ok(child.matrixWorld.equals(expected));
assert.equal(actor.matrixWorld.elements[12], 12);
assert.equal(root.matrixWorldAutoUpdate, false);
assert.equal(actor.matrixWorldAutoUpdate, true);
child.geometry.dispose();
child.material.dispose();
if (process.argv.includes("--full"))
  for (const name of ["atrium.glb", "atrium-detail.glb", "ori.glb"]) {
    const triangles = verifyGeometry(
      await readFile("web/public/assets/" + name),
      await readFile("web/public/assets/runtime/" + name),
    );
    console.log(
      "PASS",
      name,
      triangles,
      "triangles, exact ordered attributes, materials, transforms and bind poses",
    );
  }
console.log(
  "PASS lossless codec, full-tuple indexing, UV/normal seams, texture pixels, static matrices and dynamic actor isolation",
);
