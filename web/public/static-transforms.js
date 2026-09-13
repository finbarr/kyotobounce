// Authored architecture never moves. Cache world matrices after it is attached
// to the scene; keep avatars, escalator instances, cameras and lights dynamic.
export function freezeStaticTransforms(root) {
  root.updateWorldMatrix(true, true);
  root.traverse((object) => {
    object.matrixAutoUpdate = false;
    object.matrixWorldAutoUpdate = false;
  });
}
