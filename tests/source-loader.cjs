const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Vite handles artwork at runtime; these tests exercise the real game code in Node.
exports.loadSource = function loadSource(relative, overrides = {}, cache = new Map()) {
    const filename = path.resolve(__dirname, '..', relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const localRequire = id => {
        if (Object.hasOwn(overrides, id)) return overrides[id];
        if (/\.(png|jpg|webp)$/.test(id)) return { default: id };
        if (id.startsWith('.')) {
            const target = path.resolve(path.dirname(filename), id);
            return loadSource(path.relative(path.resolve(__dirname, '..'), `${target}.ts`), overrides, cache);
        }
        return require(id);
    };
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
    }).outputText;
    new Function('require', 'module', 'exports', compiled)(localRequire, module, module.exports);
    return module.exports;
};
