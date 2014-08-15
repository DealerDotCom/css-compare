// Using Rework, not PostCSS, because Rework does reformat whitespace.

var rework = require('rework');
var fs = require('fs');
var color = require('color-parser');
var diff = require('diff');

function colorString(value) {
  var c = color(value);
  if (c) {
    c = 'rgba('+c.r+', '+c.g+', '+c.b+', '+(c.a||1)+');';
  }
  return c;
}

function standardize(root, rw) {
  // TODO: Use the source position to inform our diff?

  root.rules = root.rules.filter(function(rule){
    return rule.type !== 'comment';
  });

  root.rules.forEach(function(rule){
    if (rule.selectors) {
      rule.selectors = rule.selectors.map(function(selector){
        return selector
          .replace(/\s+/g, ' ')
          .replace(/\s*([+>])\s*/g, ' $1 ');
      });
    }

    if (rule.declarations) {
      rule.declarations.forEach(function(declaration){
        if (declaration.value) {
          declaration.value = colorString(declaration.value) || declaration.value;
          declaration.value = declaration.value
            .replace(/,\s*/g, ', ')
            .replace(/'/g, '"');
        }
      });
    }
  });
}

module.exports = function(test, control, label){
  var one = rework(fs.readFileSync(control).toString()).use(standardize).toString();
  var two = rework(fs.readFileSync(test).toString()).use(standardize).toString();

  return diff.createPatch(label || test, one, two);
}
