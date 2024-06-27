# light-html-i18n README

简单的html国际化方案

配合公司内的i18n使用。

注意：本方案只支持只含纯html标签的文件，如一个文件里有一个div，所有的模板都写在这个div里，没有script和css等，也没有meta等单页面的html标签。
  即文件一定要纯净，只含标签，否则可能匹配到不合适的汉字

1. 汉字匹配和替换规则
位于标签中的汉字，如<span>汉字123</span> 替换为 <span>{{ $t('[对应的json文件名].unique-key') }}</span>
位于标签属性的汉字，如<span title="汉字"></span> 替换为 <span title="{{ $t('[对应的json文件名].unique-key') }}"></span>
位于标签中的双花括号之间的汉字，如<span>{{test ? "汉字" : "中文" }}</span> 替换为 <span>{{test ? i18n.$t("[对应的json文件名].unique-key") : i18n.$t("[对应的json文件名].unique-key") }}</span>
过滤单行注释

2. unique-key生成规则
目前是直接使用汉字作为key
<!-- 是否有必要改为使用驼峰英文作为唯一key？缺点：需要使用翻译API -->

3. json生成规则
json生成的位置和名称：由用户在vscode的配置文件settings.json中指定， 例如"i18nFilePath": "src/locales/fin.json"
当json为空或者文件不存在，将检测的汉字当做value，将生成的unique-key当做key，存储在json中
当json文件不为空，执行智能替换。备注：主要是防止国际化后，执行JSON生成命令误操作，会导致json数据为空或错误
去重：检查json中是否已经存在该value，如果存在，这次不生成该key，直接使用已有的key

举个例子：
比如你配置了"i18nFilePath": "src/locales/fin.json"
然后使用插件对<span>汉字123</span>做的替换
则fin.json中会出现
"汉字123": "汉字123"
然后原本的<span>汉字123</span> 会被替换为 <span>{{ $t('fin.汉字123') }}</span>

4. 使用方法
首先在settings.json中配置i18nFilePath
然后在需要国家化的页面中，按ctrl+shift+p换出vscode的命令面板，输入toI18n，选择Convert to i18n即可。
可以为该命令添加自己喜欢的快捷键。
