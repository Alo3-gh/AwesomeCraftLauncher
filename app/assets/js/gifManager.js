/**
 * GifManager - Picks random media from the local loading folder.
 *
 * Drop any GIF / MP4 / WebM / AVIF file into:
 *   app/assets/media/loading/
 * and it will automatically be included in the random pool.
 *
 * Supported formats:
 *   Images : .gif  .avif  .webp
 *   Videos : .mp4  .webm
 */

const path             = require('path')
const fs               = require('fs')
const { pathToFileURL } = require('url')

const MEDIA_DIR      = path.join(__dirname, '..', 'media', 'loading')
const SUPPORTED_EXTS = new Set(['.gif', '.mp4', '.webm', '.avif', '.webp'])
const VIDEO_EXTS     = /\.(mp4|webm)$/i

/** Cached list of absolute file paths found in MEDIA_DIR. */
let cachedFiles = null

/**
 * Scans the media folder once and caches the result.
 *
 * @returns {string[]} Absolute paths to supported media files.
 */
function scanMediaDir() {
    if (cachedFiles !== null) return cachedFiles
    try {
        const entries = fs.readdirSync(MEDIA_DIR)
        cachedFiles = entries
            .filter(f => SUPPORTED_EXTS.has(path.extname(f).toLowerCase()))
            .map(f => path.join(MEDIA_DIR, f))
        console.log('[GifManager] Found', cachedFiles.length, 'media file(s) in', MEDIA_DIR, ':', cachedFiles.map(p => path.basename(p)))
    } catch (e) {
        console.error('[GifManager] Cannot read media dir:', MEDIA_DIR, '-', e.message)
        cachedFiles = []
    }
    return cachedFiles
}

/**
 * Returns the media type for a given file path.
 *
 * @param {string} filePath
 * @returns {'video'|'image'}
 */
exports.getMediaType = function(filePath) {
    const type = VIDEO_EXTS.test(filePath) ? 'video' : 'image'
    console.log('[GifManager] getMediaType:', path.basename(filePath), '->', type)
    return type
}

/**
 * Returns a random file:// URL from the local media folder, or null if empty.
 *
 * @returns {string|null}
 */
exports.getRandomMediaUrl = function() {
    const files = scanMediaDir()
    if (!files.length) return null
    const file = files[Math.floor(Math.random() * files.length)]
    const url = pathToFileURL(file).href
    console.log('[GifManager] Selected:', path.basename(file))
    return url
}

/**
 * Async wrapper kept for API compatibility with callers that await.
 *
 * @returns {Promise<string|null>}
 */
exports.getRandomGif = async function() {
    return exports.getRandomMediaUrl()
}

/** Synchronous alias used in non-async contexts. */
exports.getRandomGifSync = exports.getRandomMediaUrl

/**
 * No-op: scanning is synchronous, nothing to preload.
 * Kept for API compatibility.
 *
 * @returns {Promise<void>}
 */
exports.preload = async function() {
    scanMediaDir()
}
