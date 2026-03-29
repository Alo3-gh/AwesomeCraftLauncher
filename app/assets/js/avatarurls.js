/**
 * Minecraft skin preview URLs with fallbacks (mc-heads → crafatar → minotar)
 * so avatars still load when one CDN is blocked without a proxy.
 */

'use strict'

/** Relative to app root (same as other <img src> in ejs). */
const DEFAULT_AVATAR_REL = 'assets/images/icons/profile.svg'

/** Avoid hanging forever if a skin CDN accepts the connection but never finishes. */
const IMAGE_LOAD_TIMEOUT_MS = 12000

function enc(uuid) {
    return encodeURIComponent(uuid)
}

exports.DEFAULT_AVATAR_REL = DEFAULT_AVATAR_REL

/**
 * Head / face URLs for small avatars (account picker, etc.).
 * @param {string} uuid
 * @param {number} size pixel size
 * @returns {string[]}
 */
exports.headImageUrls = function(uuid, size = 40) {
    const u = enc(uuid)
    return [
        `https://mc-heads.net/head/${u}/${size}`,
        `https://crafatar.com/avatars/${uuid}?size=${size}&overlay&default=MHF_Steve`,
        `https://minotar.net/avatar/${uuid}/${size}.png`
    ]
}

function bodyScaleFromHeight(height) {
    const s = Math.round(Number(height) / 12)
    return Math.max(2, Math.min(10, s || 5))
}

/**
 * Full-body render URLs (settings account cards).
 * @param {string} uuid
 * @param {number} height mc-heads height param (e.g. 60)
 */
exports.bodyImageUrls = function(uuid, height = 60) {
    const scale = bodyScaleFromHeight(height)
    return [
        `https://mc-heads.net/body/${enc(uuid)}/${height}`,
        `https://crafatar.com/renders/body/${uuid}?scale=${scale}&overlay&default=MHF_Steve`
    ]
}

/**
 * Side / “right” body view for landing avatar circle (mc-heads style).
 */
exports.bodyRightBackgroundUrls = function(uuid) {
    return [
        `https://mc-heads.net/body/${enc(uuid)}/right`,
        `https://crafatar.com/renders/body/${uuid}?scale=6&overlay&default=MHF_Steve`
    ]
}

/**
 * @param {HTMLImageElement} img
 * @param {string[]} urls
 */
exports.setImgSrcWithFallbacks = function(img, urls) {
    let i = 0
    let timer = null
    const clearTimer = () => {
        if(timer != null){
            clearTimeout(timer)
            timer = null
        }
    }
    const next = () => {
        clearTimer()
        img.onload = null
        img.onerror = null
        if(i >= urls.length){
            img.src = DEFAULT_AVATAR_REL
            return
        }
        const u = urls[i++]
        timer = setTimeout(next, IMAGE_LOAD_TIMEOUT_MS)
        img.onload = () => {
            clearTimer()
            img.onerror = null
        }
        img.onerror = next
        img.src = u
    }
    next()
}

/**
 * @param {HTMLElement} el element with style.backgroundImage
 * @param {string[]} urls
 */
exports.setElementBackgroundImageWithFallbacks = function(el, urls) {
    let idx = 0
    let timer = null
    const finalCss = `url('${DEFAULT_AVATAR_REL}')`
    const clearTimer = () => {
        if(timer != null){
            clearTimeout(timer)
            timer = null
        }
    }
    const attempt = () => {
        clearTimer()
        if(idx >= urls.length){
            el.style.backgroundImage = finalCss
            return
        }
        const u = urls[idx++]
        const probe = new Image()
        timer = setTimeout(attempt, IMAGE_LOAD_TIMEOUT_MS)
        probe.onload = () => {
            clearTimer()
            el.style.backgroundImage = `url('${u}')`
        }
        probe.onerror = () => {
            clearTimer()
            attempt()
        }
        probe.src = u
    }
    attempt()
}
