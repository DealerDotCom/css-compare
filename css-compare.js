// Using Rework, not PostCSS, because Rework does reformat whitespace.

var rework = require('rework');
var fs = require('fs');
var color = require('color-parser');
var diff = require('diff');
var _ = require('lodash');

function parseColors(value) {
  // Throw everything at colorString, and see what sticks.
  return value.replace(/(#[0-9a-fA-F]{3,6}|rgba?\([0-9,\s]+\)|[a-zA-Z._]+)/g, function(match){
    var colorMatch;

    try {
      colorMatch = colorString(match);
    } catch (e) {}

    return colorMatch || match;
  });
}

function colorString(value) {
  if (value === 'transparent') {
    return 'rgba(0, 0, 0, 0)';
  }

  var c = color(value);
  if (c) {
    c = 'rgba('+c.r+', '+c.g+', '+c.b+', '+(c.a === undefined ? 1 : c.a)+')';
  }
  return c;
}

function floatString(value) {
  return value.replace(/(.|^)\.([0-9]+)/g, function(match, left, right){
    // TODO: Don't do all this string mojo on numbers.

    var digit = !isNaN(parseInt(left.trim(), 10));
    right = right.replace(/0+$/, '');
    return (digit ? left : left+'0') + (right ? '.' + right : '');
  });
}

function urlString(value) {
  if (value.indexOf('url(') !== -1) {
    value = value.replace(/url\(['"]([^)]+)['"]\)/g, 'url($1)');
  }
  return value;
}

function spaceString(value) {
  if (value.indexOf('(') !== -1) {
    value = value.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
  }
  if (value.indexOf('/') !== -1) {
    value = value.replace(/\s*\/\s*/g, '/');
  }
  if (value.indexOf(',') !== -1) {
    value = value.replace(/\,\s*/g, ', ');
  }

  return value.replace(/\s+/g, ' ');
}

function normalize(root, rw) {
  // TODO: Use the source position to inform our diff?

  var filterComment = function(ruleOrDeclaration) {
    return ruleOrDeclaration.type !== 'comment';
  };

  var filterRule = function(rule){
    return !rule.declarations || rule.declarations.length > 0;
  };

  var processRule = function(rule) {
    if (rule.selectors) {
      rule.selectors = rule.selectors.map(function(selector){
        return selector
          .replace(/\s+/g, ' ')
          .replace(/\s*([+>])\s*/g, ' $1 ');
      });
    }

    if (rule.type == 'media') {
      rule.media = spaceString(rule.media);
    }

    if (rule.declarations && rule.declarations.length) {
      rule.declarations = rule.declarations.filter(filterComment);
      rule.declarations.forEach(function(declaration){
        if (declaration.value) {
          [floatString, parseColors, urlString, spaceString].forEach(function(processor){
            declaration.value = processor(declaration.value);
          });
          declaration.value = declaration.value
            .replace(/'/g, '"');
        }
      });
    }

    if (rule.rules && rule.rules.length) {
      rule.rules = rule.rules.filter(filterRule).filter(filterComment);
      rule.rules.forEach(processRule);
    }

    if (rule.keyframes && rule.keyframes.length) {
      rule.keyframes.forEach(processRule);
    }
  }

  root.rules = root.rules.filter(filterRule).filter(filterComment);
  root.rules.forEach(processRule);
}

function normalizeAfterExtensions(root, rw) {
  var processRule = function(rule) {
    if (rule.declarations && rule.declarations.length) {
      rule.declarations.forEach(function(declaration){
        if (declaration.value) {
          declaration.value = spaceString(declaration.value);
        }
      });
    }

    if (rule.rules && rule.rules.length) {
      rule.rules.forEach(processRule);
    }

    if (rule.keyframes && rule.keyframes.length) {
      rule.keyframes.forEach(processRule);
    }
  }

  root.rules.forEach(processRule);
}

var extensions = {
  compass: require('./lib/extensions/compass'),
  libsassupdate: require('./lib/extensions/libsassupdate'),
  removeprefixes: require('./lib/extensions/removeprefixes')
};

module.exports = function(test, control, options){
  options = options || {};
  var label = options.label;
  var output = options.output;
  var usedExtensions = (options.extensions||'').split(',')

  var processed = _.mapValues({
    test: test,
    control: control
  }, function(path) {
    var rw = rework(fs.readFileSync(path).toString()).use(normalize);
    _.chain(usedExtensions)
      .map(function(e){ return extensions[e]; })
      .compact()
      .each(function(e){ rw.use(e); });

    rw.use(normalizeAfterExtensions);

    var css = rw.toString();
    var selectors = _.chain(rw.obj.stylesheet.rules)
      .map('selectors')
      .flatten()
      .value();

    if (output) {
      var normalizedPath = path.replace('.css', '-normalized.css');
      fs.writeFileSync(normalizedPath, css);
    }

    return {
      selectors: selectors,
      css: css
    }
  });

  var different = processed.control.css !== processed.test.css;

  return {
    "diff": different ? diff.createPatch(label || test, processed.control.css, processed.test.css) : null,
    "selectors": {
      added: _.difference(processed.test.selectors, processed.control.selectors),
      removed: _.difference(processed.control.selectors, processed.test.selectors)
    },
    "control": processed.control.css,
    "test": processed.test.css
  }
}
