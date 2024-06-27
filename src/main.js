const fs = require('fs');
const path = require('path');
const vscode = require('vscode'); // 确保引入vscode模块

function extractChinese(text) {
    // 去除所有单行注释
    text = text.replace(/\/\/.*$/gm, ''); 

    // 匹配标签中的汉字
    const tagRegex = /<[^>]*>([^<]*[\u4e00-\u9fa5]+[^<]*)<\/[^>]*>/g;
    // 匹配标签属性中的汉字
    const attrRegex = /<[^>]*\s+[^>]*[\u4e00-\u9fa5]+[^>]*>/g;
    // 匹配双花括号中的汉字
    const doubleBraceRegex = /{{[^{}]*[\u4e00-\u9fa5]+[^{}]*}}/g;

    const regexes = [tagRegex, attrRegex, doubleBraceRegex];
    const matches = [];

    regexes.forEach(regex => {
        let match;
        while ((match = regex.exec(text)) !== null) {
            matches.push({ match: match[0], index: match.index });
        }
    });

    return matches;
}


function generateKey(text) {
    // 暂时使用中文做唯一key
    return text;
}

// /**
//  * 使用驼峰命名key，但是问题：需要使用翻译API
//  * @param {*} text 
//  * @param {*} existingKeys 
//  * @returns 
//  */
// async function generateKey(text, existingKeys) {
//   // 假设已有的翻译函数，实际应用请替换为合适的API调用
//   let translatedText = await translateToEnglish(text);

//   // 将翻译后的英文文本转换为驼峰命名
//   let words = translatedText.split(/\s+/);
//   let camelCaseKey = words[0].toLowerCase() + words.slice(1).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');

//   // 处理可能的重复键名
//   let key = camelCaseKey;
//   let count = 1;

//   while (existingKeys[key]) {
//       key = `${camelCaseKey}_${count}`;
//       count++;
//   }

//   return key;
// }

function loadJsonFile(filePath) {
    if (!fs.existsSync(filePath)) {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, '{}', 'utf-8');
    }

    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function processMatches(matches, i18nData, jsonFilePath, workspaceEdit, document) {
    for (const match of matches) {
        const uniqueKey = generateKey(match.match);
        if (!i18nData[uniqueKey]) {
            // 添加到 JSON 对象中
            i18nData[uniqueKey] = match.match;
        }

        // 替换文档中的匹配项
        const range = new vscode.Range(
            document.positionAt(match.index),
            document.positionAt(match.index + match.match.length)
        );
        const newText = replaceWithI18nTemplate(match.match, uniqueKey, jsonFilePath);
        workspaceEdit.replace(document.uri, range, newText);
    }
}

function replaceWithI18nTemplate(match, uniqueKey, jsonFilePath) {
    let replaced = match;
    const jsonFileName = path.basename(jsonFilePath, path.extname(jsonFilePath));
    // 将替换细节放在此处
    replaced = replaced.replace(/(>)([^<]*[\u4e00-\u9fa5]+[^<]*)(<)/g, `$1{{ $t('${jsonFileName}.${uniqueKey}') }}$3`);
    replaced = replaced.replace(/(\s+[^>]*)([\u4e00-\u9fa5]+)([^>]*>)/g, `$1{{ $t('${jsonFileName}.${uniqueKey}') }}$3`);
    replaced = replaced.replace(/{{([^{}]*)([\u4e00-\u9fa5]+)([^{}]*)}}/g, `{{ $1 i18n.$t('${jsonFileName}.${uniqueKey}') $3 }}`);
    return replaced;
}

module.exports = {
    extractChinese,
    generateKey,
    loadJsonFile,
    processMatches
};
