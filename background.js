const RSU_URL = 'https://www.rsu.ma/rsu/personnal-space'
const AMO_URL = "https://www.amotadamon.ma/Formulaire_Inscription_Ar.aspx"

chrome.runtime.onInstalled.addListener(details => {
    if (details.reason === "install") {
        const welcomeURL = 'https://kamal-os.github.io/RSU-to-AMO/welcome/index.html'
        chrome.tabs.create({url: welcomeURL})   
    }
})

chrome.action.onClicked.addListener(async (tab) => {
    if (tab.url === RSU_URL && tab.status === 'complete') {
        const families = await chrome.tabs.sendMessage(
            tabID = tab.id,
            message = {
                type: "get-rsu-data",
                data: {}
            }
        )

        const amoWindow = await chrome.windows.create({
            focused: true,
        })

        let amoTabsIds = []
        for (let [index, family] of families.entries()) {
            const amoTab = await chrome.tabs.create({
                active: index == 0 ? true : false,
                url: AMO_URL,
                // openerTabId: tab.id
            })
            amoTabsIds.push(amoTab.id)
            
            await chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
                if (amoTab.id == tabId && changeInfo.status === 'complete') {
                    const childs = await chrome.tabs.sendMessage(
                        tabID = tabId,
                        message = {
                            type: "set-amo-data",
                            data: family
                        }
                    )

                    if (!childs.length) return

                    await chrome.scripting.executeScript({
                        target: {tabId: amoTab.id},
                        world: "MAIN",
                        args: [childs],
                        func: injectChilds
                    })
                    
                    async function injectChilds(childs) {
                        
                        function addChild(familyChild) {
                            console.log(familyChild)
                            const child = {
                                idcs: document.getElementById("ctl00_ContentPlaceHolder1_GridView_Liste_Enfants_ctl03_Txt_IDCS_Enfant_Ajt"),
                                birthdate: {
                                    year: document.getElementById("Cbo_Annees_Naiss_Enfant_Ajt"),
                                    month: document.getElementById("Cbo_Mois_Naiss_Enfant_Ajt"),
                                    day: document.getElementById("Cbo_Jours_Naiss_Enfant_Ajt")
                                },
                                sex: document.getElementById("ctl00_ContentPlaceHolder1_GridView_Liste_Enfants_ctl03_C_Sexe_Enfant_Ajt"),
                            }

                            // set child fields
                            // idcs
                            child.idcs.value = familyChild.idcs.toString()
                            // brithdate
                            child.birthdate.year.value = familyChild.birthdate.year
                            child.birthdate.month.value = Number(familyChild.birthdate.month).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false})
                            child.birthdate.day.value = Number(familyChild.birthdate.day).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false})
                            // sex (default to male)
                            child.sex.querySelector(`input[value="M"]`).click()

                            // click add button
                            document.getElementById("ctl00_ContentPlaceHolder1_GridView_Liste_Enfants_ctl03_ButtonAdd").click()
                        }
                        
                        for (const child of childs) {
                            addChild(child)
                            await new Promise(r => setTimeout(r, 5000));
                        }
                    }
                }
            })
        }

        // close the first empty tab
        await chrome.tabs.remove(amoWindow.tabs[0].id)

        const amoGroup = await chrome.tabs.group({
            tabIds: amoTabsIds
        })
        await chrome.tabGroups.update(amoGroup, {
            title: "AMO",
            color: "blue"
        })
    }
})

// chrome.runtime.onMessage()