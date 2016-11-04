#!/usr/bin/env node

"use strict";

const fs   = require('fs'),
  path     = require('path'),
  walk     = require('walk').walk,
  inquirer = require('inquirer'),
  beautify = require('js-beautify'),
  colors   = require('colors');

const beautifyConfigPath = path.join(process.cwd(), '.jsbeautifyrc');
const extensions = {
  'js': /\.js$/,
  'html': /\.html$/,
  'css': /\.css$/
};
let beautifyOptions = {
  indent_size: 2,
  indent_char: " ",
  eol: "\n",
  editorconfig: true,
  indent_level: 0,
  indent_with_tabs: false
};

let handleError = err => console.error(JSON.stringify(err, true, 4).red);

let rewrite = (filePath, data, next) =>
  fs.unlink(filePath, err => {
    if (err) handleError(err)
    fs.appendFile(filePath, data, err => {
      if (err) handleError(err);
      next();
    });
  });

let handleFile = (rootPath, fileStat, next, options) => {
      let index = 0;
      let expected = {
        type: null,
        extension: null
      };

      while (index < options.fileTypes.length) {
        expected.type = options.fileTypes[index];
        expected.extension = extensions[expected.type];

        if (fileStat.name.match(expected.extension)) {
          let currentFilePath = path.resolve(rootPath, fileStat.name);

          console.log('Matched file'.yellow, fileStat.name.magenta);

          fs.readFile(currentFilePath, (err, content) => {
            if (err) handleError(err);

            console.log('Formatting...'.yellow);

            let formattedSource =
              beautify[expected.type](content.toString(), beautifyOptions);

            console.log('Rewriting...'.yellow);

            rewrite(currentFilePath, formattedSource, next);
          })
        }

        index++;
      }
      next();
    };

let amplet = () => {
  inquirer.prompt([
    {
      type: 'input',
      message: 'Enter folder',
      name: 'path',
      default: process.cwd(),
    },
    {
      type: 'checkbox',
      message: 'Select file-types:',
      name: 'fileTypes',
      default: 'js',
      choices: [
        { name: 'js' },
        { name: 'html' },
        { name: 'css' }
      ],
      validate: chosen =>
        !!chosen.length || 'You must choose at least one',
    }
  ])
  .then(options => {
    if (options.path == process.cwd()) {
      console.log('HINT:'.yellow,
        `${"Avoid to run amplet from your project's root - in that case amplet will going recursively through ".yellow}${'node_modules'.red}${" or ".yellow}${'bower_components'.red}${" that will take a lot of time and ".yellow}${"might be cause a lot of critical errors".yellow}${" after prettifying 3-rd party libraries' sourses!".yellow}`);
      inquirer.prompt([{
        type: 'confirm',
        message: 'Are you sure?',
        name: 'confirmation'
      }])
      .then(result => {
        if (result.confirmation) {
          let walker = walk(path.join(process.cwd(), options.path));

          walker.on('file', (...args) => handleFile(...args, options));
          walker.on('error', handleError);
          walker.on('end', console.log.bind(console, 'Everything prettified. Happy coding!'.green));
        } else {
          return console.log('Happy coding!'.green)
        }
      })
    }
  });
};

fs.stat(beautifyConfigPath, (err, stats) => {
  if (err) {
    if (err.code = "ENOENT") {
      console.log('HINT:'.yellow, 'You may specify your own .jsbeautifyrc'.green);
      return amplet();
    } else {
      handleError(err);
    }
  }

  if (stats.isFile()) {
    let config = fs.readFileSync(beautifyConfigPath).toString();
    beautifyOptions = JSON.parse(config);
  }

  amplet();
})
