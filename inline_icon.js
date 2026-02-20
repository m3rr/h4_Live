
const fs = require('fs');
const path = require('path');

const iconPath = path.join(__dirname, 'js/assets/h4_icon.png');
const dashboardPath = path.join(__dirname, 'js/h4_Dashboard.js');

try {
    // 1. Read Image & Convert to Base64
    const imgBuffer = fs.readFileSync(iconPath);
    const b64 = imgBuffer.toString('base64');
    const dataUri = `data:image/png;base64,${b64}`;

    console.log(`[Icon] Read ${imgBuffer.length} bytes. Base64 length: ${b64.length}`);

    // 2. Read Dashboard File
    let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

    // 3. Replace the specific line
    // We are looking for: const iconUrl = ... ;
    // Regex allows for flexibility in whitespace/quotes
    const regex = /const iconUrl = .*?;/s;

    if (regex.test(dashboardContent)) {
        const replacement = `const iconUrl = "${dataUri}"; // NUCLEAR OPTION: INLINED BASE64`;
        dashboardContent = dashboardContent.replace(regex, replacement);

        // 4. Write Back
        fs.writeFileSync(dashboardPath, dashboardContent, 'utf8');
        console.log("[Success] Inlined Base64 icon into h4_Dashboard.js");
    } else {
        console.error("[Error] Could not find 'const iconUrl =' line in h4_Dashboard.js");
    }

} catch (e) {
    console.error("[Error]", e);
}
