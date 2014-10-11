"use strict";

var exec = require('child_process').exec
var path = require('path')
var fs = require('fs')

var ast = require('./SwiftAst')
var printer = require('./SwiftPrinter')

function generate() {
  var argv = process.argv;

  if (argv.length < 3) {
    console.log('USAGE: node JsonGen.js some/directory/FileWithStructs.swift');
    console.log('');
  }
  else {
    var inputFile = argv[2];
    var basename = path.basename(inputFile)
    var outputFilename = basename.replace('.swift', '+JsonDecode.swift');
    var outputFile = path.join(path.dirname(inputFile), outputFilename);
  
    var cmd = 'xcrun swiftc -sdk "$(xcrun --show-sdk-path --sdk macosx)" -dump-ast "' + inputFile + '"'
  
    exec(cmd, function (error, stdout, stderr) {
  
      // If an actual error, print and stop
      if (stderr.indexOf('(') != 0) {
        console.error(stderr);
        return;
      }
  
      var file = ast.parse(stderr);
      var lines = printer.makeFile(file, outputFilename);
      var text = lines.join('\n');
  
      fs.writeFile(outputFile, text, function (err) {
        if (err) {
          console.error(err);
        }
      });
    });
  }
}

exports.generate = generate;

