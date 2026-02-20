export const mergeAssets = <T extends object, S extends object>(
  contentAsset: T,
  assetsV2: S,
): T & S => {
  const result = { ...contentAsset } as Record<string, unknown>;

  Object.keys(assetsV2 as Record<string, unknown>).forEach((key) => {
    const assetsV2Value = (assetsV2 as Record<string, unknown>)[key];
    const contentValue = result[key];

    if (!(key in result)) {
      result[key] = assetsV2Value;
      return;
    }

    if (isPlainObject(contentValue) && isPlainObject(assetsV2Value)) {
      result[key] = mergeAssets(
        contentValue as Record<string, unknown>,
        assetsV2Value as Record<string, unknown>,
      );
      return;
    }

    // Arrays and non-plain objects: prefer assetsV2 by default
    result[key] = assetsV2Value;
  });

  return result as T & S;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};
