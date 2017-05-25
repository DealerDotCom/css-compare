var csscomp = require('../css-compare.js');
var fs = require('fs');

var files = {
  'control': 'control.css',
  'test': 'test.css',
  'normalizedControl': 'control-normalized.css',
  'normalizedTest': 'test-normalized.css',
  'expected': 'expected.diff'
}

function fixture(filename) {
  return fs.realpathSync('./spec/fixtures/'+filename);
}

function diffFixtures(dir, options) {
  var options = options || {};
  var diff = csscomp(fixture(dir+files.test), fixture(dir+files.control), Object.assign(options, {label: files.test})).diff;
  var expected = fs.readFileSync(fixture(dir+files.expected)).toString();
  expect(diff).toBe(expected);
}

describe("Comparisons", function() {
  it("should compare", function() {
    var diff = csscomp(fixture('general/'+files.test), fixture('general/'+files.control), {label: files.test}).diff;
    //var expected = fs.readFileSync(fixture(files.expected)).toString();
    expect(diff).toBe(null);
  });
});

describe("Outputs", function() {
  it("should output", function() {
    var output = csscomp(fixture('general/'+files.test), fixture('general/'+files.control), {label: files.test});
    // Uncomment to rewrite test files.
    // fs.writeFileSync(fixture(files.normalizedControl), output.control);
    // fs.writeFileSync(fixture(files.normalizedTest), output.test);
    var expectedControl = fs.readFileSync(fixture('general/'+files.normalizedControl)).toString();
    var expectedTest = fs.readFileSync(fixture('general/'+files.normalizedTest)).toString();
    expect(output.control).toBe(expectedControl);
    expect(output.test).toBe(expectedTest);
  });
});

describe("Extensions", function(){
  it("should remove compass stuff", function(){

    var diff = csscomp(fixture('extensions/compass/'+files.test), fixture('extensions/compass/'+files.control), {label: files.test, extensions:'compass'}).diff;
    //var expected = fs.readFileSync(fixture('extensions/compass/'+files.expected)).toString();
    expect(diff).toBe(null);

  });
});

describe("Colors", function(){
  it("should be filtered from the diff if the rgba values are the same", function(){
    diffFixtures('similar-colors/same/', {"similar-colors": true});
  });

  it("should not be filtered from the diff if the rgba values are outside a specified tolerance", function(){
    diffFixtures('similar-colors/different/', {"similar-colors": true});
  });

  it("should be filtered from the diff if the rgba values are within a specified tolerance", function(){
    diffFixtures('similar-colors/within-tolerance/', {"similar-colors": true});
  });

  it("should be filtered from any property name", function(){
    diffFixtures('similar-colors/names/', {"similar-colors": true});
  });
});
