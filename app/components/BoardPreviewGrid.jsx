"use client";
import HintImage from "./HintImage";

function Cell({ hint, sizes = "200px" }) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      {hint?.image_url ? (
        <HintImage src={hint.image_url} alt="" fill className="object-cover" sizes={sizes} fallbackClassName="hidden" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#ead8ca] to-[#dbc0a8]" />
      )}
    </div>
  );
}

// Adapts to however many real hints a board actually has, rather than
// always rendering a fixed 2x2 grid padded out with empty gradient
// placeholders when there are fewer than 4 — a board with 1 hint now
// shows that one image filling the whole preview, 2 hints split evenly,
// 3 uses a large-plus-two-stacked layout, and 4+ keeps the original grid.
export default function BoardPreviewGrid({ previewHints = [] }) {
  const items = previewHints.slice(0, 4);
  const count = items.length;

  if (count === 0) {
    return <Cell hint={null} />;
  }

  if (count === 1) {
    return <Cell hint={items[0]} sizes="400px" />;
  }

  if (count === 2) {
    return (
      <div className="flex h-full w-full gap-0.5">
        {items.map((hint, i) => (
          <div key={i} className="relative flex-1">
            <Cell hint={hint} />
          </div>
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="flex h-full w-full gap-0.5">
        <div className="relative flex-1">
          <Cell hint={items[0]} sizes="300px" />
        </div>
        <div className="flex flex-1 flex-col gap-0.5">
          {items.slice(1, 3).map((hint, i) => (
            <div key={i} className="relative flex-1">
              <Cell hint={hint} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 4 — the original grid
  return (
    <div className="grid h-full w-full grid-cols-2 gap-0.5">
      {items.map((hint, i) => (
        <Cell key={i} hint={hint} />
      ))}
    </div>
  );
}
