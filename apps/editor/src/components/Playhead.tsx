interface PlayheadProps {
  frame: number;
  ppf: number;
}

export function Playhead({ frame, ppf }: PlayheadProps) {
  return (
    <div
      className="playhead"
      style={{
        transform: `translateX(${frame * ppf}px)`,
      }}
    />
  );
}
