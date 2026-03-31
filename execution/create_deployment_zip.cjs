const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(backendDir, 'public');
const tmpDeployDir = path.join(rootDir, '.tmp', 'deploy_staging');
const zipFile = path.join(rootDir, 'shravya-deploy.zip');

console.log('--- Shravya Tours Deployment Zip Creator ---');

try {
    // 1. Clean previous builds
    console.log('1. Cleaning up previous builds...');
    if (fs.existsSync(distDir)) fs.rmSync(distDir, { recursive: true, force: true });
    if (fs.existsSync(publicDir)) fs.rmSync(publicDir, { recursive: true, force: true });
    if (fs.existsSync(tmpDeployDir)) fs.rmSync(tmpDeployDir, { recursive: true, force: true });
    if (fs.existsSync(zipFile)) fs.rmSync(zipFile, { force: true });

    // 2. Build the frontend
    console.log('2. Building the Vite frontend...');
    execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });

    // 3. Move dist to backend/public
    console.log('3. Moving frontend build to backend/public...');
    fs.cpSync(distDir, publicDir, { recursive: true });

    // 4. Copy backend files to .tmp/deploy_staging (excluding node_modules)
    console.log('4. Staging files for compression...');
    fs.mkdirSync(tmpDeployDir, { recursive: true });

    const copyRecursiveSync = (src, dest) => {
        const exists = fs.existsSync(src);
        const stats = exists && fs.statSync(src);
        const isDirectory = exists && stats.isDirectory();
        if (isDirectory) {
            if (path.basename(src) === 'node_modules') return;
            fs.mkdirSync(dest, { recursive: true });
            fs.readdirSync(src).forEach((childItemName) => {
                copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
            });
        } else {
            // Ignore existing deployment zips inside backend just in case
            if (path.extname(src) === '.zip') return;
            fs.copyFileSync(src, dest);
        }
    };

    copyRecursiveSync(backendDir, tmpDeployDir);

    // 5. Compress
    console.log('5. Compressing into shravya-deploy.zip (this might take a moment)...');
    try {
        execSync(`powershell -Command "Compress-Archive -Path '${tmpDeployDir}\\*' -DestinationPath '${zipFile}' -Force"`, { stdio: 'inherit' });
        console.log(`\n✅ Success! Deployment ZIP created at: ${zipFile}`);
    } catch (e) {
        console.error('Failed to create ZIP file with powershell.');
        console.error(e);
        process.exit(1);
    }

    // 6. Cleanup
    console.log('6. Cleaning up staging directory...');
    if (fs.existsSync(tmpDeployDir)) fs.rmSync(tmpDeployDir, { recursive: true, force: true });
    console.log('Done.');

} catch (err) {
    console.error('\n❌ An error occurred during the build/zip process:', err);
    process.exit(1);
}
