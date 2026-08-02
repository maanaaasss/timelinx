'use client';

import dynamic from 'next/dynamic';

const AssetBinExampleInner = dynamic(
  () => import('./asset-bin-example').then(mod => ({ default: mod.AssetBinExample })),
  { ssr: false, loading: () => <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div> }
);

export { AssetBinExampleInner as AssetBinExample };
