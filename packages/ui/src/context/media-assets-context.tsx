/**
 * Media Assets Context — Phase 10
 *
 * Side-channel storage for File objects, blob URLs, and thumbnails
 * for imported media. Cannot live in core's asset registry because
 * core state must be serializable.
 */
import React, { createContext, useContext, useRef, useCallback, useEffect, useMemo } from 'react';

export interface MediaAssetsContextValue {
  /** Get the File object for an imported asset */
  getFile(assetId: string): File | undefined;
  /** Get the blob URL for an imported asset */
  getBlobUrl(assetId: string): string | undefined;
  /** Get the thumbnail data URL for an imported asset */
  getThumbnail(assetId: string): string | undefined;
  /** Register an imported asset's file, blob URL, and thumbnail */
  addImportedAsset(assetId: string, file: File, blobUrl: string, thumbnail?: string): void;
  /**
   * Remove an imported asset and revoke its blob URL.
   *
   * By default, revocation is deferred by one microtask tick so that any
   * currently-rendering frame (compositor or export) can complete its draw
   * before the URL becomes invalid. Pass `immediate: true` only when you
   * are certain no rendering is in progress for this asset (e.g. in tests).
   */
  removeImportedAsset(assetId: string, options?: { immediate?: boolean }): void;
  /** Get all thumbnails as a ReadonlyMap (callers must not mutate) */
  getAllThumbnails(): ReadonlyMap<string, string>;
}

const MediaAssetsCtx = createContext<MediaAssetsContextValue | null>(null);

export interface MediaAssetsProviderProps {
  children: React.ReactNode;
  initialThumbnails?: Record<string, string> | ReadonlyMap<string, string>;
}

export function MediaAssetsProvider({ children, initialThumbnails }: MediaAssetsProviderProps) {
  const filesRef = useRef(new Map<string, File>());
  const blobUrlsRef = useRef(new Map<string, string>());
  const thumbnailsRef = useRef(
    new Map<string, string>(
      initialThumbnails
        ? initialThumbnails instanceof Map
          ? initialThumbnails
          : Object.entries(initialThumbnails)
        : [],
    ),
  );

  useEffect(() => {
    if (!initialThumbnails) return;
    const entries =
      initialThumbnails instanceof Map
        ? initialThumbnails.entries()
        : Object.entries(initialThumbnails);
    for (const [k, v] of entries) {
      thumbnailsRef.current.set(k, v);
    }
  }, [initialThumbnails]);

  useEffect(() => {
    const blobUrls = blobUrlsRef.current;
    return () => {
      for (const url of blobUrls.values()) {
        URL.revokeObjectURL(url);
      }
      filesRef.current.clear();
      blobUrls.clear();
      thumbnailsRef.current.clear();
    };
  }, []);

  const getFile = useCallback((assetId: string) => filesRef.current.get(assetId), []);

  const getBlobUrl = useCallback((assetId: string) => blobUrlsRef.current.get(assetId), []);

  const getThumbnail = useCallback((assetId: string) => thumbnailsRef.current.get(assetId), []);

  const addImportedAsset = useCallback(
    (assetId: string, file: File, blobUrl: string, thumbnail?: string) => {
      // T1-5: Revoke the previous blob URL before overwriting, so double-
      // registration (e.g. re-import of the same asset ID) does not leak.
      const existing = blobUrlsRef.current.get(assetId);
      if (existing && existing !== blobUrl) {
        URL.revokeObjectURL(existing);
      }
      filesRef.current.set(assetId, file);
      blobUrlsRef.current.set(assetId, blobUrl);
      if (thumbnail) thumbnailsRef.current.set(assetId, thumbnail);
    },
    [],
  );

  const removeImportedAsset = useCallback((assetId: string, options?: { immediate?: boolean }) => {
    filesRef.current.delete(assetId);
    thumbnailsRef.current.delete(assetId);
    const url = blobUrlsRef.current.get(assetId);
    blobUrlsRef.current.delete(assetId);
    if (!url) return;

    if (options?.immediate) {
      // Immediate revocation — only safe when no render frame is in progress
      // for this asset (e.g. during tests, or after confirming the compositor
      // is not using this clip).
      URL.revokeObjectURL(url);
    } else {
      // T0-3: Defer revocation by one microtask so the current render frame
      // (compositor or export) finishes drawing before the URL becomes invalid.
      // This prevents the "black frame in export" failure mode (H1 fix).
      Promise.resolve().then(() => URL.revokeObjectURL(url));
    }
  }, []);

  // T1-1: Return ReadonlyMap to prevent callers from mutating context state (H2 fix).
  const getAllThumbnails = useCallback(
    (): ReadonlyMap<string, string> => thumbnailsRef.current,
    [],
  );

  const value: MediaAssetsContextValue = useMemo(
    () => ({
      getFile,
      getBlobUrl,
      getThumbnail,
      addImportedAsset,
      removeImportedAsset,
      getAllThumbnails,
    }),
    [getFile, getBlobUrl, getThumbnail, addImportedAsset, removeImportedAsset, getAllThumbnails],
  );

  return <MediaAssetsCtx.Provider value={value}>{children}</MediaAssetsCtx.Provider>;
}

export function useMediaAssets(): MediaAssetsContextValue {
  const ctx = useContext(MediaAssetsCtx);
  if (!ctx) {
    throw new Error('useMediaAssets must be used within a <MediaAssetsProvider>');
  }
  return ctx;
}

export function useOptionalMediaAssets(): MediaAssetsContextValue | null {
  return useContext(MediaAssetsCtx);
}
