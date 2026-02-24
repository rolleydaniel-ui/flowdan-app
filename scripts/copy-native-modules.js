const path = require('path');
const fs = require('fs');

// Modules that are webpack externals and need to be in packaged node_modules
const NATIVE_MODULES = ['sql.js', 'uiohook-napi'];

module.exports = async (buildPath, electronVersion, platform, arch, callback) => {
  const srcNodeModules = path.resolve(__dirname, '..', 'node_modules');
  const destNodeModules = path.join(buildPath, 'node_modules');

  for (const mod of NATIVE_MODULES) {
    const src = path.join(srcNodeModules, mod);
    const dest = path.join(destNodeModules, mod);

    if (fs.existsSync(src)) {
      copyDirSync(src, dest);
      console.log(`  Copied native module: ${mod}`);

      // Also copy any scoped dependencies the module needs
      const modPkg = JSON.parse(fs.readFileSync(path.join(src, 'package.json'), 'utf8'));
      const allDeps = { ...modPkg.dependencies, ...modPkg.optionalDependencies };
      for (const dep of Object.keys(allDeps || {})) {
        const depSrc = path.join(srcNodeModules, dep);
        const depDest = path.join(destNodeModules, dep);
        if (fs.existsSync(depSrc) && !fs.existsSync(depDest)) {
          copyDirSync(depSrc, depDest);
          console.log(`    + dependency: ${dep}`);
        }
      }
    } else {
      console.warn(`  WARNING: ${mod} not found in node_modules`);
    }
  }

  callback();
};

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
