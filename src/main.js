const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const translate = require('./translate');

// 匹配标签中的汉字（不包括标签属性）
const tagTextRegex = />([^<{]*\p{Script=Han}+[^<{]*)</gu;
// 匹配特定标签属性中的汉字
const attrTextRegex = /(placeholder|title)=["']([^"'\p{Script=Han}]*\p{Script=Han}+[^"'\p{Script=Han}]*)["']/gu;
// 去除单行注释
const lineCommentRegex = /\/\/.*$/gm;
// 去除块注释
const blockCommentRegex = /\/\*[\s\S]*?\*\//g;

function extractChinese(text) {
    // 去除注释
    return text.replace(lineCommentRegex, '').replace(blockCommentRegex, '');
}


async function generateUniqueKey(text) {
    let translatedText = await translate(text, 'en');
    // 将翻译后的英文文本转换为驼峰命名
    let words = translatedText.split(/\s+/);
    let camelCaseKey = words[0].toLowerCase() + words.slice(1).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');

    // todo 处理可能的重复键名

    return camelCaseKey.replace(/[^a-zA-Z0-9\s]/g, '');
}

async function loadJsonFile(filePath) {
    try {
        const data = await fs.promises.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        // 如果文件不存在或者为空，返回一个空对象
        return {};
    }
}

async function processDocument(document, jsonFilePath, i18nData, workspaceEdit) {
    const text = document.getText();
    const filteredText = extractChinese(text);
    const jsonFileName = path.basename(jsonFilePath, path.extname(jsonFilePath));

    let matches;
    const existingTranslations = new Set();

    function recordReplacement(range, newText) {
        const existing = text.substring(
            document.offsetAt(range.start), 
            document.offsetAt(range.end)
        );
        existingTranslations.add(existing.trim());
    }

    // 处理标签文本（确保不替换标签属性）
    matches = [...filteredText.matchAll(tagTextRegex)];
    for (let match of matches) {
        const originalText = match[1].trim();
        if (existingTranslations.has(originalText)) continue;
        const uniqueKey = await generateUniqueKey(originalText);

        if (!i18nData[uniqueKey]) {
            i18nData[uniqueKey] = originalText;
        }

        const newText = `{{ $t('${jsonFileName}.${uniqueKey}') }}`;
        const range = new vscode.Range(
            document.positionAt(match.index + match[0].indexOf(originalText)),
            document.positionAt(match.index + match[0].indexOf(originalText) + originalText.length)
        );

        workspaceEdit.replace(document.uri, range, newText);
        recordReplacement(range, newText);
    }

    // 处理特定标签属性文本
    matches = [...filteredText.matchAll(attrTextRegex)];
    for (let match of matches) {
        const attrName = match[1];
        const originalText = match[2].trim();
        if (existingTranslations.has(originalText)) continue;
        const uniqueKey = await generateUniqueKey(originalText);

        if (!i18nData[uniqueKey]) {
            i18nData[uniqueKey] = originalText;
        }

        const newText = `{{ $t('${jsonFileName}.${uniqueKey}') }}`;

        // 处理属性的替换并生成新的属性字符串
        const newAttrText = `${attrName}="${newText}"`;
        const fullMatch = match[0];
        const startIndex = match.index + fullMatch.indexOf(`${attrName}=`);

        const range = new vscode.Range(
            document.positionAt(startIndex),
            document.positionAt(startIndex + fullMatch.length)
        );

        workspaceEdit.replace(document.uri, range, newAttrText);
        recordReplacement(range, newText);
    }
}

module.exports = {
    generateUniqueKey,
    loadJsonFile,
    processDocument
}
