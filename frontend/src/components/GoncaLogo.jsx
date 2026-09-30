// "Gonca" (açmamış çiçek tomurcuğu) markasını temsil eden logo: koyu yeşil
// rozet zemininde, üç yaprağı andıran tomurcuk yaprakları ve altın sarısı bir
// vurgu (buğday/tahıl temasına gönderme).
export default function GoncaLogo({ boyut = 64, className }) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={boyut}
      height={boyut}
      className={className}
      role="img"
      aria-label="Turan Tarım logosu"
    >
      <circle cx="60" cy="60" r="58" fill="#1b5e20" />
      <line x1="60" y1="83" x2="60" y2="102" stroke="#a5d6a7" strokeWidth="4" strokeLinecap="round" />
      <path d="M60,84 C44,76 44,44 60,30 C76,44 76,76 60,84 Z" fill="#d4a017" />
      <path d="M60,84 C44,76 44,44 60,30 C76,44 76,76 60,84 Z" fill="#a5d6a7" transform="rotate(-16 60 84)" />
      <path d="M60,84 C44,76 44,44 60,30 C76,44 76,76 60,84 Z" fill="#66bb6a" transform="rotate(16 60 84)" />
    </svg>
  );
}
