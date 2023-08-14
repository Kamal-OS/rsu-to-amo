// TODO: use doc UUID (docId) to prevent reinjection when laod inplace or load from cache
let COMPLETE_ONCE = false

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    const RSU_URL = "https://www.rsu.ma/rsu/personnal-space"
    const RSU_DEMO = "/demo/demo.html"
    const RNP_URL = "https://www.rnp.ma/pre-registration-ui/#/"

    if (tab.url.startsWith(RSU_URL) || tab.url.endsWith(RSU_DEMO)) {
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
            })
        }
    }

    // Prevent RNP inactive state detection (Auto-click)
    // else if (tab.url.startsWith(RNP_URL)) {
    //     if (tab.status === "complete") {
    //         chrome.scripting.executeScript({
    //             target: { tabId: tab.id },
    //             func: () => {
    //                 const div = document.querySelector("div.heading")
    //                 setInterval(() => {
    //                     div.click()
    //                     console.log("Clicked!")
    //                 }, 1000)
    //             },
    //             world: "MAIN"
    //         })
    //     }
    // }
})

const AMO_URL = "https://www.amotadamon.ma/"

var data = {
    families: null,
    window: null,
    groupId: null
}
Object.seal(data) // static object: can't add or remove properties

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.type === "rsu-ui-ready") {
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
            const AMO_COMPLETE_URL = AMO_URL + "Demande_Reussie_Ar.aspx"

            if (tab.id === sender.tab.id && tab.url.startsWith(AMO_COMPLETE_URL) && tab.status === "complete") {
                // click the download button
                // await chrome.scripting.executeScript({
                //     target: { tabId: sender.tab.id },
                //     func: () => {
                //         document.querySelector("#ctl00_ContentPlaceHolder1_Imprimer").click()
                //     },
                //     world: "MAIN"
                // })
                
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
