'use strict';

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    let entry = path.join(path.dirname(vscode.env.appRoot), 'app', 'out');
    if (entry === undefined) {
        vscode.window
            .showErrorMessage(
                'The Nightlife extension is unable to determine the main vscode directory.'
            );
        return;
    }
    const basePath = path.join(entry, 'vs', 'code');
    const htmlPath = path.join(basePath, 'electron-sandbox', 'workbench', 'workbench.html');
    const backupHtmlPath = path.join(basePath, 'electron-sandbox', 'workbench', 'workbench.html.nightlifebak');
    const cssPath = path.join(__dirname, 'nightlife.css');

    /**
     * @param {fs.PathLike} htmlPath
     * @param {fs.PathLike} cssPath
     */
    async function patchHtmlWithCss(htmlPath, cssPath) {
        let html = await fs.promises.readFile(htmlPath, 'utf-8');

        if (!html.includes('NIGHTLIFECSS')) {
            await writeBackupHtml(html, backupHtmlPath);

            const css = await fs.promises.readFile(cssPath, 'utf-8');
            const cssPatch = `<style>${css}</style>`;

            html = html.replace(
                /(<\/html>)/,
                '<!-- NIGHTLIFECSS BEGIN -->\n' +
                cssPatch +
                '<!-- NIGHTLIFECSS END -->\n</html>'
            );

            await fs.promises.writeFile(htmlPath, html, 'utf-8');

            vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
        else {
            vscode.window
                .showInformationMessage(
                    'Nightlife customizations are already enabled. You may need to reload vscode for the effects to take place.'
                );
        }
    }

    /**
     * @param {string} htmlContent
     * @param {fs.PathLike} backupHtmlPath
     */
    async function writeBackupHtml(htmlContent, backupHtmlPath) {
        await fs.promises.writeFile(backupHtmlPath, htmlContent, 'utf-8');
    }

    /**
     * @param {fs.PathLike} htmlPath
     * @param {fs.PathLike} backupHtmlPath
     */
    async function restoreBackupHtml(htmlPath, backupHtmlPath) {
        if (fs.existsSync(backupHtmlPath)) {
            await fs.promises.unlink(htmlPath);
            await fs.promises.copyFile(backupHtmlPath, htmlPath);
            await fs.promises.rm(backupHtmlPath);

            vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
        else {
            let html = await fs.promises.readFile(htmlPath, 'utf-8');

            if (!html.includes('NIGHTLIFECSS')) {
                vscode.window
                    .showInformationMessage(
                        'Nightlife customizations are already disabled. You may need to reload vscode to remove the effects.'
                    );
            }
            else {
                // This should never happen unless the user deleted the backup html file
                vscode.window
                    .showErrorMessage(
                        'The Nightlife extension is unable to find the backup html file and disable the Nightlife effects. If you did not delete the backup html file, please report [here](https://github.com/spacesick/nightlife-vscode-theme/issues/)'
                    );
            }
        }
    }

    async function enableCss() {
        await patchHtmlWithCss(htmlPath, cssPath);
    }

    async function disableCss() {
        await restoreBackupHtml(htmlPath, backupHtmlPath);
    }

    let enableCssRegister = vscode.commands.registerCommand('nightlife.enableCustomizations', enableCss);
    let disableCssRegister = vscode.commands.registerCommand('nightlife.disableCustomizations', disableCss);

    context.subscriptions.push(enableCssRegister);
    context.subscriptions.push(disableCssRegister);
}

function deactivate() {
    // This is intentionally empty
}

module.exports = {
    activate,
    deactivate
};
