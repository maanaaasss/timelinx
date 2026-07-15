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
  Magnet,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  type LucideIcon,
} from 'lucide-react';

export interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const SW = 1.75;

function makeIcon(Icon: LucideIcon, opts?: { fill?: string }) {
  return function IconComponent({ size = 14, className, style }: IconProps) {
    return <Icon size={size} strokeWidth={SW} className={className} style={style} fill={opts?.fill ?? 'none'} />;
  };
}

export const IconPlus = makeIcon(Plus);
export const IconFilm = makeIcon(Film);
export const IconHeadphones = makeIcon(Headphones);
export const IconZoomIn = makeIcon(ZoomIn);
export const IconZoomOut = makeIcon(ZoomOut);
export const IconUndo = makeIcon(Undo2);
export const IconRedo = makeIcon(Redo2);
export const IconPlayerPlay = makeIcon(Play, { fill: 'currentColor' });
export const IconPlayerPause = makeIcon(Pause, { fill: 'currentColor' });
export const IconCursor = makeIcon(MousePointer2);
export const IconRazor = makeIcon(Scissors);
export const IconHand = makeIcon(Hand);
export const IconTrim = makeIcon(SplitSquareHorizontal);
export const IconRoll = makeIcon(ArrowLeftRight);
export const IconSlip = makeIcon(ArrowUpDown);
export const IconSlide = makeIcon(MoveHorizontal);
export const IconSnap = makeIcon(Magnet);
export const IconMusic = makeIcon(Music);
export const IconVideo = makeIcon(Film);
export const IconSubtitle = makeIcon(Subtitles);
export const IconTitle = makeIcon(Type);
export const IconTrash = makeIcon(Trash2);
export const IconGrip = makeIcon(GripVertical);
export const IconEye = makeIcon(Eye);
export const IconEyeOff = makeIcon(EyeOff);
export const IconLock = makeIcon(Lock);
export const IconUnlock = makeIcon(Unlock);
export const IconVolume = makeIcon(Volume2);
export const IconVolumeOff = makeIcon(VolumeX);

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
