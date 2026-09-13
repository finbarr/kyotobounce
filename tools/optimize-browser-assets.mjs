// Lossless delivery assets: exact vertex indexing, meshopt
// without quantization, and WebP lossless. Authored GLBs remain untouched.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import sharp from "sharp";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 },
  bytes = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 },
  hash = (b) => createHash("sha256").update(b).digest("hex");
export function readGLB(buffer) {
  assert.equal(buffer.readUInt32LE(0), 0x46546c67);
  assert.equal(buffer.readUInt32LE(4), 2);
  const length = buffer.readUInt32LE(12),
    json = JSON.parse(buffer.toString("utf8", 20, 20 + length));
  return { json, bin: buffer.subarray(28 + length) };
}
export function writeGLB(json, bin) {
  const source = Buffer.from(JSON.stringify(json)),
    pad = (4 - (source.length % 4)) % 4,
    text = Buffer.concat([source, Buffer.alloc(pad, 32)]),
    payload = Buffer.concat([bin, Buffer.alloc((4 - (bin.length % 4)) % 4)]),
    out = Buffer.alloc(28 + text.length + payload.length);
  out.writeUInt32LE(0x46546c67);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(text.length, 12);
  out.writeUInt32LE(0x4e4f534a, 16);
  text.copy(out, 20);
  out.writeUInt32LE(payload.length, 20 + text.length);
  out.writeUInt32LE(0x004e4942, 24 + text.length);
  payload.copy(out, 28 + text.length);
  return out;
}
export async function optimizeGLB(source) {
  const { json: original, bin } = readGLB(source),
    json = structuredClone(original),
    parts = [];
  let offset = 0;
  const stats = {
    sourceBytes: source.length,
    verticesBefore: 0,
    verticesAfter: 0,
    triangles: 0,
    primitivesBefore: 0,
    primitivesAfter: 0,
    images: [],
    decodedBytes: 0,
  };
  assert.equal(original.buffers.length, 1);
  assert.equal(original.buffers[0].uri, undefined);
  json.bufferViews = [];
  json.accessors = [];
  function append(buffer) {
    const at = offset;
    parts.push(buffer);
    offset += buffer.length;
    const pad = (4 - (offset % 4)) % 4;
    if (pad) {
      parts.push(Buffer.alloc(pad));
      offset += pad;
    }
    return at;
  }
  function accessor(index) {
    const a = original.accessors[index];
    assert.ok(
      !a.sparse,
      "Sparse geometry needs an explicit lossless implementation",
    );
    const view = original.bufferViews[a.bufferView],
      size = components[a.type] * bytes[a.componentType];
    assert.ok(size > 0);
    const data = Buffer.alloc(a.count * size),
      stride = view.byteStride || size,
      at = (view.byteOffset || 0) + (a.byteOffset || 0);
    for (let i = 0; i < a.count; i++)
      bin.copy(data, i * size, at + i * stride, at + i * stride + size);
    return { data, size, definition: a };
  }
  function encoded(data, count, size, mode, target) {
    const packed = Buffer.from(
        MeshoptEncoder.encodeGltfBuffer(data, count, size, mode, 0),
      ),
      restored = Buffer.alloc(data.length);
    MeshoptDecoder.decodeGltfBuffer(
      restored,
      count,
      size,
      packed,
      mode,
      "NONE",
    );
    assert.ok(restored.equals(data), "Meshopt must reproduce every byte");
    const byteOffset = append(packed),
      index = json.bufferViews.length;
    json.bufferViews.push({
      buffer: 1,
      byteOffset: 0,
      byteLength: data.length,
      ...(target === 34962 ? { byteStride: size } : {}),
      target,
      extensions: {
        EXT_meshopt_compression: {
          buffer: 0,
          byteOffset,
          byteLength: packed.length,
          byteStride: size,
          count,
          mode,
          filter: "NONE",
        },
      },
    });
    stats.decodedBytes += data.length;
    return index;
  }
  function addAccessor(data, definition, target) {
    const count = definition.count,
      size = components[definition.type] * bytes[definition.componentType],
      view = encoded(
        data,
        count,
        size,
        target === 34963 ? "INDICES" : "ATTRIBUTES",
        target,
      );
    const a = { ...definition, bufferView: view, byteOffset: 0 };
    delete a.sparse;
    const index = json.accessors.length;
    json.accessors.push(a);
    return index;
  }
  const copied = new Map();
  function copyAccessor(index) {
    if (copied.has(index)) return copied.get(index);
    const { data, size, definition } = accessor(index);
    let view;
    if (size % 4 === 0)
      view = encoded(data, definition.count, size, "ATTRIBUTES");
    else {
      view = json.bufferViews.length;
      json.bufferViews.push({
        buffer: 0,
        byteOffset: append(data),
        byteLength: data.length,
      });
    }
    const at = json.accessors.length;
    json.accessors.push({ ...definition, bufferView: view, byteOffset: 0 });
    copied.set(index, at);
    return at;
  }
  for (const mesh of json.meshes) {
    const primitives = [];
    for (const p of mesh.primitives) {
      assert.ok(p.mode === undefined || p.mode === 4);
      assert.ok(!p.targets, "Morph targets require preserving the full tuple");
      stats.primitivesBefore++;
      const names = Object.keys(p.attributes),
        streams = names.map((n) => accessor(p.attributes[n])),
        count = streams[0].definition.count,
        stride = streams.reduce((n, s) => n + s.size, 0);
      assert.ok(streams.every((s) => s.definition.count === count));
      const vertexBytes = Buffer.alloc(count * stride),
        map = new Map(),
        remap = new Uint32Array(count),
        unique = [];
      for (let i = 0; i < count; i++) {
        let at = i * stride;
        for (const s of streams) {
          s.data.copy(vertexBytes, at, i * s.size, (i + 1) * s.size);
          at += s.size;
        }
        const tuple = vertexBytes
          .subarray(i * stride, (i + 1) * stride)
          .toString("base64");
        let index = map.get(tuple);
        if (index === undefined) {
          index = unique.length;
          map.set(tuple, index);
          unique.push(i);
        }
        remap[i] = index;
      }
      const sourceIndex = p.indices === undefined ? null : accessor(p.indices),
        indexCount = sourceIndex?.definition.count || count,
        indices = new Uint32Array(indexCount);
      assert.equal(indexCount % 3, 0);
      for (let i = 0; i < indexCount; i++) {
        const old = sourceIndex
          ? sourceIndex.definition.componentType === 5123
            ? sourceIndex.data.readUInt16LE(i * 2)
            : sourceIndex.definition.componentType === 5125
              ? sourceIndex.data.readUInt32LE(i * 4)
              : sourceIndex.data[i]
          : i;
        assert.ok(old < count);
        indices[i] = remap[old];
        assert.ok(
          vertexBytes
            .subarray(old * stride, (old + 1) * stride)
            .equals(
              vertexBytes.subarray(
                unique[indices[i]] * stride,
                (unique[indices[i]] + 1) * stride,
              ),
            ),
          "Exact full vertex tuple, including normals and UVs",
        );
      }
      stats.verticesBefore += count;
      stats.triangles += indexCount / 3;
      {
        const list = indices;
        const used = new Map(),
          sourceVertices = [],
          localIndices = new Uint32Array(list.length);
        for (let i = 0; i < list.length; i++) {
          const old = list[i];
          if (!used.has(old)) {
            used.set(old, sourceVertices.length);
            sourceVertices.push(unique[old]);
          }
          localIndices[i] = used.get(old);
        }
        const output = { ...p, attributes: {} };
        for (let s = 0; s < streams.length; s++) {
          const stream = streams[s],
            data = Buffer.alloc(sourceVertices.length * stream.size);
          for (let i = 0; i < sourceVertices.length; i++)
            stream.data.copy(
              data,
              i * stream.size,
              sourceVertices[i] * stream.size,
              (sourceVertices[i] + 1) * stream.size,
            );
          const definition = {
            ...stream.definition,
            count: sourceVertices.length,
          };
          // Keep authored bounds as well as vertex bytes: re-deriving them can
          // slightly move the fitted sun shadow camera and reflection edges.
          output.attributes[names[s]] = addAccessor(data, definition, 34962);
        }
        const small = sourceVertices.length <= 65535,
          indexData = Buffer.alloc(localIndices.length * (small ? 2 : 4));
        for (let i = 0; i < localIndices.length; i++)
          small
            ? indexData.writeUInt16LE(localIndices[i], i * 2)
            : indexData.writeUInt32LE(localIndices[i], i * 4);
        output.indices = addAccessor(
          indexData,
          {
            componentType: small ? 5123 : 5125,
            count: localIndices.length,
            type: "SCALAR",
          },
          34963,
        );
        primitives.push(output);
        stats.verticesAfter += sourceVertices.length;
        stats.primitivesAfter++;
      }
    }
    mesh.primitives = primitives;
  }
  for (const skin of json.skins || [])
    if (skin.inverseBindMatrices !== undefined)
      skin.inverseBindMatrices = copyAccessor(skin.inverseBindMatrices);
  for (const animation of json.animations || [])
    for (const sampler of animation.samplers) {
      sampler.input = copyAccessor(sampler.input);
      sampler.output = copyAccessor(sampler.output);
    }
  for (let i = 0; i < (json.images || []).length; i++) {
    const img = original.images[i];
    assert.equal(img.uri, undefined);
    const view = original.bufferViews[img.bufferView],
      input = bin.subarray(
        view.byteOffset || 0,
        (view.byteOffset || 0) + view.byteLength,
      );
    const metadata = await sharp(input).metadata();
    // Keep formats/depths/profiles outside the verified browser path verbatim.
    // In particular, decoding a 16-bit PNG to RGBA8 is not a lossless test.
    const eligible =
      img.mimeType === "image/png" &&
      metadata.depth === "uchar" &&
      metadata.space === "srgb" &&
      !metadata.icc &&
      !metadata.orientation &&
      (metadata.pages || 1) === 1;
    let compressed = input;
    if (eligible) {
      const cacheFile = resolve(".local/texture-cache", hash(input) + ".webp");
      await mkdir(resolve(".local/texture-cache"), { recursive: true });
      compressed = await readFile(cacheFile).catch(() => null);
      if (!compressed) {
        compressed = await sharp(input)
          .webp({ lossless: true, effort: 6 })
          .toBuffer();
        await writeFile(cacheFile, compressed);
      }
    }
    const raw = await sharp(input)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true }),
      candidate = compressed,
      decoded = await sharp(candidate)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
    assert.deepEqual(decoded.info, raw.info);
    assert.ok(decoded.data.equals(raw.data), "Lossless texture pixels");
    const useWebp = candidate.length < input.length,
      output = useWebp ? candidate : input,
      bufferView = json.bufferViews.length;
    json.bufferViews.push({
      buffer: 0,
      byteOffset: append(output),
      byteLength: output.length,
    });
    json.images[i] = {
      ...img,
      bufferView,
      mimeType: useWebp ? "image/webp" : img.mimeType,
    };
    stats.images.push({
      name: img.name,
      before: input.length,
      after: output.length,
      width: raw.info.width,
      height: raw.info.height,
      pixelSha256: hash(raw.data),
    });
    if (useWebp)
      for (const texture of json.textures || [])
        if (texture.source === i) {
          delete texture.source;
          texture.extensions = {
            ...texture.extensions,
            EXT_texture_webp: { source: i },
          };
        }
  }
  const extensions = [
    "EXT_meshopt_compression",
    ...(stats.images.some((i) => i.after < i.before)
      ? ["EXT_texture_webp"]
      : []),
  ];
  json.extensionsUsed = [
    ...new Set([...(json.extensionsUsed || []), ...extensions]),
  ];
  json.extensionsRequired = [
    ...new Set([...(json.extensionsRequired || []), ...extensions]),
  ];
  json.buffers = [
    { byteLength: offset },
    {
      byteLength: Math.max(
        ...json.bufferViews
          .filter((v) => v.buffer === 1)
          .map((v) => v.byteLength),
      ),
      extensions: { EXT_meshopt_compression: { fallback: true } },
    },
  ];
  const output = writeGLB(json, Buffer.concat(parts));
  return {
    output,
    stats: {
      ...stats,
      outputBytes: output.length,
      sourceSha256: hash(source),
      outputSha256: hash(output),
    },
  };
}
export async function buildRuntimeAssets() {
  const out = resolve("web/public/assets/runtime");
  await mkdir(out, { recursive: true });
  const fingerprint = hash(
    Buffer.concat([
      await readFile(fileURLToPath(import.meta.url)),
      await readFile("package-lock.json"),
    ]),
  );
  const old = await readFile(out + "/optimization.json", "utf8")
      .then(JSON.parse)
      .catch(() => null),
    report = { format: 1, lossless: true, fingerprint, assets: {} };
  for (const name of ["atrium.glb", "atrium-detail.glb", "ori.glb"]) {
    const source = await readFile("web/public/assets/" + name),
      previous = old?.assets?.[name];
    if (
      old?.fingerprint === fingerprint &&
      previous?.sourceSha256 === hash(source)
    ) {
      const cached = await readFile(out + "/" + name).catch(() => null);
      if (cached && hash(cached) === previous.outputSha256) {
        report.assets[name] = previous;
        continue;
      }
    }
    const { output, stats } = await optimizeGLB(source);
    await writeFile(out + "/" + name, output);
    report.assets[name] = stats;
    console.log(
      name,
      JSON.stringify({
        before: stats.sourceBytes,
        after: stats.outputBytes,
        verticesBefore: stats.verticesBefore,
        verticesAfter: stats.verticesAfter,
        primitivesBefore: stats.primitivesBefore,
        primitivesAfter: stats.primitivesAfter,
      }),
    );
  }
  await writeFile(
    out + "/optimization.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  return report;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await buildRuntimeAssets();
