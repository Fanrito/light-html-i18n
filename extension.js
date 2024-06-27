const vscode = require('vscode');
const path = require('path');
const main = require('./src/main.js');
const fs = require('fs');

const CONFIG_KEY = 'i18nFilePath';

function activate(context) {
    let disposable = vscode.commands.registerCommand('extension.toI18n', async function () {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const document = editor.document;
        const workspaceEdit = new vscode.WorkspaceEdit();

        const configPath = vscode.workspace.getConfiguration().get(CONFIG_KEY);
        if (!configPath) {
            vscode.window.showErrorMessage('Please configure the i18n file path.');
            return;
        }

        const rootPath = vscode.workspace.rootPath;
        if (!rootPath) {
            vscode.window.showErrorMessage('No workspace folder is open.');
            return;
        }

        const jsonFilePath = path.join(rootPath, configPath);
        try {
            const i18nData = await main.loadJsonFile(jsonFilePath);

            await main.processDocument(document, jsonFilePath, i18nData, workspaceEdit);

            await vscode.workspace.applyEdit(workspaceEdit);

            fs.writeFileSync(jsonFilePath, JSON.stringify(i18nData, null, 2));
            vscode.window.showInformationMessage('Text has been converted to i18n keys.');
        } catch (error) {
            vscode.window.showErrorMessage(`Error processing i18n: ${error.message}`);
        }
    });

    let configureCommand = vscode.commands.registerCommand('extension.configureI18n', async function () {
        const i18nFilePath = await vscode.window.showInputBox({
            prompt: 'Please enter the i18n JSON file path relative to the workspace root',
            placeHolder: 'i18n/messages.json'
        });
        if (i18nFilePath) {
            await vscode.workspace.getConfiguration().update(CONFIG_KEY, i18nFilePath, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(`i18n file path set to: ${i18nFilePath}`);
        }
    });

    context.subscriptions.push(disposable, configureCommand);
}

function deactivate() {}

module.exports = { activate, deactivate };
