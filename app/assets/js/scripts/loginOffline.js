/**
 * Script for loginOffline.ejs
 * Offline-account login by username only.
 */

// Elements
const loginOfflineCancelContainer = document.getElementById('loginOfflineCancelContainer')
const loginOfflineCancelButton = document.getElementById('loginOfflineCancelButton')
const loginOfflineUsernameError = document.getElementById('loginOfflineUsernameError')
const loginOfflineUsername = document.getElementById('loginOfflineUsername')
const loginOfflineButton = document.getElementById('loginOfflineButton')
const loginOfflineForm = document.getElementById('loginOfflineForm')

// Control variables (set from loginOptions/settings)
let loginOfflineViewOnSuccess = VIEWS.landing
let loginOfflineViewOnCancel = VIEWS.loginOptions
let loginOfflineViewCancelHandler

// Validation regex: 3-16, letters/numbers/underscore.
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,16}$/

function setError(value) {
    loginOfflineUsernameError.innerHTML = value
    loginOfflineUsernameError.style.opacity = 1
}

function clearError() {
    loginOfflineUsernameError.innerHTML = ''
    loginOfflineUsernameError.style.opacity = 0
}

function validateUsername(value) {
    const v = (value ?? '').trim()
    if(v.length === 0) return Lang.queryJS('loginOffline.error.requiredUsername')
    if(!USERNAME_REGEX.test(v)) return Lang.queryJS('loginOffline.error.invalidUsername')
    return null
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
        const btnText = Lang.queryJS('loginOffline.loggingIn')
        const label = document.getElementById('loginOfflineButtonLabel')
        if(label) label.textContent = btnText
    } else {
        loginOfflineButton.removeAttribute('loading')
        const btnText = Lang.queryJS('loginOffline.loginButtonText')
        const label = document.getElementById('loginOfflineButtonLabel')
        if(label) label.textContent = btnText
    }
}

function resetUI() {
    loginOfflineUsername.value = ''
    loginOfflineDisabled(true)
    clearError()
    loginOfflineLoading(false)
    loginOfflineCancelEnabled(false)
    loginOfflineViewCancelHandler = null

    // Reset the button visual state (loader/checkmark).
    const btnContent = document.getElementById('loginOfflineButtonContent')
    const loader = btnContent?.querySelector('.offline-circle-loader')
    const checkmark = btnContent?.querySelector('.offline-checkmark')
    if(loader) loader.classList.remove('load-complete')
    if(checkmark) checkmark.style.display = 'none'
}

// Enable submit only when input is valid.
loginOfflineUsername.addEventListener('input', () => {
    const err = validateUsername(loginOfflineUsername.value)
    if(err) {
        setError(err)
        loginOfflineDisabled(true)
    } else {
        clearError()
        loginOfflineDisabled(false)
    }
})

loginOfflineUsername.addEventListener('focusout', () => {
    const err = validateUsername(loginOfflineUsername.value)
    if(err) {
        setError(err)
        loginOfflineDisabled(true)
    } else {
        clearError()
        loginOfflineDisabled(false)
    }
})

// Disable default form behavior.
loginOfflineForm.onsubmit = () => { return false }

loginOfflineCancelButton.onclick = (e) => {
    switchView(getCurrentView(), loginOfflineViewOnCancel, 500, 500, () => {
        resetUI()
        if(loginOfflineViewCancelHandler != null) {
            loginOfflineViewCancelHandler()
            loginOfflineViewCancelHandler = null
        }
    })
}

loginOfflineButton.addEventListener('click', async () => {
    const err = validateUsername(loginOfflineUsername.value)
    if(err) {
        setError(err)
        loginOfflineDisabled(true)
        return
    }

    loginOfflineDisabled(true)
    loginOfflineLoading(true)

    try {
        const username = loginOfflineUsername.value.trim()
        const value = await AuthManager.addOfflineAccount(username)
        updateSelectedAccount(value)

        // Mark success on the offline button only.
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

                // Reset for next usage.
                loginOfflineViewOnSuccess = VIEWS.landing
                loginOfflineCancelEnabled(false)
                loginOfflineViewCancelHandler = null
                clearError()
                loginOfflineLoading(false)
                loginOfflineDisabled(true)
                loginOfflineUsername.value = ''

                if(loader) loader.classList.remove('load-complete')
                if(checkmark) checkmark.style.display = 'none'
            })
        }, 500)
    } catch (displayableError) {
        // Keep UI responsive; show a generic error in overlay.
        loginOfflineLoading(false)
        loginOfflineDisabled(false)
        const errMsg =
            displayableError?.displayable ??
            displayableError?.message ??
            Lang.queryJS('loginOffline.error.generic')
        setError(typeof errMsg === 'string' ? errMsg : String(errMsg))
    }
})

