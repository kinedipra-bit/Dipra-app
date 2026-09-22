const TONES: Record<string, string> = {
  brand: "var(--dp-brand)",
  amber: "var(--dp-amber)",
  ink: "var(--dp-ink)",
};

export function Avatar({
  iniciales,
  size = 40,
  tone = "brand",
}: {
  iniciales: string;
  size?: number;
  tone?: keyof typeof TONES;
}) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        backgroundColor: TONES[tone],
        fontSize: size * 0.38,
      }}
    >
      {iniciales || "?"}
    </div>
  );
}
