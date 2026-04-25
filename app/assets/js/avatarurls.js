/**
 * Minecraft skin preview URLs with fallbacks.
 * mc-heads → crafatar → minotar → NameMC CDN (s.namemc.com 3D render; same catalog as ru.namemc.com).
 * NameMC has no official UUID API; texture pages use internal ids. Renders may be blocked by Cloudflare for some clients.
 */

'use strict'

/** Relative to app root (same as other <img src> in ejs). */
const DEFAULT_AVATAR_REL = 'assets/images/icons/profile.svg'

/** Avoid hanging forever if a skin CDN accepts the connection but never finishes. */
const IMAGE_LOAD_TIMEOUT_MS = 12000

function enc(uuid) {
    return encodeURIComponent(uuid)
}

/** NameMC 3D skin render (player UUID). Catalog site: https://ru.namemc.com/minecraft-skins */
function nameMcBodyPng(uuid, width, height) {
    const w = Math.max(64, Math.min(512, Number(width) || 200))
    const h = Math.max(64, Math.min(640, Number(height) || 320))
    return `https://s.namemc.com/3d/skin/body.png?id=${encodeURIComponent(uuid)}&model=classic&width=${w}&height=${h}`
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

function mcHeadsHeadByName(name, size) {
    return `https://mc-heads.net/head/${encodeURIComponent(name)}/${size}`
}

/**
 * @param {{ type?: string, uuid?: string, displayName?: string }|null} acc
 * @param {number} size
 * @returns {string[]}
 */
exports.headImageUrlsForAccount = function(acc, size = 40) {
    if(acc != null && acc.type === 'elyby' && acc.displayName) {
        return [
            mcHeadsHeadByName(acc.displayName, size),
            ...exports.headImageUrls(acc.uuid, size)
        ]
    }
    return exports.headImageUrls(acc?.uuid ?? '', size)
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
        `https://crafatar.com/renders/body/${uuid}?scale=${scale}&overlay&default=MHF_Steve`,
        nameMcBodyPng(uuid, height * 4, height * 5)
    ]
}

/**
 * @param {{ type?: string, uuid?: string, displayName?: string }|null} acc
 * @param {number} height
 * @returns {string[]}
 */
exports.bodyImageUrlsForAccount = function(acc, height = 60) {
    if(acc != null && acc.type === 'elyby' && acc.displayName) {
        const n = encodeURIComponent(acc.displayName)
        return [
            `https://mc-heads.net/body/${n}/${height}`,
            ...exports.bodyImageUrls(acc.uuid, height)
        ]
    }
    return exports.bodyImageUrls(acc?.uuid ?? '', height)
}

/**
 * Side / “right” body view for landing avatar circle (mc-heads style).
 */
exports.bodyRightBackgroundUrls = function(uuid) {
    return [
        `https://mc-heads.net/body/${enc(uuid)}/right`,
        `https://crafatar.com/renders/body/${uuid}?scale=6&overlay&default=MHF_Steve`,
        nameMcBodyPng(uuid, 280, 320)
    ]
}

/**
 * @param {{ type?: string, uuid?: string, displayName?: string }|null} acc
 * @returns {string[]}
 */
exports.bodyRightBackgroundUrlsForAccount = function(acc) {
    if(acc != null && acc.type === 'elyby' && acc.displayName) {
        const n = encodeURIComponent(acc.displayName)
        return [
            `https://mc-heads.net/body/${n}/right`,
            ...exports.bodyRightBackgroundUrls(acc.uuid)
        ]
    }
    return exports.bodyRightBackgroundUrls(acc?.uuid ?? '')
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

// ─── Ely.by canvas skin rendering ────────────────────────────────────────────
// mc-heads/crafatar/minotar all resolve against Mojang's API and cannot find
// Ely.by-only UUIDs. We fetch the raw skin texture from skinsystem.ely.by and
// render head/body client-side with the Canvas API.

const ELY_SKIN_URL = (name, cacheBust = Date.now()) =>
    `https://skinsystem.ely.by/skins/${encodeURIComponent(name)}.png?v=${encodeURIComponent(cacheBust)}`

function loadSkinImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        const t = setTimeout(() => {
            img.onload = null
            img.onerror = null
            reject(new Error('skin load timeout'))
        }, IMAGE_LOAD_TIMEOUT_MS)
        img.onload = () => { clearTimeout(t); resolve(img) }
        img.onerror = (e) => { clearTimeout(t); reject(e) }
        img.src = url
    })
}

/**
 * Render the front face + helmet overlay of a skin onto a square canvas.
 * @param {HTMLImageElement} skin  loaded skin image (any power-of-2 size)
 * @param {number} size            output canvas px
 * @returns {string}               PNG data URL
 */
function renderHeadDataUrl(skin, size) {
    const s = skin.width / 64
    const c = document.createElement('canvas')
    c.width = size; c.height = size
    const ctx = c.getContext('2d')
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(skin,  8*s, 8*s, 8*s, 8*s, 0, 0, size, size) // face
    ctx.drawImage(skin, 40*s, 8*s, 8*s, 8*s, 0, 0, size, size) // helmet overlay
    return c.toDataURL()
}

