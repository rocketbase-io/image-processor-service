import express from "express";
import sharp from "sharp";
import { json } from "body-parser";
import { contentType } from "mime-types";
import fetch from "node-fetch";

const {
  PORT = "3000",
  MAX_OPS = "20"
} = process.env;

async function tryResolve(url: string | Buffer) {
  if (typeof url === "string" && /^https?:/.test(url))
    return await fetch(url).then(it => it.buffer());
  return url;
}

const transparentPixel = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

const app = express();
app.use(json());
app.post("/:inputsource?", async (req, res, next) => {
  try {
    const { actions = [], output = "out.png", input = {} } = req.body ?? {};
    if (!Array.isArray(actions)) return next(400);
    if (actions.length > +MAX_OPS) return next(400);
    for (const operation of actions) if (!operation || typeof operation !== "object" || !("action" in operation)) return next(400);

    const inputSource = await tryResolve(req.params.inputsource ?? transparentPixel);


    let image = sharp(inputSource as string, {
      ...input,
      limitInputPixels: true,
      failOnError: true
    });

    for (let { action, options } of actions) {
      if (action === "composite") {
        image = image.composite(await Promise.all(options.map(async (source: any) => {
          source.input = await tryResolve(source.input);
          return source;
        })));
        continue;
      }
      image = (image as any)[action].call(image, ...(Array.isArray(options) ? options : options == null ? [] : [options]));
    }

    const data = await image.toBuffer();

    res.writeHead(200, {
      "Content-Type": contentType(output) || "application/octet-stream",
      "Content-disposition": `attachment;filename=${output}`,
      "Content-Length": data.byteLength
    });
    res.end(data);
  } catch (e) {
    next(e);
  }

});

app.listen(+PORT, () => console.log(`http://localhost:${PORT}/`));
