const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
let allOk = true;

const htmlFiles = [];
function findHtmlFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file.startsWith('.')) continue;
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            findHtmlFiles(fullPath);
        } else if (file.endsWith('.html')) {
            htmlFiles.push(fullPath);
        }
    }
}
findHtmlFiles(rootDir);

const missingAssets = new Set();
const jsErrors = [];

for (const htmlFile of htmlFiles) {
    const content = fs.readFileSync(htmlFile, 'utf8');
    const regex = /(?:src|href)=["']([^"']+)["']/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        let assetUrl = match[1];
        if (assetUrl.startsWith('http') || assetUrl.startsWith('//') || assetUrl.startsWith('mailto:') || assetUrl.startsWith('tel:') || assetUrl.startsWith('#')) {
            continue;
        }
        // Remove query params
        assetUrl = assetUrl.split('?')[0].split('#')[0];
        
        let assetPath = path.join(rootDir, assetUrl);
        // if not found from root, try relative to html file
        if (!fs.existsSync(assetPath)) {
            const relPath = path.join(path.dirname(htmlFile), assetUrl);
            if (fs.existsSync(relPath)) {
                assetPath = relPath;
            }
        }
        
        if (!fs.existsSync(assetPath)) {
            missingAssets.add(`Missing: ${assetUrl} in ${path.basename(htmlFile)}`);
            allOk = false;
        }
    }
}

console.log("Missing Assets:");
missingAssets.forEach(m => console.log(m));
if (missingAssets.size === 0) console.log("None");

// Check JS files for basic syntax errors
const jsFiles = [];
function findJsFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file.startsWith('.')) continue;
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            findJsFiles(fullPath);
        } else if (file.endsWith('.js')) {
            jsFiles.push(fullPath);
        }
    }
}
findJsFiles(rootDir);

console.log("\nChecking JS syntax:");
for (const jsFile of jsFiles) {
    try {
        const content = fs.readFileSync(jsFile, 'utf8');
        new Function(content); // Extremely basic syntax check
    } catch (e) {
        if (e instanceof SyntaxError) {
            // new Function wrapping might fail on imports/exports
            if (!content.includes('import ') && !content.includes('export ')) {
                 console.log(`Syntax Error in ${path.basename(jsFile)}: ${e.message}`);
                 allOk = false;
            }
        }
    }
}
console.log("JS syntax check complete.");

if (allOk) {
    console.log("\nALL CHECKS PASSED.");
} else {
    console.log("\nSOME CHECKS FAILED.");
}
