module.exports = function(root, rw) {

  root.rules.forEach(function(rule){
    if (rule.declarations && rule.declarations.length) {
      rule.declarations = rule.declarations.filter(function(declaration){
        // Throwing away all old webkit-gradient.
        return !declaration.value || declaration.value.indexOf('-webkit-gradient') === -1;
      });

      var linearGradient = false;
      rule.declarations.forEach(function(declaration){
        // Replacing any 0% with unitless 0.
        if (declaration.value && declaration.value.indexOf('linear-gradient') !== -1) {
          linearGradient = true;
          declaration.value = declaration.value.replace(/([^0-9])0%/, '$10');
        }
      });

      if (linearGradient) {
        rule.declarations = rule.declarations.filter(function(declaration){
          var backgroundSize = declaration.property == 'background-size';
          var backgroundSvg = (declaration.property == 'background-image' || declaration.property == 'background')
            && declaration.value.match(/url\(["']?data:image\/svg\+xml/);
          return !(backgroundSize || backgroundSvg);
        });
      }
    }
  });

}