
/**
 * 汉字与拼音互转工具，根据导入的字典文件的不同支持不同
 * 对于多音字目前只是将所有可能的组合输出，准确识别多音字需要完善的词库，而词库文件往往比字库还要大，所以不太适合web环境。
 * @start 2016-09-26
 * @last 2016-09-29
 */
;(function(global, factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        module.exports = factory(global);
    } else {
        factory(global);
    }
})(typeof window !== "undefined" ? window : this, function(window) {

    var toneMap =
        {
            "ā": "a1",
            "á": "a2",
            "ǎ": "a3",
            "à": "a4",
            "ō": "o1",
            "ó": "o2",
            "ǒ": "o3",
            "ò": "o4",
            "ē": "e1",
            "é": "e2",
            "ě": "e3",
            "è": "e4",
            "ī": "i1",
            "í": "i2",
            "ǐ": "i3",
            "ì": "i4",
            "ū": "u1",
            "ú": "u2",
            "ǔ": "u3",
            "ù": "u4",
            "ü": "v0",
            "ǖ": "v1",
            "ǘ": "v2",
            "ǚ": "v3",
            "ǜ": "v4",
            "ń": "n2",
            "ň": "n3",
            "": "m2"
        };

    var dict = {}; // 存储所有字典数据
    var pinyinUtil =
        {
            /**
             * 解析各种字典文件，所需的字典文件必须在本JS之前导入
             */
            parseDict: function()
            {
                // 如果导入了 pinyin_dict_withtone.js
                if(window.pinyin_dict_withtone)
                {
                    dict.withtone = {}; // 汉字与拼音映射，多音字用空格分开，类似这种结构：{'大': 'da tai'}
                    var temp = pinyin_dict_withtone.split(',');
                    for(var i=0, len = temp.length; i<len; i++)
                    {
                        // 这段代码耗时28毫秒左右，对性能影响不大，所以一次性处理完毕
                        dict.withtone[String.fromCharCode(i + 19968)] = temp[i]; // 这里先不进行split(' ')，因为一次性循环2万次split比较消耗性能
                    }

					// 将字典文件解析成拼音->汉字的结构
					// 与先分割后逐个去掉声调相比，先一次性全部去掉声调然后再分割速度至少快了3倍，前者大约需要120毫秒，后者大约只需要30毫秒（Chrome下）
					var notone = pinyinUtil.removeTone(pinyin_dict_withtone).split(',');
					var py2hz = {}, py, hz;
					for(var i=0, len = notone.length; i<len; i++)
					{
						hz = String.fromCharCode(i + 19968); // 汉字
						py = notone[i].split(' '); // 去掉了声调的拼音数组
						for(var j=0; j<py.length; j++)
						{
							py2hz[py[j]] = (py2hz[py[j]] || '') + hz;
						}
					}
					dict.py2hz = py2hz;

                }
            },
            /**
             * 根据汉字获取拼音，如果不是汉字直接返回原字符
             * @param chinese 要转换的汉字
             * @param splitter 分隔字符，默认用空格分隔
             * @param withtone 返回结果是否包含声调，默认是
             * @param polyphone 是否支持多音字，默认否
             */
            getPinyin: function(chinese, splitter, withtone, polyphone)
            {
                if(!chinese || /^ +$/g.test(chinese)) return '';
                if(new RegExp("^[A-Za-z]+$").test(chinese.replace(/\s*/g,""))) return [chinese.toLowerCase()];
                splitter = splitter == undefined ? ' ' : splitter;
                withtone = withtone == undefined ? true : withtone;
                polyphone = polyphone == undefined ? false : polyphone;
                var result = [];
                if(dict.withtone) // 优先使用带声调的字典文件
                {
                    var noChinese = '';
                    for (var i=0, len = chinese.length; i < len; i++)
                    {
                        var pinyin = dict.withtone[chinese[i]];
                        if(pinyin)
                        {
                            // 如果不需要多音字，默认返回第一个拼音，后面的直接忽略
                            // 所以这对数据字典有一定要求，常见字的拼音必须放在最前面
                            if(!polyphone) pinyin = pinyin.replace(/ .*$/g, '');
                            if(!withtone) pinyin = this.removeTone(pinyin); // 如果不需要声调
                            //空格，把noChinese作为一个词插入
                            noChinese && ( result.push( noChinese), noChinese = '' );
                            result.push( pinyin );
                        }
                        else if ( !chinese[i] || /^ +$/g.test(chinese[i]) ){
                            //空格，把noChinese作为一个词插入
                            noChinese && ( result.push( noChinese), noChinese = '' );
                        }
                        else{
                            noChinese += chinese[i];
                        }
                    }
                    if ( noChinese ){
                        result.push( noChinese.toLowerCase());
                        noChinese = '';
                    }
                }
                else
                {
                    throw '抱歉，未找到合适的拼音字典文件！';
                }
                if(!polyphone) return result.join(splitter);
                else
                {
                    return handlePolyphone(result, ' ', splitter);
                }
            },
            /**
             * 获取汉字的拼音首字母
             * @param str 汉字字符串，如果遇到非汉字则原样返回
             * @param polyphone 是否支持多音字，默认false，如果为true，会返回所有可能的组合数组
             */
            getFirstLetter: function(str, polyphone)
            {
                polyphone = polyphone == undefined ? false : polyphone;
                if(!str || /^ +$/g.test(str)) return '';
                if(new RegExp("^[A-Za-z]+$").test(str.replace(/\s*/g,""))) return [str.toLowerCase()];
                if(!/[\u4e00-\u9fa5]/.test(str))return [str];
				var py = this.getPinyin(str, ' ', false, polyphone);
				py = py instanceof Array ? py : [py];
				var result = [];
				for(var i=0; i<py.length; i++)
				{
					result.push(py[i].replace(/(^| )(\w)\w*/g, function(m,$1,$2){return $2.toLowerCase();}));
				}
				if(!polyphone) return result[0];
				else return simpleUnique(result);
            },
            /**
             * 去除拼音中的声调，比如将 xiǎo míng tóng xué 转换成 xiao ming tong xue
             * @param pinyin 需要转换的拼音
             */
            removeTone: function(pinyin)
            {
                return pinyin.replace(/[āáǎàōóǒòēéěèīíǐìūúǔùüǖǘǚǜńň]/g, function(m){ return toneMap[m][0]; });
            },
        };


    /**
     * 处理多音字，将类似['D', 'ZC', 'F']转换成['DZF', 'DCF']
     * 或者将 ['chang zhang', 'cheng'] 转换成 ['chang cheng', 'zhang cheng']
     */
    function handlePolyphone(array, splitter, joinChar)
    {
        splitter = splitter || '';
        var result = [''], temp = [];
        for(var i=0; i<array.length; i++)
        {
            temp = [];
            var t = array[i].split(splitter);
            for(var j=0; j<t.length; j++)
            {
                for(var k=0; k<result.length; k++)
                    temp.push(result[k] + (result[k]?joinChar:'') + t[j]);
            }
            result = temp;
        }
        return simpleUnique(result);
    }

    // 简单数组去重
    function simpleUnique(array)
    {
        var result = [];
        var hash = {};
        for(var i=0; i<array.length; i++)
        {
            var key = (typeof array[i]) + array[i];
            if(!hash[key])
            {
                result.push(array[i]);
                hash[key] = true;
            }
        }
        return result;
    }

    pinyinUtil.parseDict();
    pinyinUtil.dict = dict;
    window.pinyinUtil = pinyinUtil;

});