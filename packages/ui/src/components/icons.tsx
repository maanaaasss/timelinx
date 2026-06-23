import React from 'react';
import {
  Plus,
  Film,
  Headphones,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Play,
  Pause,
  MousePointer2,
  Scissors,
  Hand,
  SplitSquareHorizontal,
  Music,
  Type,
  Subtitles,
  Trash2,
  GripVertical,
  ArrowLeftRight,
  ArrowUpDown,
  MoveHorizontal,
} from 'lucide-react';

export interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function IconPlus({ size = 14, className, style }: IconProps) {
  return <Plus size={size} className={className} style={style} />;
}

export function IconFilm({ size = 14, className, style }: IconProps) {
  return <Film size={size} className={className} style={style} />;
}

export function IconHeadphones({ size = 14, className, style }: IconProps) {
  return <Headphones size={size} className={className} style={style} />;
}

export function IconZoomIn({ size = 14, className, style }: IconProps) {
  return <ZoomIn size={size} className={className} style={style} />;
}

export function IconZoomOut({ size = 14, className, style }: IconProps) {
  return <ZoomOut size={size} className={className} style={style} />;
}

export function IconUndo({ size = 14, className, style }: IconProps) {
  return <Undo2 size={size} className={className} style={style} />;
}

export function IconRedo({ size = 14, className, style }: IconProps) {
  return <Redo2 size={size} className={className} style={style} />;
}

export function IconPlayerPlay({ size = 14, className, style }: IconProps) {
  return <Play size={size} className={className} style={style} fill="currentColor" />;
}

export function IconPlayerPause({ size = 14, className, style }: IconProps) {
  return <Pause size={size} className={className} style={style} fill="currentColor" />;
}

export function IconCursor({ size = 14, className, style }: IconProps) {
  return <MousePointer2 size={size} className={className} style={style} />;
}

export function IconRazor({ size = 14, className, style }: IconProps) {
  return <Scissors size={size} className={className} style={style} />;
}

export function IconHand({ size = 14, className, style }: IconProps) {
  return <Hand size={size} className={className} style={style} />;
}

export function IconTrim({ size = 14, className, style }: IconProps) {
  return <SplitSquareHorizontal size={size} className={className} style={style} />;
}

export function IconRoll({ size = 14, className, style }: IconProps) {
  return <ArrowLeftRight size={size} className={className} style={style} />;
}

export function IconSlip({ size = 14, className, style }: IconProps) {
  return <ArrowUpDown size={size} className={className} style={style} />;
}

export function IconSlide({ size = 14, className, style }: IconProps) {
  return <MoveHorizontal size={size} className={className} style={style} />;
}

export function IconMusic({ size = 14, className, style }: IconProps) {
  return <Music size={size} className={className} style={style} />;
}

export function IconVideo({ size = 14, className, style }: IconProps) {
  return <Film size={size} className={className} style={style} />;
}

export function IconSubtitle({ size = 14, className, style }: IconProps) {
  return <Subtitles size={size} className={className} style={style} />;
}

export function IconTitle({ size = 14, className, style }: IconProps) {
  return <Type size={size} className={className} style={style} />;
}

export function IconTrash({ size = 14, className, style }: IconProps) {
  return <Trash2 size={size} className={className} style={style} />;
}

export function IconGrip({ size = 14, className, style }: IconProps) {
  return <GripVertical size={size} className={className} style={style} />;
}

export const TOOL_ICONS: Record<string, React.ComponentType<IconProps>> = {
  selection: IconCursor,
  razor: IconRazor,
  'ripple-trim': IconTrim,
  'roll-trim': IconRoll,
  slip: IconSlip,
  slide: IconSlide,
  hand: IconHand,
};

export const TRACK_TYPE_ICONS: Record<string, React.ComponentType<IconProps>> = {
  video: IconVideo,
  audio: IconMusic,
  subtitle: IconSubtitle,
  title: IconTitle,
};
