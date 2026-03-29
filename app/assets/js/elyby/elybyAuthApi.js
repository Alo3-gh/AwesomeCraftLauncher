/**
 * HTTP client for Ely.by Yggdrasil-compatible auth API.
 * @see https://docs.ely.by/ru/minecraft-auth.html
 */
'use strict'

const got = require('got')

const BASE = 'https://authserver.ely.by'

/**
 * @param {string} profileId UUID from Ely (with or without dashes)
 * @returns {string} dashed lowercase UUID for storage / Minecraft args
 */
exports.normalizeProfileUuid = function(profileId) {
    if(profileId == null || typeof profileId !== 'string') {
        return profileId
    }
    const hex = profileId.replace(/-/g, '').toLowerCase()
    if(hex.length !== 32) {
        return profileId.trim()
    }
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

/**
 * @param {string} path
 * @param {object} jsonBody
 * @returns {Promise<{ statusCode: number, body: object|null, networkMessage?: string }>}
 */
async function postJson(path, jsonBody) {
    try {
        const res = await got.post(`${BASE}${path}`, {
            json: jsonBody,
            responseType: 'json',
            throwHttpErrors: false,
            timeout: { request: 45000 },
            retry: { limit: 0 }
        })
        return { statusCode: res.statusCode, body: res.body ?? null }
    } catch (err) {
        return { statusCode: 0, body: null, networkMessage: err.message }
    }
}

exports.authenticate = function(username, password, clientToken) {
    return postJson('/auth/authenticate', {
        username,
        password,
        clientToken,
        requestUser: true
    })
}

exports.refresh = function(accessToken, clientToken) {
    return postJson('/auth/refresh', {
        accessToken,
        clientToken,
        requestUser: true
    })
}

async function postMaybeEmptyBody(path, jsonBody) {
    try {
        const res = await got.post(`${BASE}${path}`, {
            json: jsonBody,
            responseType: 'text',
            throwHttpErrors: false,
            timeout: { request: 45000 },
            retry: { limit: 0 }
        })
        let body = null
        const raw = (res.body || '').trim()
        if(raw) {
            try {
                body = JSON.parse(raw)
            } catch {
                body = null
            }
        }
        return { statusCode: res.statusCode, body }
    } catch (err) {
        return { statusCode: 0, body: null, networkMessage: err.message }
    }
}

exports.validate = function(accessToken) {
    return postMaybeEmptyBody('/auth/validate', { accessToken })
}

exports.invalidate = function(accessToken, clientToken) {
    return postMaybeEmptyBody('/auth/invalidate', { accessToken, clientToken })
}
