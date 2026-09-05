const paths = {
  home: "M4 12 12 5l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8Z",
  camera: "M4 8h3l2-3h6l2 3h3v11H4V8Zm8 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  truck: "M3 7h10v8H3V7Zm10 3h4l3 3v2h-2M13 15H8m8 3a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  wallet: "M4 7h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm12 6h3M16 13a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z",
  chat: "M4 5h16v10H8l-4 4V5Z",
  mic: "M12 4a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V7a3 3 0 0 1 3-3Zm-6 8a6 6 0 0 0 12 0M12 18v3",
  warning: "M12 4 3 20h18L12 4Zm0 6v4m0 3h.01",
  check: "M5 12l4 4 10-10",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 0c2.5 2.5 2.5 15.5 0 18M3.5 9h17M3.5 15h17",
  crt: "M4 5h16v11H4V5Zm3 14h10",
  lcd: "M3 6h18v9H3V6Zm6 12h6",
  pcb: "M5 5h14v14H5V5Zm4 4h6v6H9V9ZM5 9H2m0 4h3m14-4h3m-3 4h3M9 5V2m6 3V2M9 22v-3m6 3v-3",
  cable: "M4 12a4 4 0 0 1 4-4h2M20 12a4 4 0 0 1-4 4h-2M6 8V5M18 16v3M10 12h4",
  battery: "M4 9h13v6H4V9Zm13 2h2v2h-2M6 11h1v2H6Z",
  motor: "M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M18 6l-2 2M6 18l2-2M18 18l-2-2M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z",
  plastic: "M7 4h10l2 4v4a7 7 0 0 1-14 0V8l2-4Zm3 6v4m4-4v4",
};

export default function Icon({ name, size = 22, color = "currentColor", strokeWidth = 1.8 }) {
  const d = paths[name] || paths.home;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={d} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
