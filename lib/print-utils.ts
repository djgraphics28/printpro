export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

function waitForImages(doc: Document): Promise<void> {
  const images = Array.from(doc.images);
  if (images.length === 0) {
    return Promise.resolve();
  }

  return Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }
          image.onload = () => resolve();
          image.onerror = () => resolve();
        }),
    ),
  ).then(() => undefined);
}

/**
 * Print only the A4 sheet through a same-origin iframe so the workstation
 * chrome never appears in the print dialog.
 */
export function printA4Sheet() {
  const source = document.querySelector(".print-root");
  if (!source) {
    return;
  }

  const previous = document.getElementById("printpro-iframe");
  previous?.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "printpro-iframe";
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
  <head>
    <title>A4 ID Photos</title>
    <style>
      @page { size: A4; margin: 0; }
      html, body {
        margin: 0;
        padding: 0;
        width: 210mm;
        height: 297mm;
        background: #fff;
      }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      img { display: block; max-width: none; }
    </style>
  </head>
  <body>${source.innerHTML}</body>
</html>`);
  doc.close();

  const cleanup = () => {
    window.setTimeout(() => iframe.remove(), 300);
  };

  void waitForImages(doc).then(() => {
    win.addEventListener("afterprint", cleanup, { once: true });
    win.focus();
    win.print();
    window.setTimeout(cleanup, 4000);
  });
}
