/** Three arcs for the three asset classes, drawn as one ring. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden>
      <rect width="512" height="512" rx="116" fill="#0e1a2b" />
      <g fill="none" strokeWidth="60" strokeLinecap="round" transform="rotate(-90 256 256)">
        <circle cx="256" cy="256" r="150" stroke="#f2b550" strokeDasharray="305 942.5" strokeDashoffset="0" />
        <circle cx="256" cy="256" r="150" stroke="#7088ff" strokeDasharray="237 942.5" strokeDashoffset="-393" />
        <circle cx="256" cy="256" r="150" stroke="#3ccdb6" strokeDasharray="136 942.5" strokeDashoffset="-718" />
      </g>
    </svg>
  );
}
