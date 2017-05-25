// Using Rework, not PostCSS, because Rework does reformat whitespace.

var rework = require('rework');
var fs = require('fs');
var color = require('color-parser');
var diff = require('diff');
var _ = require('lodash');
var util = require('util');

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

function filterContext(lines) {
  return lines.filter(function(line) {
    const trimmed = line.trimRight();
    return trimmed !== "+" &&
      trimmed !== "-" &&
      (trimmed.indexOf('-') === 0 || trimmed.indexOf('+') === 0);
  });
}

function filterSimilarColors(patchLines) {
  function hasPlusLinesDirectlyAhead(index) {
    for(var i = index; i < patchLines.length; i++) {
      if (patchLines[i].startsWith("-")) {
        continue;
      }

      return patchLines[i].startsWith("+") && !patchLines[i].startsWith("+++");
    }

    return false;
  }

  // Batch diffs into chunks while maintaining line numbers.
  //  [
  //    {
  //      'old': [
  //        {line: 34, text: '- opacity: 1.0'}
  //        {line: 35, text: '- color: rgba(0, 0, 0, 0)'}
  //      ],
  //      'new': [
  //        {line: 36, text: '+ opacity: 0.9'}
  //        {line: 37, text: '+ color: rgba(1, 1, 1, 0)'}
  //      ],
  //    },
  //    ...
  //  ]
  let oldLines = [];
  let newLines = [];
  let chunks = [];
  patchLines.forEach((line, index) => {
    // Only accumulate old lines if we peek ahead and see new lines coming.
    // We don't want to accumulate single removals.
    if (line.startsWith("-") && !line.startsWith("---") && hasPlusLinesDirectlyAhead(index)) {
      oldLines.push({line: index, text: line});
      return;
    }

    // Only accumulate new lines if we found old lines. We don't want to
    // accumulate single additions.
    if (line.startsWith("+") && !line.startsWith("+++") && oldLines.length > 0) {
      newLines.push({line: index, text: line});
    }

    // Check if we've completed a chunk
    if (oldLines.length > 0 && newLines.length > 0 && 
        (index === patchLines.length - 1 || !patchLines[index + 1].startsWith("+"))) {
      // We completed a chunk. Accumulate it.
      chunks.push(
        {
          'old': oldLines,
          'new': newLines
        }
      );
      // Reset our state
      oldLines = [];
      newLines = [];
    }
  });

  // Filter our lines that don't include rgba. Whitelist what property values
  // can be.
  //  [
  //    {
  //      'old': [
  //        {line: 35, text: '- color: rgba(0, 0, 0, 0)'}
  //      ],
  //      'new': [
  //        {line: 37, text: '+ color: rgba(1, 1, 1, 0)'}
  //      ],
  //    },
  //    ...
  //  ]
  const ALLOWED_PROPERTIES = [
    "color",
    "background-color",
  ];
  const lineFilter = (line) => {
    const rgbaCount = (line.text.match(/rgba\(/g) || []).length;
    const match = line.text.match(/[+-][ ]+([^:]+):/);

    if (rgbaCount > 1) {
      throw new Error("More than one rgba per line. Investigate!");
    }

    return rgbaCount === 1 &&
      (match && ALLOWED_PROPERTIES.includes(match[1]));
  }

  chunks.forEach((chunk) => {
    chunk.old = chunk.old.filter(lineFilter);
    chunk.new = chunk.new.filter(lineFilter);
  });

  chunks = chunks.filter((chunk) => {
    return chunk.old.length > 0 && chunk.new.length > 0;
  });

  // Compare old and new by index. If the colors are the same within a tolerance
  // keep track of what lines to remove
  // [35, 37]
  const linesToRemove = [];

  chunks.forEach((chunk) => {
    for (var i = 0; i < chunk.old.length && i < chunk.new.length; i++) {
      const oldLine = chunk.old[i].text;
      const newLine = chunk.new[i].text;

      const oldRgbRegex = /rgba\(([\d]+), ([\d]+), ([\d]+),/g;
      const oldMatch = oldRgbRegex.exec(oldLine);
      const newRgbRegex = /rgba\(([\d]+), ([\d]+), ([\d]+),/g;
      const newMatch = newRgbRegex.exec(newLine);

      if (!oldMatch || !newMatch) {
        throw new Error("Expected rgba to exist on these lines!");
      }

      const oldR = parseInt(oldMatch[1], 10);
      const oldG = parseInt(oldMatch[2], 10);
      const oldB = parseInt(oldMatch[3], 10);

      const newR = parseInt(newMatch[1], 10);
      const newG = parseInt(newMatch[2], 10);
      const newB = parseInt(newMatch[3], 10);

      if (Math.abs(oldR - newR) <= 1 &&
        Math.abs(oldG - newG) <= 1 &&
        Math.abs(oldB - newB) <= 1) {
        linesToRemove.push(chunk.old[i].line);
        linesToRemove.push(chunk.new[i].line);
      }
    }
  });

  // Sort the line numbers and remove in reverse
  linesToRemove.sort((a,b) => a - b);

  for (var i = linesToRemove.length - 1; i >= 0; i--) {
    patchLines.splice(linesToRemove[i], 1);
  }

  return patchLines;
}

function createDiff(fileName, oldStr, newStr, options) {
  let patchLines = diff.createPatch(fileName, oldStr, newStr).split("\n");

  // This should be done before context removal because it helps us
  // differentiate between chunks of differences
  if (options["similar-colors"]) {
    patchLines = filterSimilarColors(patchLines);
  }

  if (!options.context) {
    patchLines = filterContext(patchLines);
  }

  return patchLines.join("\n");
}

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
    "diff": different ? createDiff(label || test, processed.control.css, processed.test.css, options) : null,
    "selectors": {
      added: _.difference(processed.test.selectors, processed.control.selectors),
      removed: _.difference(processed.control.selectors, processed.test.selectors)
    },
    "control": processed.control.css,
    "test": processed.test.css
  }
}
