var path = require('path');
var loaderUtils = require('loader-utils');
var svg = require('./svg');

module.exports = function(content) {
    this.cacheable && this.cacheable();

    var query = loaderUtils.parseQuery(this.query);

    var resourcePath = this.resourcePath;
    var basename = path.basename(resourcePath);

    var svgStore = svg.SvgStore.ensure(this);

    this.addDependency(resourcePath);

    // Calculate sprite symbol id
    var id = loaderUtils.interpolateName(this, query.name || '[name]_[hash]', {
        context: this.options.context,
        content: content
    });

    var escapeId = loaderUtils.interpolateName(this, query.name || '[name]', {
        context: this.options.context,
        content: content
    });

    svgStore.addSymbol(id, svg.createSymbol(id, escapeId, content));
    return 'module.exports = __webpack_public_path__ + "/sprite.svg#' + id + '";';
};
