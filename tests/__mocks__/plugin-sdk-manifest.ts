type RuntimeManifest = Record<string, unknown>;

export function resolveRuntimeManifest<T extends RuntimeManifest>(manifest: T): T {
  return manifest;
}
