const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const main = require('./src/main');

const CONFIG_KEY = 'i18nFilePath';

function activate(context) {
    let disposable = vscode.commands.registerCommand('extension.toI8n', function () {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const document = editor.document;
        const text = document.getText();

        const result = main.extractChinese(text);

        const configPath = vscode.workspace.getConfiguration().get(CONFIG_KEY);
        if (!configPath) {
            vscode.window.showErrorMessage('Please configure the i18n file path.');
            return;
        }

        const jsonFilePath = path.join(vscode.workspace.rootPath, configPath);
        const i18nData = main.loadJsonFile(jsonFilePath);
        const workspaceEdit = new vscode.WorkspaceEdit();

        // 传递 `document` 对象
        main.processMatches(result, i18nData, jsonFilePath, workspaceEdit, document);

        fs.writeFileSync(jsonFilePath, JSON.stringify(i18nData, null, 2));
        vscode.workspace.applyEdit(workspaceEdit); // 在这里应用编辑
    });

    let configureCommand = vscode.commands.registerCommand('extension.configureI18n', async function () {
        const i18nFilePath = await vscode.window.showInputBox({
            prompt: 'Please enter the i18n JSON file path relative to the workspace root',
            placeHolder: 'i18n/messages.json'
        });
        if (i18nFilePath) {
            vscode.workspace.getConfiguration().update(CONFIG_KEY, i18nFilePath, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(`i18n file path set to: ${i18nFilePath}`);
        }
    });

    context.subscriptions.push(disposable, configureCommand);
}

function deactivate() {}

module.exports = { activate, deactivate };
