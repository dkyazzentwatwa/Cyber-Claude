"use strict";
const fs = require("fs");
const path = require("path");
const figlet = require("./figlet.cjs");
const url = require("url");
var _documentCurrentScript = typeof document !== "undefined" ? document.currentScript : null;
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const __filename$1 = url.fileURLToPath(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("node-figlet.cjs", document.baseURI).href);
const __dirname$1 = path__namespace.dirname(__filename$1);
const fontPath = path__namespace.join(__dirname$1, "/../fonts/");
const nodeFiglet = figlet;
nodeFiglet.defaults({ fontPath });
nodeFiglet.loadFont = function(name, callback) {
  return new Promise((resolve, reject) => {
    if (nodeFiglet.figFonts[name]) {
      callback?.(null, nodeFiglet.figFonts[name].options);
      resolve(nodeFiglet.figFonts[name].options);
      return;
    }
    fs__namespace.readFile(
      path__namespace.join(nodeFiglet.defaults().fontPath, name + ".flf"),
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
  const fontData = fs__namespace.readFileSync(path__namespace.join(nodeFiglet.defaults().fontPath, font + ".flf"), {
    encoding: "utf-8"
  }) + "";
  return nodeFiglet.parseFont(font, fontData);
};
nodeFiglet.fonts = function(next) {
  return new Promise((resolve, reject) => {
    const fontList = [];
    fs__namespace.readdir(
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
  fs__namespace.readdirSync(nodeFiglet.defaults().fontPath).forEach((file) => {
    if (/\.flf$/.test(file)) {
      fontList.push(file.replace(/\.flf$/, ""));
    }
  });
  return fontList;
};
module.exports = nodeFiglet;
