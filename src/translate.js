const translate = require('google-translate-api');
 
translate('你好', {to: 'en'}).then(res => {
    console.log(res.text);
}).catch(err => {
    console.error(err);
});