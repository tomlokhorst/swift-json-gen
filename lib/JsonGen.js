/// <reference path="node.d.ts" />
"use strict";
var exec = require('child_process').exec;
var path = require('path');
var fs = require('fs');
require('./Extensions');
var ast = require('./SwiftAst');
var printer = require('./SwiftPrinter');
function fullFilenames(input) {
    if (fs.statSync(input).isDirectory()) {
        return fs.readdirSync(input).flatMap(function (fn) { return fullFilenames(path.join(input, fn)); });
    }
    else if (fs.statSync(input).isFile()) {
        return [input];
    }
    throw new Error("input is neither a file nor a directory");
}
function fileDescription(filename, allFilenames) {
    var dirname = path.dirname(filename);
    var basename = path.basename(filename);
    var outbase = basename.replace('.swift', '+JsonGen.swift');
    var outfile = path.join(dirname, outbase);
    var outExists = allFilenames.indexOf(outfile) > -1;
    return {
        filename: basename,
        fullname: path.join(dirname, basename),
        outbase: outbase,
        outfile: outfile,
        outExists: outExists
    };
}
function generate() {
    var argv = process.argv;
    if (argv.length < 3) {
        console.log('USAGE: swift-json-gen some/directory/FileWithStructs.swift');
        console.log('');
    }
    else {
        var inputs = argv.slice(2);
        var filenames = inputs.flatMap(fullFilenames);
        var files = filenames
            .map(function (fn) { return fileDescription(fn, filenames); })
            .filter(function (f) {
            var isJsonGen = f.filename.indexOf('+JsonGen.swift') > 0;
            var isSwift = f.filename.indexOf('.swift') > 0;
            return isSwift && !isJsonGen;
        });
        var filenamesString = files.map(function (f) { return '"' + f.fullname + '"'; }).join(' ');
        var cmd = 'xcrun swiftc -sdk "$(xcrun --show-sdk-path --sdk macosx)" -dump-ast ' + filenamesString;
        var opts = {
            maxBuffer: 200 * 1024 * 1024
        };
        exec(cmd, opts, function (error, stdout, stderr) {
            // If an actual error, print and stop
            if (stderr.indexOf('(') != 0) {
                console.error(stderr);
                return;
            }
            var xcoutputs = stderr.split(/\n\(source_file/g);
            if (xcoutputs.length != files.length) {
                console.error('inconsistency; xcoutputs not equal in length to files');
                console.error('xcoutputs.length: ' + xcoutputs.length + ', files: ' + files.length);
                return;
            }
            var fileAsts = xcoutputs.map(ast.parse);
            var mergedFileAsts = [].concat.apply([], fileAsts);
            var globalAttrs = ast.globalAttrs(mergedFileAsts);
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                if (file.filename == 'JsonGen.swift')
                    continue;
                var lines = printer.makeFile(fileAsts[i], globalAttrs, file.outbase, file.outExists);
                if (lines.length == 0)
                    continue;
                var text = lines.join('\n');
                printFile(text, globalAttrs, file.outbase, file.outfile);
            }
        });
    }
}
function printFile(text, globalAttrs, outbase, outfile) {
    fs.writeFile(outfile, text, function (err) {
        if (err) {
            console.error(err);
        }
    });
}
exports.generate = generate;
