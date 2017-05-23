const VENDOR_PREFIXES = [
  '-moz-',
  '-webkit-',
  '-o-',
  '-ms-'
];

const removePrefixes = (rule) => {
  if (rule.declarations && rule.declarations.length) {
    rule.declarations = rule.declarations.filter((declaration) => {
      let keep = true;

      VENDOR_PREFIXES.forEach(function(prefix) {
        if (declaration.property.startsWith(prefix)) {
          keep = false;
        }
      });

      return keep;
    });
  }

  // Recurse
  if (rule.rules && rule.rules.length) {
    rule.rules.forEach(removePrefixes);
  }
  if (rule.keyframes && rule.keyframes.length) {
    rule.keyframes.forEach(removePrefixes);
  }
};

module.exports = function(root, rw) {
  root.rules.forEach(removePrefixes);
};
