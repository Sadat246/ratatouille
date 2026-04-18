import { sanitizeInlineText } from "./shared";

function redactClonedDocument(documentClone: Document) {
  documentClone
    .querySelectorAll<HTMLElement>("[data-bug-report-redact]")
    .forEach((element) => {
      element.textContent = "[redacted]";
    });

  documentClone
    .querySelectorAll<HTMLInputElement>("input")
    .forEach((input) => {
      if (
        input.type === "checkbox" ||
        input.type === "radio" ||
        input.type === "range"
      ) {
        return;
      }

      input.value = "[redacted]";
      input.setAttribute("value", "[redacted]");
      input.placeholder = "";
    });

  documentClone
    .querySelectorAll<HTMLTextAreaElement>("textarea")
    .forEach((textarea) => {
      textarea.value = "[redacted]";
      textarea.textContent = "[redacted]";
      textarea.placeholder = "";
    });

  documentClone
    .querySelectorAll<HTMLSelectElement>("select")
    .forEach((select) => {
      Array.from(select.options).forEach((option) => {
        option.selected = false;
      });
    });
}

export async function captureBugReportScreenshot() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      dataUrl: null,
      error: "Screenshot capture is only available in the browser.",
    };
  }

  try {
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(document.body, {
      backgroundColor: "#f9efdf",
      height: window.innerHeight,
      ignoreElements: (element) =>
        element.hasAttribute("data-html2canvas-ignore") ||
        element.hasAttribute("data-bug-report-ignore"),
      logging: false,
      onclone: (documentClone) => {
        redactClonedDocument(documentClone);
      },
      scale: Math.min(window.devicePixelRatio || 1, 2),
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      useCORS: true,
      width: window.innerWidth,
      windowHeight: window.innerHeight,
      windowWidth: window.innerWidth,
      x: window.scrollX,
      y: window.scrollY,
    });

    return {
      dataUrl: canvas.toDataURL("image/jpeg", 0.82),
      error: null,
    };
  } catch (error) {
    return {
      dataUrl: null,
      error: sanitizeInlineText(
        error instanceof Error ? error.message : "Screenshot capture failed.",
        180,
      ),
    };
  }
}
