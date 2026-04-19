import { ImageResponse } from "next/og";

export const runtime = "edge";

function buildIcon(size: number) {
  const glyphSize = Math.round(size * 0.58);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(145deg, #0f2a1a 0%, #1e5a37 46%, #3d8d5c 100%)",
        borderRadius: Math.round(size * 0.26),
      }}
    >
      <svg
        width={glyphSize}
        height={glyphSize}
        viewBox="0 0 64 64"
        fill="#eaf6ee"
      >
        <path d="M10 54C10 30 30 10 54 10c0 28-20 44-44 44z" />
      </svg>
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
