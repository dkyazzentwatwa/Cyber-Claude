import * as fs from "fs";
import * as path from "path";
import figlet from "./figlet.mjs";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fontPath = path.join(__dirname, "/../fonts/");
const nodeFiglet = figlet;
nodeFiglet.defaults({ fontPath });
nodeFiglet.loadFont = function(name, callback) {
  return new Promise((resolve, reject) => {
    if (nodeFiglet.figFonts[name]) {
      callback?.(null, nodeFiglet.figFonts[name].options);
      resolve(nodeFiglet.figFonts[name].options);
      return;
    }
    fs.readFile(
      path.join(nodeFiglet.defaults().fontPath, name + ".flf"),
      { encoding: "utf-8" },
      (err, fontData) => {
        if (err) {
          callback?.(err);
          reject(err);
          return;
        }
        fontData = fontData + "";
        try {
          const font = nodeFiglet.parseFont(name, fontData);
          callback?.(null, font);
          resolve(font);
        } catch (error) {
          const typedError = error instanceof Error ? error : new Error(String(error));
          callback?.(typedError);
          reject(typedError);
        }
      }
    );
  });
};
nodeFiglet.loadFontSync = function(font) {
  if (nodeFiglet.figFonts[font]) {
    return nodeFiglet.figFonts[font].options;
  }
  const fontData = fs.readFileSync(path.join(nodeFiglet.defaults().fontPath, font + ".flf"), {
    encoding: "utf-8"
  }) + "";
  return nodeFiglet.parseFont(font, fontData);
};
nodeFiglet.fonts = function(next) {
  return new Promise((resolve, reject) => {
    const fontList = [];
    fs.readdir(
      nodeFiglet.defaults().fontPath,
      (err, files) => {
        if (err) {
          next && next(err);
          reject(err);
          return;
        }
        files.forEach((file) => {
          if (/\.flf$/.test(file)) {
            fontList.push(file.replace(/\.flf$/, ""));
          }
        });
        next && next(null, fontList);
        resolve(fontList);
      }
    );
  });
};
nodeFiglet.fontsSync = function() {
  const fontList = [];
  fs.readdirSync(nodeFiglet.defaults().fontPath).forEach((file) => {
    if (/\.flf$/.test(file)) {
      fontList.push(file.replace(/\.flf$/, ""));
    }
  });
  return fontList;
};
export {
  nodeFiglet as default
};
