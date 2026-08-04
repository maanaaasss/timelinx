'use client';

import { useState } from 'react';
import { Zap, Volume2, Eye } from 'lucide-react';

export function TimelinePreviewCard() {
  const [activeTool, setActiveTool] = useState<'select' | 'razor' | 'trim'>('select');

  return (
    <div className="w-full rounded-2xl border border-white/[0.08] bg-[#0C0C10] shadow-2xl shadow-black/80 overflow-hidden text-left font-sans">
      {/* Top Header / Status bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#121216] border-b border-white/[0.06] text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-red-500/80" />
            <span className="size-2.5 rounded-full bg-yellow-500/80" />
            <span className="size-2.5 rounded-full bg-green-500/80" />
          </div>
          <span className="text-[#8888A0] font-mono text-[11px] ml-2">documentary_edit_final.tl</span>
          <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[#B4B4C8] text-[10px] font-mono">30 FPS</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#18181E] border border-white/[0.06] rounded-md p-0.5">
            <button
              onClick={() => setActiveTool('select')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                activeTool === 'select'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'text-[#8888A0] hover:text-white'
              }`}
            >
              Select (V)
            </button>
            <button
              onClick={() => setActiveTool('razor')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                activeTool === 'razor'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'text-[#8888A0] hover:text-white'
              }`}
            >
              Razor (C)
            </button>
          </div>
          <span className="font-mono text-amber-400 text-xs font-semibold tracking-wider">
            00:01:24:12
          </span>
        </div>
      </div>

      {/* Editor Body */}
      <div className="relative bg-[#0C0C10] p-4 select-none">
        {/* Playhead Overlay Line */}
        <div className="absolute top-0 bottom-0 left-[38%] w-px bg-amber-500 z-30 shadow-[0_0_8px_rgba(224,122,47,0.8)] pointer-events-none">
          <div className="absolute top-0 -translate-x-1/2 w-3 h-3 bg-amber-500" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
        </div>

        {/* Ruler */}
        <div className="flex items-center h-7 border-b border-white/[0.06] text-[10px] font-mono text-[#8888A0] mb-2 pl-24">
          <div className="flex-1 flex justify-between pr-4">
            <span>00:00:00</span>
            <span>00:01:00</span>
            <span>00:02:00</span>
            <span>00:03:00</span>
            <span>00:04:00</span>
          </div>
        </div>

        {/* Track Rows */}
        <div className="space-y-2">
          {/* Track V1 */}
          <div className="flex h-14 rounded-lg bg-[#121216] border border-white/[0.04] overflow-hidden">
            {/* Header */}
            <div className="w-24 shrink-0 px-2.5 py-2 bg-[#18181E] border-r border-white/[0.06] flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-medium text-[#ECECF0]">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-blue-500" />
                  V1
                </span>
                <Eye className="size-3 text-[#8888A0]" />
              </div>
              <span className="text-[10px] text-[#8888A0]">Video</span>
            </div>
            {/* Clips Area */}
            <div className="flex-1 relative bg-[#0C0C10]/40 p-1 flex items-center gap-2">
              <div className="w-[32%] h-full rounded bg-blue-500/20 border border-blue-500/50 p-2 flex flex-col justify-between text-[11px] text-blue-200">
                <span className="font-medium truncate">interview_A.mp4</span>
                <span className="text-[9px] text-blue-300/70 font-mono">00:00 - 00:01:15</span>
              </div>
              <div className="w-[42%] h-full rounded bg-blue-500/25 border-2 border-cyan-400 shadow-[0_0_12px_rgba(0,194,255,0.25)] p-2 flex flex-col justify-between text-[11px] text-white">
                <div className="flex items-center justify-between">
                  <span className="font-semibold truncate">broll_drone_4k.mp4</span>
                  <span className="text-[9px] px-1 bg-cyan-400/20 text-cyan-300 rounded">Selected</span>
                </div>
                <span className="text-[9px] text-cyan-200/80 font-mono">00:01:15 - 00:03:00</span>
              </div>
              <div className="w-[20%] h-full rounded bg-blue-500/15 border border-blue-500/30 p-2 flex flex-col justify-between text-[11px] text-blue-300/70">
                <span className="font-medium truncate">outro_gfx.mov</span>
              </div>
            </div>
          </div>

          {/* Track A1 */}
          <div className="flex h-12 rounded-lg bg-[#121216] border border-white/[0.04] overflow-hidden">
            {/* Header */}
            <div className="w-24 shrink-0 px-2.5 py-1.5 bg-[#18181E] border-r border-white/[0.06] flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-medium text-[#ECECF0]">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-indigo-400" />
                  A1
                </span>
                <Volume2 className="size-3 text-[#8888A0]" />
              </div>
              <span className="text-[10px] text-[#8888A0]">Audio</span>
            </div>
            {/* Waveform Clips */}
            <div className="flex-1 relative bg-[#0C0C10]/40 p-1 flex items-center gap-1">
              <div className="w-[70%] h-full rounded bg-indigo-500/20 border border-indigo-500/40 px-2 py-1 flex items-center justify-between relative overflow-hidden">
                <span className="text-[10px] text-indigo-200 font-medium z-10">background_score.wav</span>
                {/* Waveform graphic */}
                <div className="absolute inset-y-1 left-2 right-2 flex items-center justify-between opacity-30 pointer-events-none">
                  {Array.from({ length: 48 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-0.5 bg-indigo-300 rounded-full"
                      style={{ height: `${Math.sin(i * 0.5) * 40 + 50}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Track Subtitle */}
          <div className="flex h-10 rounded-lg bg-[#121216] border border-white/[0.04] overflow-hidden">
            {/* Header */}
            <div className="w-24 shrink-0 px-2.5 py-1.5 bg-[#18181E] border-r border-white/[0.06] flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-medium text-[#ECECF0]">
                <span className="size-2 rounded-full bg-amber-400" />
                CC
              </span>
            </div>
            {/* Subtitle Clips */}
            <div className="flex-1 relative bg-[#0C0C10]/40 p-1 flex items-center gap-2">
              <div className="w-[30%] h-full rounded bg-amber-500/20 border border-amber-500/40 px-2 flex items-center text-[10px] text-amber-200 truncate">
                "Welcome to Timelinx"
              </div>
              <div className="w-[35%] h-full rounded bg-amber-500/20 border border-amber-500/40 px-2 flex items-center text-[10px] text-amber-200 truncate">
                "Pure dispatch state machine"
              </div>
            </div>
          </div>
        </div>

        {/* Dispatch Log Footer */}
        <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-[#8888A0] font-mono">
          <div className="flex items-center gap-2">
            <Zap className="size-3.5 text-amber-400 animate-pulse" />
            <span className="text-[#ECECF0]">dispatch(</span>
            <span className="text-cyan-400">MOVE_CLIP</span>
            <span className="text-[#8888A0]">, clipId: "broll_drone", start: 225)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20">
              Accepted (v42)
            </span>
            <span className="text-[10px] text-[#555]">0.4ms</span>
          </div>
        </div>
      </div>
    </div>
  );
}
