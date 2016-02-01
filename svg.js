var cheerio = require('cheerio');
var loaderUtils = require('loader-utils');


module.exports.createSymbol = function createSymbol(id, escapeId, content) {
    var doc = cheerio.load(content, {
        normalizeWhitespace: true,
        xmlMode: true
    });

    var svgNode = doc('svg');

    var firstChild = svgNode.children().first();
    var realNode;
    var resultCode = '';
    if (firstChild.is('symbol')) {
        realNode = firstChild;
        resultCode = firstChild.html();
    } else {
        realNode = svgNode;
        resultCode = svgNode.html();
    }

    var symbol = cheerio.load('<symbol>' + resultCode + '</symbol>',  {
        normalizeWhitespace: true,
        xmlMode: true
    });

    var symbolNode = symbol.root().children('symbol');
    var styleNode = symbol('style');

    if (styleNode.length) {
        var text = styleNode.text();
        items = symbol('[class]');
        var processed = {};
        items.each(function(i, item) {
            var item = symbol(item);
            var cssClassAttr = item.attr('class');
            if (cssClassAttr) {
                var classes = cssClassAttr.split(' ');
                classes.forEach(function(cls) {
                    var escapedCls = escapeId + '__' + cls;
                    cssClassAttr = cssClassAttr.replace(cls, escapedCls);

                    if (!processed[cls]) {
                        processed[cls] = true;
                        text = text.replace(cls, escapedCls);
                    }
                });
            }
            item.attr('class', cssClassAttr);
        });

        styleNode.text(text);
    }

    symbolNode.attr('id', id);
    symbolNode.attr('viewBox', realNode.attr('viewBox'));
    symbolNode.attr('style', svgNode.attr('style'));

    return symbol;
}

function SvgStore() {
    this.symbols = {};
}

module.exports.SvgStore = SvgStore;

SvgStore.ensure = function ensure(context) {
    var compiler = context._compiler;
    if (typeof compiler.__svg_store__ === 'undefined') {
        var store = compiler.__svg_store__ = new SvgStore();
        var content, id;

        compiler.plugin('after-compile', function(compilation, callback) {
            content = store.toString();
            // Calculate sprite symbol id
            id = loaderUtils.interpolateName(context, '[hash].svg', {
                context: context.options.context,
                content: content
            });

            callback();
        });

        compiler.plugin('emit', function(compilation, callback) {
            compilation.assets['sprite.svg'] = {
                source: function() {
                    return content;
                },
                size: function() {
                    return content.length;
                }
            };

            callback();
        });
    }

    return compiler.__svg_store__;
}

SvgStore.prototype.addSymbol = function addSymbol(id, symbol) {
    this.symbols[id] = symbol;
}

SvgStore.prototype.toString = function toString() {
    var doc = cheerio.load('<svg><defs><style type="text/css"></style></defs></svg>', {
        normalizeWhitespace: true,
        xmlMode: true
    });

    var svgNode = doc('svg');
    var styleNode = doc('style');
    var defsNode = doc('defs');

    svgNode.attr('xmlns', 'http://www.w3.org/2000/svg');
    svgNode.attr('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    svgNode.attr('xml:space', 'preserve');
    svgNode.attr('version', '1.1');

    Object.keys(this.symbols).forEach(function(symbolId) {
        var symbol = this.symbols[symbolId];
        // var style = symbol('style');
        // if (style.length) {
        //     styleNode.text(styleNode.text() + style.text());
        //     style.remove();
        // }
        defsNode.append(this.symbols[symbolId].html());
    }.bind(this));

    styleNode.html('<![CDATA[' + styleNode.text() + ']]>');
    return doc.html();
}
