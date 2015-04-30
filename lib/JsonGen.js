/// <reference path="node.d.ts" />
"use strict";
var exec = require('child_process').exec;
var path = require('path');
var fs = require('fs');
require('./Extensions');
var ast = require('./SwiftAst');
var printer = require('./SwiftPrinter');
function fileDescriptions(input) {
    var files = [];
    if (fs.statSync(input).isFile()) {
        var filename = input;
        var dirname = path.dirname(filename);
        var basename = path.basename(filename);
        var outbase = basename.replace('.swift', '+JsonDecode.swift');
        var outputFilename = basename.replace('.swift', '+JsonDecode.swift');
        var file = {
            filename: basename,
            fullname: path.join(dirname, basename),
            outbase: outbase,
            outfile: path.join(dirname, basename.replace('.swift', '+JsonDecode.swift'))
        };
        files = [file];
    }
    if (fs.statSync(input).isDirectory()) {
        var directory = input;
        files = fs.readdirSync(directory)
            .map(function (fn) {
            return {
                filename: fn,
                fullname: path.join(directory, fn),
                outbase: fn.replace('.swift', '+JsonDecode.swift'),
                outfile: path.join(directory, fn.replace('.swift', '+JsonDecode.swift'))
            };
        });
    }
    return files;
}
function generate() {
    var argv = process.argv;
    if (argv.length < 3) {
        console.log('USAGE: swift-json-gen some/directory/FileWithStructs.swift');
        console.log('');
    }
    else {
        var inputs = argv.slice(2);
        var files = inputs
            .flatMap(fileDescriptions)
            .filter(function (f) {
            var isDecode = f.filename.indexOf('+JsonDecode.swift') > 0;
            var isSwift = f.filename.indexOf('.swift') > 0;
            return isSwift && !isDecode;
        });
        var filenames = files.map(function (f) { return '"' + f.fullname + '"'; }).join(' ');
        var cmd = 'xcrun swiftc -sdk "$(xcrun --show-sdk-path --sdk macosx)" -dump-ast ' + filenames;
        exec(cmd, function (error, stdout, stderr) {
            // If an actual error, print and stop
            if (stderr.indexOf('(') != 0) {
                console.error(stderr);
                return;
            }
            var xcoutputs = stderr.split(/\n\(source_file/g);
            if (xcoutputs.length != files.length) {
                console.error('inconsistency; xcoutputs not equal in length to files');
                console.error('xcoutputs.length: ' + xcoutputs.length + ', files: ' + files.length);
            }
            var fileAsts = xcoutputs.map(ast.parse);
            var mergedFileAsts = [].concat.apply([], fileAsts);
            var globalAttrs = ast.globalAttrs(mergedFileAsts);
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                if (file.filename == 'JsonDecode.swift')
                    continue;
                printFile(fileAsts[i], globalAttrs, file.outbase, file.outfile);
            }
        });
    }
}
function printFile(file, globalAttrs, outbase, outfile) {
    var lines = printer.makeFile(file, globalAttrs, outbase);
    var text = lines.join('\n');
    fs.writeFile(outfile, text, function (err) {
        if (err) {
            console.error(err);
        }
    });
}
exports.generate = generate;
