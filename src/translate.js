const https = require('https');
const querystring = require('querystring');

class GoogleTrans {
    constructor() {
        this.url = 'https://translate.google.com/translate_a/single';
        this.TKK = "434674.96463358";  // 需要根据具体情况更新的TKK值
        this.headers = {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
            "accept-language": "zh-CN,zh;q=0.9",
            "cache-control": "max-age=0",
            "upgrade-insecure-requests": "1",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.142 Safari/537.36",
            "referrer": "https://translate.google.com/",
            "authority": "translate.google.com",
            "origin": "https://translate.google.com",
        };
    }

    uo(a, b) {
        for (let c = 0; c < b.length - 2; c += 3) {
            let d = b.charAt(c + 2);
            d = "a" <= d ? d.charCodeAt(0) - 87 : Number(d);
            d = "+" === b.charAt(c + 1) ? a >>> d : a << d;
            a = "+" === b.charAt(c) ? a + d & 4294967295 : a ^ d;
        }
        return a;
    }

    wo(a, TKK) {
        const d = TKK.split(".");
        let b = Number(d[0]);
        const e = [];

        for (let f = 0, g = 0; g < a.length; g++) {
            let h = a.charCodeAt(g);
            if (128 > h) {
                e[f++] = h;
            } else {
                if (2048 > h) {
                    e[f++] = h >> 6 | 192;
                } else {
                    if (55296 == (h & 64512) && g + 1 < a.length && 56320 == (a.charCodeAt(g + 1) & 64512)) {
                        h = 65536 + ((h & 1023) << 10) + (a.charCodeAt(++g) & 1023);
                        e[f++] = h >> 18 | 240;
                        e[f++] = h >> 12 & 63 | 128;
                    } else {
                        e[f++] = h >> 12 | 224;
                        e[f++] = h >> 6 & 63 | 128;
                    }
                }
                e[f++] = h & 63 | 128;
            }
        }

        a = b;
        for (let f = 0; f < e.length; f++) {
            a += e[f];
            a = this.uo(a, "+-a^+6");
        }
        a = this.uo(a, "+-3^+b+-f");
        a ^= Number(d[1]) || 0;
        a = 0 > a ? (a & 2147483647) + 2147483648 : a;
        a %= 1E6;

        return a.toString() + "." + (a ^ b);
    }

    constructUrl(data) {
        const queryString = querystring.stringify(data);
        return `${this.url}?${queryString}`;
    }

    async query(q, langTo = 'en') {
        try {
            let urlData = {
                client: 'webapp',
                sl: 'auto',
                tl: langTo,
                hl: 'zh-CN',
                dt: 'at',
                dt: 'bd',
                dt: 'ex',
                dt: 'ld',
                dt: 'md',
                dt: 'qca',
                dt: 'rw',
                dt: 'rm',
                dt: 'ss',
                dt: 't',
                otf: '2',
                ssel: '0',
                tsel: '0',
                kc: '1',
                tk: this.wo(q, this.TKK),
                q: q
            };

            const url = this.constructUrl(urlData);
            const response = await this.makeRequest(url);

            if (!response) {
                throw new Error('Response is empty');
            }

            const parsedResponse = JSON.parse(response);
            const targetText = parsedResponse[0][0][0];

            return targetText;
        } catch (error) {
            throw new Error(`Translation failed: ${error.message}`);
        }
    }

    async makeRequest(url) {
        return new Promise((resolve, reject) => {
            https.get(url, { headers: this.headers }, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    // Debug output
                    if (data.startsWith('<')) {
                        console.error('Received HTML response, possibly an error or redirect:', data);
                        return reject(new Error('Received HTML response, possibly an error or redirect'));
                    }

                    resolve(data);
                });
            }).on('error', (err) => {
                reject(err);
            });
        });
    }
}

async function translate(text, targetLang = 'en') {
    try {
        const translator = new GoogleTrans();
        const translatedText = await translator.query(text, targetLang);
        console.log(`Translated text: ${translatedText}`);
        return translatedText;
    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
}
module.exports = translate;
// Example usage
translate('支付合同', 'en');
