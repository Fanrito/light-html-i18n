const vscode = require('vscode');
const path = require('path');
const main = require('./src/main.js');
const fs = require('fs');

const CONFIG_KEY_CN = 'i18nFilePath_cn';
const CONFIG_KEY_EN = 'i18nFilePath_en';


function activate(context) {
    let disposable = vscode.commands.registerCommand('extension.toI18n', async function () {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const document = editor.document;
        const workspaceEdit = new vscode.WorkspaceEdit();

        const configPath_cn = vscode.workspace.getConfiguration().get(CONFIG_KEY_CN);
        const configPath_en = vscode.workspace.getConfiguration().get(CONFIG_KEY_EN);

        if (!configPath_cn || !configPath_en) {
            vscode.window.showErrorMessage('Please configure the i18n file path.');
            return;
        }

        const rootPath = vscode.workspace.rootPath;
        if (!rootPath) {
            vscode.window.showErrorMessage('No workspace folder is open.');
            return;
        }

        const jsonFilePath_cn = path.join(rootPath, configPath_cn);
        const jsonFilePath_en = path.join(rootPath, configPath_en);

        try {
            const i18nData_cn = await main.loadJsonFile(jsonFilePath_cn);
            const i18nData_en = await main.loadJsonFile(jsonFilePath_en);

            await main.processDocument(document, jsonFilePath_cn, i18nData_cn, i18nData_en, workspaceEdit);

            await vscode.workspace.applyEdit(workspaceEdit);

            fs.writeFileSync(jsonFilePath_cn, JSON.stringify(i18nData_cn, null, 2));
            fs.writeFileSync(jsonFilePath_en, JSON.stringify(i18nData_en, null, 2));

            vscode.window.showInformationMessage('Text has been converted to i18n keys.');
        } catch (error) {
            vscode.window.showErrorMessage(`Error processing i18n: ${error.message}`);
        }
    });

    context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = { activate, deactivate };
