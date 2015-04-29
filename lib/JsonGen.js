/// <reference path="node.d.ts" />
"use strict";
var exec = require('child_process').exec;
var path = require('path');
var fs = require('fs');
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
        })
            .filter(function (f) {
            var isDecode = f.filename.indexOf('+JsonDecode.swift') > 0;
            var isSwift = f.filename.indexOf('.swift') > 0;
            return isSwift && !isDecode;
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
        var files = inputs.flatMap(fileDescriptions);
        var filenames = files.map(function (f) { return '"' + f.fullname + '"'; }).join(' ');
        var cmd = 'xcrun swiftc -sdk "$(xcrun --show-sdk-path --sdk macosx)" -dump-ast ' + filenames;
        exec(cmd, function (error, stdout, stderr) {
            // If an actual error, print and stop
            if (stderr.indexOf('(') != 0) {
                console.error(stderr);
                return;
            }
            if (files.length == 1) {
                var fileAst = ast.parse(stderr);
                var typeAliases = printer.typeAliases(fileAst);
                printFile(fileAst, typeAliases, files[0].outbase, files[0].outfile);
            }
            else {
                var fileAsts = ast.parse(stderr, true);
                var typeAliases = fileAsts.flatMap(printer.typeAliases);
                if (fileAsts.length == files.length) {
                    for (var i = 0; i < files.length; i++) {
                        var file = files[i];
                        if (file.filename == 'JsonDecode.swift')
                            continue;
                        printFile(fileAsts[i], typeAliases, file.outbase, file.outfile);
                    }
                }
                else {
                    console.error('inconsistency; fileAsts not equal in length to files');
                    console.error('fileAsts.length: ' + fileAsts.length + ', files: ' + files.length);
                }
            }
        });
    }
}
function printFile(file, typeAliases, outbase, outfile) {
    var lines = printer.makeFile(file, typeAliases, outbase);
    var text = lines.join('\n');
    fs.writeFile(outfile, text, function (err) {
        if (err) {
            console.error(err);
        }
    });
}
exports.generate = generate;
