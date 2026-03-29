/**
 * Resolves packaged paths for Ely.by (authlib-injector).
 */
const path = require('path')
const fs = require('fs-extra')
const { app } = require('@electron/remote')

const REL = path.join('libraries', 'authlib-injector', 'authlib-injector.jar')

exports.getAuthlibInjectorJarPath = function() {
    if(app.isPackaged) {
        return path.join(process.resourcesPath, REL)
    }
    return path.join(app.getAppPath(), REL)
}

exports.isAuthlibInjectorAvailable = function() {
    return fs.pathExistsSync(exports.getAuthlibInjectorJarPath())
}
