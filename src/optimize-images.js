/* /* const sharp = require("sharp");
const fs = require("fs");
const path = require("path"); */
import sharp from "sharp";
import fs from "fs";
import path from "path";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputDir = path.join(__dirname, "public/img");
const outputDir = path.join(__dirname, "public/images");

// Asegúrate de que el directorio de salida exista
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Lee todas las imágenes del directorio de entrada
fs.readdirSync(inputDir).forEach((file) => {
  const inputPath = path.join(inputDir, file);
  const outputPath = path.join(outputDir, file);

  sharp(inputPath)
    .resize(200, 300, {
      fit: sharp.fit.contain,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .webp({ quality: 80 }) // Convierte a WebP
    .toFile(outputPath)
    .then(() => {
      console.log(`Optimized: ${file}`);
    })
    .catch((err) => {
      console.error(`Error optimizing ${file}:`, err);
    });
});
