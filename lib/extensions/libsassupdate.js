const throwAwayOldFlexboxPrefixes = (rule) => {
  if (rule.declarations && rule.declarations.length) {
    rule.declarations = rule.declarations.filter((declaration) => {
      const prop = declaration.property;
      const val = declaration.value;

      // Throwing away properties:
      // -moz-flex-direction: *
      // -moz-justify-content: *
      // -ms-flex-align: *
      // -ms-flex-direction: *
      // -ms-flex-pack: *
      // display: -ms-flexbox;

      const throwAwayProps = [
        '-moz-flex-direction',
        '-moz-justify-content',
        '-ms-flex-align',
        '-ms-flex-direction',
        '-ms-flex-pack',
      ];

      if (throwAwayProps.includes(prop)) {
        return false;
      }

      if (prop === 'display' && val === '-ms-flexbox') {
        return false;
      }

      return true;
    });
  }

  // Recurse
  if (rule.rules && rule.rules.length) {
    rule.rules.forEach(throwAwayOldFlexboxPrefixes);
  }
  if (rule.keyframes && rule.keyframes.length) {
    rule.keyframes.forEach(throwAwayOldFlexboxPrefixes);
  }
};

const removeMiscDeclarations = (rule) => {
  if (rule.declarations && rule.declarations.length) {
    rule.declarations = rule.declarations.filter((declaration) => {
      const prop = declaration.property;
      const val = declaration.value;

      if (prop === 'filter') {
        return false;
      }

      if (prop === 'box-sizing' && (val === 'content-box' || val === '"content-box"')) {
        return false;
      }

      if (prop === 'transform' && val.startsWith('scale(')) {
        return false;
      }

      if (prop === 'align-self' && val === 'center') {
        return false;
      }

      if (prop === '*zoom') {
        return false;
      }

      return true;
    });
  }

  // Recurse
  if (rule.rules && rule.rules.length) {
    rule.rules.forEach(removeMiscDeclarations);
  }
  if (rule.keyframes && rule.keyframes.length) {
    rule.keyframes.forEach(removeMiscDeclarations);
  }
};


const declarationUpdates = (rule) => {
  if (rule.declarations && rule.declarations.length) {
    rule.declarations.forEach(function(declaration){
      if (declaration.value) {
        // Change unicode character codes to the actual UTF-8 character. \2190 to ←
        const match = declaration.value.match(/^"\\([0-9a-fA-F]{4})"$/);
        if (declaration.property == "content" && match) {
          declaration.value = '"' + String.fromCodePoint("0x" + match[1]) + '"';
        }

        // Change unicode space to space
        declaration.value = declaration.value.replace("\\00a0", " ");

        // Round numbers to 3 digits
        declaration.value = declaration.value.replace(/([\d.]+)/g, match => {
          return +(Math.round(match + "e+3")  + "e-3");
        })
      }
    });
  }

  // Recurse
  if (rule.rules && rule.rules.length) {
    rule.rules.forEach(declarationUpdates);
  }
  if (rule.keyframes && rule.keyframes.length) {
    rule.keyframes.forEach(declarationUpdates);
  }
};

module.exports = function(root, rw) {
  root.rules = root.rules.filter(rule => rule.type !== 'charset');
  root.rules.forEach(throwAwayOldFlexboxPrefixes);
  root.rules.forEach(removeMiscDeclarations);
  root.rules.forEach(declarationUpdates);
};
