const LS = {
  getAllItems: () => chrome.storage.local.get(),
  getItem: async (key) => (await chrome.storage.local.get(key))[key],
  setItem: (key, val) => chrome.storage.local.set({ [key]: val }),
  removeItems: (keys) => chrome.storage.local.remove(keys),
}

// set parameters in storage
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
    // Parameters (defaults)
    const PARAMETERS = {
      rnp_autoclick: true,
      rsu_autoclick: false,
      score_check: true,
      autodownload: true,
      autogender: true,
      threshold: 9.3264284,
    }

    await chrome.storage.local.set({ ...PARAMETERS })
  }
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
const AMO_DOWNLOAD_URL = AMO_URL + "Demande_Reussie_Ar.aspx"

// TODO: use doc UUID (docId) to prevent reinjection when laod inplace or load from cache
let COMPLETE_ONCE = false

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tab.url.startsWith(RSU_ACCOUNT_URL) || tab.url.endsWith(RSU_DEMO)) {
    // if refreshed (or re-entred) recapture 'complete'
    if (COMPLETE_ONCE && tab.status === "loading") {
      COMPLETE_ONCE = false
    }
    // capture 'complete' once
    else if (!COMPLETE_ONCE && tab.status === "complete") {
      COMPLETE_ONCE = true

      chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ["./style/rsu-ui.css"],
      })

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["./scripts/inject/rsu-ui.js"],
      })

      isScoreBelowThreshold(tab.id, await LS.getItem("threshold"), false)
    }

    // Prevent RSU auto log out
    if (
      (tab.url.startsWith(RSU_REGISTER_URL) || tab.url.startsWith(RSU_URL)) &&
      (await LS.getItem("rsu_autoclick"))
    ) {
      if (tab.status === "complete") {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const target = document.querySelector("header")
            setInterval(() => {
              target.click()
              console.log("Clicked!")
            }, 1000)
          },
          world: "MAIN",
        })
      }
    }
  }

  // Prevent RNP inactive state detection (Auto-click)
  if (tab.url.startsWith(RNP_URL) && (await LS.getItem("rnp_autoclick"))) {
    if (tab.status === "complete") {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const target = document.querySelector("div.heading")
          setInterval(() => {
            target.click()
            console.log("Clicked!")
          }, 1000)
        },
        world: "MAIN",
      })
    }
  }
})

var data = {
  families: null,
  window: null,
  groupId: null,
}
Object.seal(data) // static object: can't add or remove properties

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  // Set gender if this option is active
  if (message.type === "rsu-auto-gender" && (await LS.getItem("autogender"))) {
    let data = await fetch("./data/female_names.json")
    const female_names = await data.json()
    data = await fetch("./data/male_names.json")
    const male_names = await data.json()
    data = { female_names, male_names }

    // send data to rsu.js content script
    chrome.tabs.sendMessage(sender.tab.id, {
      type: "rsu-set-gender",
      data: data,
    })
  }

  if (
    message.type === "rsu-ui-ready" ||
    message.type === "rsu-ui-ready-force"
  ) {
    let isExecuteScript = false

    if (message.type === "rsu-ui-ready-force") {
      isExecuteScript = true
    }
    // score_check option is enabled
    else if (await LS.getItem("score_check")) {
      const isScoreGood = (
        await isScoreBelowThreshold(
          sender.tab.id,
          await LS.getItem("threshold")
        )
      )[0].result

      if (isScoreGood) {
        isExecuteScript = true
      }
    }
    // score_check option is disabled
    else {
      isExecuteScript = true
    }

    if (isExecuteScript) {
      // get families data
      data.families = (
        await chrome.scripting.executeScript({
          target: { tabId: sender.tab.id },
          files: ["./scripts/inject/rsu-data.js"],
        })
      )[0].result

      console.log(data.families)

      // create new window
      data.window = await chrome.windows.create({
        focused: true,
      })

      // inject first family
      injectFamily(true)
    }
  }

  if (message.type === "amo-form-done") {
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (
        tab.id === sender.tab.id &&
        tab.url.startsWith(AMO_DOWNLOAD_URL) &&
        tab.status === "complete"
      ) {
        // if autodownload option is enabled, click the download button
        if (await LS.getItem("autodownload")) {
          chrome.scripting.executeScript({
            target: { tabId: sender.tab.id },
            func: () => {
              const btn = document.querySelector("main input")
              if (btn) {
                btn.click()
              }
            },
            world: "MAIN",
          })
        }

        if (data.families && data.families.length > 0) {
          chrome.tabs.sendMessage(tab.id, {
            type: "amo-inject-nextbtn",
          })
        }
      }
    })
  }

  if (message.type === "amo-next-family") {
    injectFamily()
  }

  if (message.type === "click-add-child") {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      func: () => {
        document.querySelector('[id*="ButtonAdd"]').click()
      },
      world: "MAIN",
    })
  }
})

const isScoreBelowThreshold = (tabId, threshold, isAlert = true) => {
  return chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: (threshold, isAlert) => {
      let score = document.querySelector("rsu-score-detail .graphScore span")
      if (!score) return

      score = score.textContent
      score = score.replace(",", ".")
      score = parseFloat(score)

      // show score alert if below the threshold
      if (score > threshold) {
        const notif = document.querySelector(
          isAlert ? "._alert" : "._alert._warning"
        )
        if (!notif) return
        notif.style.visibility = "visible"

        // hide after 3s
        setTimeout(() => {
          notif.style.visibility = "hidden"
        }, 7000)

        return false
      }

      return true
    },
    args: [threshold, isAlert],
  })
}

const injectFamily = async (isActive = true) => {
  // null or empty
  if (!data.families || data.families.length < 1) return

  // create tab with AMO_URL
  const amoTab = await chrome.tabs.create({
    active: isActive,
    url: AMO_URL,
    windowId: data.window.id,
  })

  if (isActive) {
    // create a tab group
    data.groupId = await chrome.tabs.group({
      tabIds: amoTab.id,
      createProperties: {
        windowId: data.window.id,
      },
    })

    chrome.tabGroups.update(data.groupId, {
      title: "AMO",
      color: "blue",
    })

    // remove first empty tab
    chrome.tabs.remove(data.window.tabs[0].id)
  }

  if (!isActive) {
    // add tab to the group
    await chrome.tabs.group({
      tabIds: amoTab.id,
      groupId: data.groupId,
    })
  }

  // Enter to form filling page
  await chrome.scripting.executeScript({
    target: { tabId: amoTab.id },
    func: () => {
      document.querySelector("a.intro-btn-bl").click()
    },
  })

  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (
      tab.id === amoTab.id &&
      tab.url.startsWith(AMO_URL + "Formulaire_Inscription_Ar.aspx") &&
      tab.status === "complete"
    ) {
      // get first family and remove it
      const family = data.families.shift()

      // Send family to amo.js content script
      chrome.tabs.sendMessage(amoTab.id, {
        type: "amo-form-insert",
        data: family,
      })
    }
  })
}
