/**
 * Media Assets Context — Phase 10
 *
 * Side-channel storage for File objects, blob URLs, and thumbnails
 * for imported media. Cannot live in core's asset registry because
 * core state must be serializable.
 */
import React, { createContext, useContext, useRef, useCallback, useEffect } from 'react';

export interface MediaAssetsContextValue {
  /** Get the File object for an imported asset */
  getFile(assetId: string): File | undefined;
  /** Get the blob URL for an imported asset */
  getBlobUrl(assetId: string): string | undefined;
  /** Get the thumbnail data URL for an imported asset */
  getThumbnail(assetId: string): string | undefined;
  /** Register an imported asset's file, blob URL, and thumbnail */
  addImportedAsset(assetId: string, file: File, blobUrl: string, thumbnail?: string): void;
  /** Remove an imported asset and revoke its blob URL */
  removeImportedAsset(assetId: string): void;
  /** Get all thumbnails as a map (for passing to clip components) */
  getAllThumbnails(): Map<string, string>;
}

const MediaAssetsCtx = createContext<MediaAssetsContextValue | null>(null);

export function MediaAssetsProvider({ children }: { children: React.ReactNode }) {
  const filesRef = useRef(new Map<string, File>());
  const blobUrlsRef = useRef(new Map<string, string>());
  const thumbnailsRef = useRef(new Map<string, string>());

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

  const getFile = useCallback(
    (assetId: string) => filesRef.current.get(assetId),
    [],
  );

  const getBlobUrl = useCallback(
    (assetId: string) => blobUrlsRef.current.get(assetId),
    [],
  );

  const getThumbnail = useCallback(
    (assetId: string) => thumbnailsRef.current.get(assetId),
    [],
  );

  const addImportedAsset = useCallback(
    (assetId: string, file: File, blobUrl: string, thumbnail?: string) => {
      filesRef.current.set(assetId, file);
      blobUrlsRef.current.set(assetId, blobUrl);
      if (thumbnail) thumbnailsRef.current.set(assetId, thumbnail);
    },
    [],
  );

  const removeImportedAsset = useCallback(
    (assetId: string) => {
      filesRef.current.delete(assetId);
      const url = blobUrlsRef.current.get(assetId);
      if (url) URL.revokeObjectURL(url);
      blobUrlsRef.current.delete(assetId);
      thumbnailsRef.current.delete(assetId);
    },
    [],
  );

  const getAllThumbnails = useCallback(
    () => thumbnailsRef.current,
    [],
  );

  const value: MediaAssetsContextValue = {
    getFile,
    getBlobUrl,
    getThumbnail,
    addImportedAsset,
    removeImportedAsset,
    getAllThumbnails,
  };

  return <MediaAssetsCtx.Provider value={value}>{children}</MediaAssetsCtx.Provider>;
}

export function useMediaAssets(): MediaAssetsContextValue {
  const ctx = useContext(MediaAssetsCtx);
  if (!ctx) {
    throw new Error('useMediaAssets must be used within a <MediaAssetsProvider>');
  }
  return ctx;
}
