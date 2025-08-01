const { exec } = require("child_process");
const path = require("path");

const LUA_MINIFIER_PATH = path.join(
  __dirname,
  "../../lua-minifier/src/minifier.lua"
);

const LUA_K = [
  "and",
  "break",
  "do",
  "else",
  "elseif",
  "end",
  "false",
  "for",
  "function",
  "goto",
  "if",
  "in",
  "local",
  "nil",
  "not",
  "or",
  "repeat",
  "return",
  "then",
  "true",
  "until",
  "while",
];

function* shortNames() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  let i = 0;
  while (true) {
    let name = "";
    let n = i;
    do {
      name = alphabet[n % 26] + name;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    yield "_" + name;
    i++;
  }
}

function extractStrings(code) {
  const strings = [];
  code = code.replace(/(['"])(?:\\.|[^\\])*?\1/g, (m) => {
    strings.push(m);
    return `___STR_LIT_${strings.length - 1}___`;
  });
  return { code, strings };
}
function restoreStrings(code, strings) {
  return code.replace(/___STR_LIT_(\d+)___/g, (_, i) => strings[i]);
}

function stripCommentsAndWhitespace(code) {
  code = code.replace(/--\[\[[\s\S]*?\]\]/g, "");
  code = code.replace(/--[^\r\n]*/g, "");
  code = code
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");
  return code;
}

function minifyLua(code) {
  const { code: codeNoStrings, strings } = extractStrings(code);

  let minified = stripCommentsAndWhitespace(codeNoStrings);

  let localVarRegex =
    /\blocal\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)/g;
  let locals = [];
  let match;
  while ((match = localVarRegex.exec(minified)) !== null) {
    match[1]
      .split(",")
      .map((v) => v.trim())
      .forEach((v) => {
        if (v && !locals.includes(v) && !LUA_K.includes(v)) {
          locals.push(v);
        }
      });
  }

  const nameGen = shortNames();
  const localMap = {};
  for (const v of locals) {
    localMap[v] = nameGen.next().value;
  }

  minified = minified.replace(localVarRegex, (m, vars) => {
    return (
      "local " +
      vars
        .split(",")
        .map((v) => localMap[v.trim()] || v.trim())
        .join(",")
    );
  });

  for (const [orig, short] of Object.entries(localMap)) {
    minified = minified.replace(new RegExp(`\\b${orig}\\b`, "g"), short);
  }

  minified = restoreStrings(minified, strings);

  minified = minified.replace(/\s*([=+\-*/%<>~^#.,:;{}()\[\]])\s*/g, "$1");
  minified = minified.replace(/\s+/g, " ");
  minified = minified.trim();

  const header = [
    "--[[",
    "  Minified by @vyxonq",
    "  https://github.com/vyxonq",
    "  Discord: @vyxonq",
    "  This file was generated and not meant to be modified.",
    "]]--",
  ].join("\n");

  return `${header}\n${minified}`;
}

module.exports = { minifyLua };