/**
 * Render a 2D front-facing full body onto a canvas (ratio 1:2 — 16 wide : 32 tall).
 * Standard Minecraft skin layout coordinates (64x64 reference).
 * @param {HTMLImageElement} skin
 * @param {number} targetHeight   canvas height in px
 * @returns {string}              PNG data URL
 */
function renderBodyDataUrl(skin, targetHeight) {
    const s  = skin.width / 64
    const sc = targetHeight / 32               // px per skin-unit
    const W  = Math.ceil(16 * sc)
    const H  = Math.ceil(32 * sc)
    const c  = document.createElement('canvas')
    c.width = W; c.height = H
    const ctx = c.getContext('2d')
    ctx.imageSmoothingEnabled = false

    const isNewSkin = skin.height >= 64        // 64x64 vs legacy 64x32

    // Draw a region from skin coords (sx,sy,sw,sh) → canvas coords (dx,dy,dw,dh)
    function blit(sx, sy, sw, sh, dx, dy, dw, dh) {
        ctx.drawImage(skin,
            sx*s, sy*s, sw*s, sh*s,
            Math.round(dx*sc), Math.round(dy*sc), Math.round(dw*sc), Math.round(dh*sc))
    }
    // Mirror horizontally (for mirroring right→left in legacy skins)
    function blitFlipX(sx, sy, sw, sh, dx, dy, dw, dh) {
        ctx.save()
        ctx.translate(Math.round((dx + dw) * sc), Math.round(dy * sc))
        ctx.scale(-1, 1)
        ctx.drawImage(skin, sx*s, sy*s, sw*s, sh*s, 0, 0, Math.round(dw*sc), Math.round(dh*sc))
        ctx.restore()
    }

    // Head (8×8) — canvas x=4, y=0
    blit(8,  8, 8, 8, 4, 0, 8, 8)
    blit(40, 8, 8, 8, 4, 0, 8, 8)  // helmet overlay

    // Body (8×12) — canvas x=4, y=8
    blit(20, 20, 8, 12, 4, 8, 8, 12)
    blit(20, 36, 8, 12, 4, 8, 8, 12)  // body overlay

    // Right arm (player's right = canvas left) (4×12) — canvas x=0, y=8
    blit(44, 20, 4, 12, 0, 8, 4, 12)
    if (isNewSkin) blit(44, 36, 4, 12, 0, 8, 4, 12)  // right arm overlay

    // Left arm (player's left = canvas right) (4×12) — canvas x=12, y=8
    if (isNewSkin) {
        blit(36, 52, 4, 12, 12, 8, 4, 12)
        blit(52, 52, 4, 12, 12, 8, 4, 12)  // left arm overlay
    } else {
        blitFlipX(44, 20, 4, 12, 12, 8, 4, 12)
    }

    // Right leg (4×12) — canvas x=4, y=20
    blit(4, 20, 4, 12, 4, 20, 4, 12)
    if (isNewSkin) blit(4, 36, 4, 12, 4, 20, 4, 12)  // right leg overlay

    // Left leg (4×12) — canvas x=8, y=20
    if (isNewSkin) {
        blit(20, 52, 4, 12, 8, 20, 4, 12)
        blit( 4, 52, 4, 12, 8, 20, 4, 12)  // left leg overlay
    } else {
        blitFlipX(4, 20, 4, 12, 8, 20, 4, 12)
    }

    return c.toDataURL()
}

/**
 * Load the Ely.by skin and render a head into an <img> element.
 * Falls back to the default avatar SVG if anything fails.
 */
exports.setElybyHeadSrc = async function(imgEl, displayName, size = 40) {
    try {
        const skin = await loadSkinImage(ELY_SKIN_URL(displayName))
        imgEl.src = renderHeadDataUrl(skin, size)
    } catch {
        imgEl.src = DEFAULT_AVATAR_REL
    }
}

/**
 * Load the Ely.by skin and render a 2D body into an <img> element.
 */
exports.setElybyBodySrc = async function(imgEl, displayName, height = 60) {
    try {
        const skin = await loadSkinImage(ELY_SKIN_URL(displayName))
        imgEl.src = renderBodyDataUrl(skin, height)
    } catch {
        imgEl.src = DEFAULT_AVATAR_REL
    }
}

/**
 * Load the Ely.by skin and set it as a CSS background-image on an element.
 */
exports.setElybyBackgroundSrc = async function(el, displayName, height = 320) {
    try {
        const skin = await loadSkinImage(ELY_SKIN_URL(displayName))
        el.style.backgroundImage = `url('${renderBodyDataUrl(skin, height)}')`
        el.style.backgroundSize = 'contain'
        el.style.backgroundRepeat = 'no-repeat'
        el.style.backgroundPosition = 'center bottom'
    } catch {
        el.style.backgroundImage = `url('${DEFAULT_AVATAR_REL}')`
    }
}
// ─────────────────────────────────────────────────────────────────────────────

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
