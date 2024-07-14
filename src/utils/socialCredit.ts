import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import path from "node:path";

export async function generateSocialCreditImage(amount: number, type: string) {
  GlobalFonts.registerFromPath(
    path.join(__dirname, "socialCredits", "NotoSansKR-Bold.ttf"),
    "Noto Sans"
  );

  if (type === "negative") {
    const canvas = createCanvas(674, 450);
    const ctx = canvas.getContext("2d");

    const image = await loadImage(
      path.join(__dirname, "socialCredits", "negative.png")
    );

    ctx.beginPath();
    ctx.drawImage(image, 0, 0, 674, 450);
    ctx.closePath();

    ctx.beginPath();
    ctx.font = '74px "Noto Sans"';
    ctx.fillStyle = "#ffffff";
    ctx.fillText(String(amount), 220, 190);
    ctx.closePath();

    const buffer = canvas.encode("png");

    return buffer;
  }

  const canvas = createCanvas(674, 450);
  const ctx = canvas.getContext("2d");

  const image = await loadImage(
    path.join(__dirname, "socialCredits", "positive.png")
  );

  ctx.beginPath();
  ctx.drawImage(image, 0, 0, 674, 450);
  ctx.closePath();

  ctx.beginPath();
  ctx.font = '68px "Noto Sans"';
  ctx.fillStyle = "#ffffff";
  ctx.fillText(String(amount), 230, 145);
  ctx.closePath();

  const buffer = canvas.encode("png");

  return buffer;
}
