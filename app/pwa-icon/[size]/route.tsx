import { ImageResponse } from "next/og";

export const runtime = "edge";

function buildIcon(size: number) {
  const badgeSize = Math.round(size * 0.56);
  const glyphSize = Math.round(size * 0.34);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(145deg, #2d1814 0%, #8d321b 46%, #f75d36 100%)",
        borderRadius: Math.round(size * 0.26),
      }}
    >
      <div
        style={{
          width: badgeSize,
          height: badgeSize,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #fff6e6 0%, #ffe4bd 100%)",
          borderRadius: badgeSize / 2,
          color: "#231510",
          fontSize: glyphSize,
          fontWeight: 800,
          letterSpacing: "-0.08em",
          transform: "translateY(-2%)",
        }}
      >
        R
      </div>
    </div>
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ size: string }> },
) {
  const { size } = await context.params;
  const parsedSize = Number(size);

  if (!Number.isFinite(parsedSize) || ![180, 192, 512].includes(parsedSize)) {
    return new Response("Not found", { status: 404 });
  }

  return new ImageResponse(buildIcon(parsedSize), {
    width: parsedSize,
    height: parsedSize,
  });
}
