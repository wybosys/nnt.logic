#!/usr/bin/env node

const fs = require('fs-extra')

function usage() {
  console.log('usage: init-project.js directory')
}

function init(dir) {
  console.log('init project in ' + dir)

  fs.copySync('.gitignore', dir + '/.gitignore')
  fs.copySync('app.json', dir + '/app.json')
  fs.copySync('devops.json', dir + '/devops.json')
  fs.copySync('index.js', dir + '/index.js')
  fs.copySync('package.json', dir + '/package.json')
  fs.copySync('tsconfig.json', dir + '/tsconfig.json')
  fs.copySync('src', dir + '/src')
}

function main() {
  if (process.argv.length != 3) {
    usage()
    return
  }

  init(process.argv[2])
}

main()
