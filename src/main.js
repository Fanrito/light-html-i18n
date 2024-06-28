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

// 创建缓存对象
const translationCache = new Map();

async function generateUniqueKey(translatedText) {
    // 去掉特殊符号，转换为驼峰命名
    let words = translatedText.split(/\s+/);
    let camelCaseKey = (words[0].toLowerCase() + words.slice(1).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')).replace(/[^a-zA-Z0-9]/g, '');
    return camelCaseKey;
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

async function processDocument(document, jsonFilePath_cn, i18nData_cn, i18nData_en, workspaceEdit) {
    const text = document.getText();
    const filteredText = extractChinese(text);
    const jsonFileName = path.basename(jsonFilePath_cn, path.extname(jsonFilePath_cn));

    let matches;
    const existingTranslations = new Set();

    function recordReplacement(range, newText) {
        const existing = text.substring(
            document.offsetAt(range.start),
            document.offsetAt(range.end)
        );
        existingTranslations.add(existing.trim());
    }

    // 收集所有需要翻译的文本
    let textsToTranslate = [];
    matches = [...filteredText.matchAll(tagTextRegex), ...filteredText.matchAll(attrTextRegex)];
    for (let match of matches) {
        const originalText = match[1] ? match[1].trim() : match[2].trim();
        if (!existingTranslations.has(originalText) && !translationCache.has(originalText)) {
            textsToTranslate.push(originalText);
        }
    }

    // 批量翻译文本
    let allTranslatedTexts = [];
    for (let text of textsToTranslate) {
        const translatedText = await translate(text, 'en');
        allTranslatedTexts.push(translatedText);
    }

    // 更新缓存
    textsToTranslate.forEach((originalText, index) => {
        translationCache.set(originalText, allTranslatedTexts[index]);
    });

    matches = [...filteredText.matchAll(tagTextRegex)];
    for (let match of matches) {
        const originalText = match[1].trim();
        if (existingTranslations.has(originalText)) continue;

        let translatedText = translationCache.get(originalText);
        if (translatedText === undefined) {
            // 如果翻译丢失，我们重新翻译原始文本
            translatedText = await translate(originalText, 'en');
            translationCache.set(originalText, translatedText); // 更新缓存
        }
        if (translatedText === undefined) {
            // 如果重新翻译还是不行，则跳过这个词
            continue;
        }
        const camelCaseKey = await generateUniqueKey(translatedText);

        if (!i18nData_cn[camelCaseKey]) {
            i18nData_cn[camelCaseKey] = originalText;
        }

        if (!i18nData_en[camelCaseKey]) {
            i18nData_en[camelCaseKey] = translatedText;
        }

        const newText = `{{ $t('${jsonFileName}.${camelCaseKey}') }}`;
        const range = new vscode.Range(
            document.positionAt(match.index + match[0].indexOf(originalText)),
            document.positionAt(match.index + match[0].indexOf(originalText) + originalText.length)
        );

        workspaceEdit.replace(document.uri, range, newText);
        recordReplacement(range, newText);
    }

    matches = [...filteredText.matchAll(attrTextRegex)];
    for (let match of matches) {
        const attrName = match[1];
        const originalText = match[2].trim();
        if (existingTranslations.has(originalText)) continue;

        let translatedText = translationCache.get(originalText);
        if (translatedText === undefined) {
            // 如果翻译丢失，我们重新翻译原始文本
            translatedText = await translate(originalText, 'en');
            translationCache.set(originalText, translatedText); // 更新缓存
        }
        if (translatedText === undefined) {
            // 如果重新翻译还是不行，则跳过这个词
            continue;
        }
        const camelCaseKey = await generateUniqueKey(translatedText);

        if (!i18nData_cn[camelCaseKey]) {
            i18nData_cn[camelCaseKey] = originalText;
        }

        if (!i18nData_en[camelCaseKey]) {
            i18nData_en[camelCaseKey] = translatedText;
        }

        const newText = `{{ $t('${jsonFileName}.${camelCaseKey}') }}`;
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
