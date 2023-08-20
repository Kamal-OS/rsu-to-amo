// Parameters (defaults)
const PARAMETERS = {
    rnp_autoclick: true,
    rsu_autoclick: false,
    score_check: true,
    autodownload: true,
    autogender: true
}

// set parameters in storage to defaults
chrome.runtime.onInstalled.addListener(async () => {
    await chrome.storage.local.set({ ...PARAMETERS })
})

/// URLS
// RSU
const RSU_URL = "https://www.rsu.ma/rsu/"
const RSU_ACCOUNT_URL = RSU_URL + "personnal-space"
const RSU_REGISTER_URL = RSU_URL + "pre-registration"
const RSU_DEMO = "/demo/demo.html"
// RNP
const RNP_URL = "https://www.rnp.ma/pre-registration-ui/#/"
// AMO
const AMO_URL = "https://www.amotadamon.ma/"
const AMO_COMPLETE_URL = AMO_URL + "Demande_Reussie_Ar.aspx"

// TODO: use doc UUID (docId) to prevent reinjection when laod inplace or load from cache
let COMPLETE_ONCE = false

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {

    if (tab.url.startsWith(RSU_ACCOUNT_URL) || tab.url.endsWith(RSU_DEMO)) {
        // if refreshed (or reentred) recapture 'complete'
        if (COMPLETE_ONCE && tab.status === "loading") {
            COMPLETE_ONCE = false
        }
        // capture 'complete' once
        else if (!COMPLETE_ONCE && tab.status === "complete") {
            COMPLETE_ONCE = true

            chrome.scripting.insertCSS({
                target: { tabId: tab.id },
                files: ["./style/rsu-ui.css"]
            })

            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["./scripts/inject/rsu-ui.js"]
            }).then(
                res => console.log(res)
            )
        }

        // Prevent RSU auto log out
        if ((tab.url.startsWith(RSU_REGISTER_URL) || tab.url.startsWith(RSU_URL)) && PARAMETERS.rsu_autoclick) {
            if (tab.status === "complete") {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        const target = document.querySelector("header div")
                        const click = setInterval(() => {
                            target.click()
                            console.log("Clicked!")
                        }, 1000)
                    },
                    world: "MAIN"
                })
            }
        }
    }

    // Prevent RNP inactive state detection (Auto-click)
    if (tab.url.startsWith(RNP_URL) && PARAMETERS.rnp_autoclick) {
        if (tab.status === "complete") {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    const target = document.querySelector("div.heading")
                    const click = setInterval(() => {
                        target.click()
                        console.log("Clicked!")
                    }, 1000)
                },
                world: "MAIN"
            })
        }
    }
})

var data = {
    families: null,
    window: null,
    groupId: null
}
Object.seal(data) // static object: can't add or remove properties

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.type === "rsu-auto-gender" && PARAMETERS.autogender) {
        let data = await fetch("./data/female_names.json")
        const female_names = await data.json()
        data = await fetch("./data/male_names.json")
        const male_names = await data.json()

        chrome.tabs.sendMessage(sender.tab.id,
            {
                type: "rsu-set-gender",
                data: {female_names, male_names}
            }
        )
    }
    
    if (message.type === "rsu-ui-ready" || message.type === "rsu-ui-ready-force") {
        
        if (PARAMETERS.score_check && message.type !== "rsu-ui-ready-force") {
            // show score alert if below the threshold
            // and skip until user respond
            let skip = await chrome.scripting.executeScript({
                target: { tabId: sender.tab.id },
                func: () => {
                    let score = document.querySelector("rsu-score-detail .graphScore span")
                    if (!score) return
                    
                    score = score.textContent
                    score = score.replace(',', '.')
                    score = parseFloat(score)
                    
                    if (score > 9.3264284) {
                        const alert = document.querySelector("._alert")
                        if (!alert) return
                        alert.style.opacity = 1

                        // skip
                        return true
                    }

                    // don't skip
                    return false
                }
            })

            skip = skip[0].result

            // skip
            if (skip) return
        }

        chrome.scripting.executeScript({
            target: { tabId: sender.tab.id },
            files: ["./scripts/inject/rsu-data.js"]
        })
    }

    if (message.type === "rsu-data-ready") {
        data.families = message.data

        // create new window
        data.window = await chrome.windows.create({
            focused: true
        })

        // inject first family
        insertData(true)
    }

    if (message.type === "amo-form-done") {
        chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
            if (tab.id === sender.tab.id && tab.url.startsWith(AMO_COMPLETE_URL) && tab.status === "complete") {
                // click the download button
                if (PARAMETERS.autodownload) {
                    chrome.scripting.executeScript({
                        target: { tabId: sender.tab.id },
                        func: () => {
                            const btn = document.querySelector("main input")
                            if (btn) {
                                btn.click()
                            }
                        },
                        world: "MAIN"
                    })
                }
                
                if (!data.families) return
                
                insertData()
            }
        })
    }

    if (message.type === "click-add-child") {
        chrome.scripting.executeScript({
            target: { tabId: sender.tab.id },
            func: () => {
                document.querySelector('[id*="ButtonAdd"]').click()
            },
            world: "MAIN"
        })
    }

    // Messages from popup.js for parameters
    if (message.type in PARAMETERS) {
        PARAMETERS[message.type] = message.state
    }
})

const insertData = (isFirst = false) => {
    for (const [key, value] of Object.entries(data.families)) {
        // skip null
        if (!value || ((key === "adults" || key === "siblings") && value.length < 1)) {
            delete data.families[key]
            console.log(`${key} deleted`)
            continue
        }

        // array
        if (key === "adults" || key === "siblings") {
            injectData(data.families[key].shift(), isFirst)
            console.log(`${key} injected`)
        }
        // single
        else {
            injectData(data.families[key], isFirst)
            console.log(`${key} injected`)
            delete data.families[key]
            console.log(`${key} deleted`)
        }
        break
    }
}

const injectData = async (family, isFirst) => {
    // null
    if (!family) return

    // create tab with AMO_URL
    const amoTab = await chrome.tabs.create({
        active: isFirst,
        url: AMO_URL,
        windowId: data.window.id
    })

    if (isFirst) {
        // create a tab group
        data.groupId = await chrome.tabs.group({
            tabIds: amoTab.id,
            createProperties: {
                windowId: data.window.id
            }
        })

        chrome.tabGroups.update(data.groupId, {
            title: "AMO",
            color: "blue"
        })

        // remove first empty tab
        chrome.tabs.remove(data.window.tabs[0].id)
    }

    if (!isFirst) {
        // add tab to the group
        await chrome.tabs.group({
            tabIds: amoTab.id,
            groupId: data.groupId
        })
    }
    
    // Enter to form filling page
    await chrome.scripting.executeScript({
        target: { tabId: amoTab.id },
        func: () => {
            document.querySelector("a.intro-btn-bl").click()
        }
    })

    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
        if (tab.id === amoTab.id && tab.url.startsWith(AMO_URL + "Formulaire_Inscription_Ar.aspx") && tab.status === "complete") {
            chrome.tabs.sendMessage(amoTab.id,
                {
                    type: "amo-form-insert",
                    data: family
                }
            )
        }
    })
}
