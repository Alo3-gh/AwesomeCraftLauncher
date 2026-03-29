/**
 * Script for loginOffline.ejs — Ely.by account login (Yggdrasil-compatible).
 */

const loginOfflineCancelContainer = document.getElementById('loginOfflineCancelContainer')
const loginOfflineCancelButton = document.getElementById('loginOfflineCancelButton')
const loginOfflineUsernameError = document.getElementById('loginOfflineUsernameError')
const loginOfflinePasswordError = document.getElementById('loginOfflinePasswordError')
const loginOfflineTotpError = document.getElementById('loginOfflineTotpError')
const loginOfflineUsername = document.getElementById('loginOfflineUsername')
const loginOfflinePassword = document.getElementById('loginOfflinePassword')
const loginOfflineTotp = document.getElementById('loginOfflineTotp')
const loginOfflineTotpRow = document.getElementById('loginOfflineTotpRow')
const loginOfflineButton = document.getElementById('loginOfflineButton')
const loginOfflineForm = document.getElementById('loginOfflineForm')

let loginOfflineViewOnSuccess = VIEWS.landing
let loginOfflineViewOnCancel = VIEWS.loginOptions
let loginOfflineViewCancelHandler

function setUsernameError(value) {
    loginOfflineUsernameError.innerHTML = value
    loginOfflineUsernameError.style.opacity = value ? 1 : 0
}

function setPasswordError(value) {
    loginOfflinePasswordError.innerHTML = value
    loginOfflinePasswordError.style.opacity = value ? 1 : 0
}

function setTotpError(value) {
    loginOfflineTotpError.innerHTML = value
    loginOfflineTotpError.style.opacity = value ? 1 : 0
}

function clearFieldErrors() {
    setUsernameError('')
    setPasswordError('')
    setTotpError('')
}

function validateFields() {
    const user = (loginOfflineUsername.value ?? '').trim()
    const pass = loginOfflinePassword.value ?? ''
    if(user.length === 0) {
        return Lang.queryJS('loginOffline.error.requiredUsername')
    }
    if(pass.length === 0) {
        return Lang.queryJS('loginOffline.error.requiredPassword')
    }
    if(loginOfflineTotpRow.style.display !== 'none') {
        const t = loginOfflineTotp.value.trim()
        if(t.length < 6) {
            return Lang.queryJS('loginOffline.error.requiredTotp')
        }
    }
    return null
}

function applyFieldError(msg) {
    if(!msg) {
        clearFieldErrors()
        return
    }
    if(msg === Lang.queryJS('loginOffline.error.requiredUsername')) {
        setUsernameError(msg)
    } else if(msg === Lang.queryJS('loginOffline.error.requiredPassword')) {
        setPasswordError(msg)
    } else if(msg === Lang.queryJS('loginOffline.error.requiredTotp')) {
        setTotpError(msg)
    } else {
        setPasswordError(msg)
    }
}

function loginOfflineDisabled(v) {
    if(loginOfflineButton.disabled !== v) {
        loginOfflineButton.disabled = v
    }
}

function loginOfflineCancelEnabled(v) {
    if(v) {
        $(loginOfflineCancelContainer).show()
    } else {
        $(loginOfflineCancelContainer).hide()
    }
}

function loginOfflineLoading(v) {
    if(v) {
        loginOfflineButton.setAttribute('loading', true)
        const label = document.getElementById('loginOfflineButtonLabel')
        if(label) label.textContent = Lang.queryJS('loginOffline.loggingIn')
    } else {
        loginOfflineButton.removeAttribute('loading')
        const label = document.getElementById('loginOfflineButtonLabel')
        if(label) label.textContent = Lang.queryJS('loginOffline.loginButtonText')
    }
}

function resetUI() {
    loginOfflineUsername.value = ''
    loginOfflinePassword.value = ''
    loginOfflineTotp.value = ''
    loginOfflineTotpRow.style.display = 'none'
    clearFieldErrors()
    loginOfflineDisabled(true)
    loginOfflineLoading(false)
    loginOfflineCancelEnabled(false)
    loginOfflineViewCancelHandler = null

    const btnContent = document.getElementById('loginOfflineButtonContent')
    const loader = btnContent?.querySelector('.offline-circle-loader')
    const checkmark = btnContent?.querySelector('.offline-checkmark')
    if(loader) loader.classList.remove('load-complete')
    if(checkmark) checkmark.style.display = 'none'
}

function recomputeButtonEnabled() {
    const err = validateFields()
    loginOfflineDisabled(err != null)
}

loginOfflineUsername.addEventListener('input', () => {
    clearFieldErrors()
    recomputeButtonEnabled()
})

loginOfflinePassword.addEventListener('input', () => {
    clearFieldErrors()
    recomputeButtonEnabled()
})

loginOfflineTotp.addEventListener('input', () => {
    setTotpError('')
    recomputeButtonEnabled()
})

loginOfflineForm.onsubmit = () => false

document.getElementById('loginOfflineRegisterButton').addEventListener('click', () => {
    require('electron').shell.openExternal('https://account.ely.by/register')
})

loginOfflineCancelButton.onclick = () => {
    switchView(getCurrentView(), loginOfflineViewOnCancel, 500, 500, () => {
        resetUI()
        if(loginOfflineViewCancelHandler != null) {
            loginOfflineViewCancelHandler()
            loginOfflineViewCancelHandler = null
        }
    })
}

loginOfflineButton.addEventListener('click', async () => {
    const err = validateFields()
    if(err) {
        applyFieldError(err)
        return
    }

    loginOfflineDisabled(true)
    loginOfflineLoading(true)
    clearFieldErrors()

    const username = loginOfflineUsername.value.trim()
    let password = loginOfflinePassword.value
    if(loginOfflineTotpRow.style.display !== 'none') {
        password = `${password}:${loginOfflineTotp.value.trim()}`
    }

    try {
        const value = await AuthManager.addElybyAccount(username, password)
        updateSelectedAccount(value)

        const btnContent = document.getElementById('loginOfflineButtonContent')
        const loader = btnContent.querySelector('.offline-circle-loader')
        const checkmark = btnContent.querySelector('.offline-checkmark')
        if(loader) loader.classList.add('load-complete')
        if(checkmark) checkmark.style.display = 'initial'

        setTimeout(() => {
            switchView(getCurrentView(), loginOfflineViewOnSuccess, 500, 500, async () => {
                if(loginOfflineViewOnSuccess === VIEWS.settings) {
                    await prepareSettings()
                }

                loginOfflineViewOnSuccess = VIEWS.landing
                loginOfflineCancelEnabled(false)
                loginOfflineViewCancelHandler = null
                resetUI()

                if(loader) loader.classList.remove('load-complete')
                if(checkmark) checkmark.style.display = 'none'
            })
        }, 500)
    } catch (displayableError) {
        loginOfflineLoading(false)

        if(isDisplayableError(displayableError) && displayableError.needsTwoFactor) {
            loginOfflineTotpRow.style.display = 'block'
            loginOfflineTotp.value = ''
            setTotpError('')
            loginOfflineDisabled(false)
            recomputeButtonEnabled()
            return
        }

        let actualDisplayableError
        if(isDisplayableError(displayableError)) {
            actualDisplayableError = displayableError
        } else {
            actualDisplayableError = Lang.queryJS('login.error.unknown')
        }

        setOverlayContent(actualDisplayableError.title, actualDisplayableError.desc, Lang.queryJS('login.tryAgain'))
        setOverlayHandler(() => {
            toggleOverlay(false)
            loginOfflineDisabled(false)
            recomputeButtonEnabled()
        })
        toggleOverlay(true)
    }
})
