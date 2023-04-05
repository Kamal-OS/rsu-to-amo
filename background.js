const RSU_URL = 'https://www.rsu.ma/rsu/personnal-space'
const AMO_URL = "https://www.amotadamon.ma/Formulaire_Inscription_Ar.aspx"

chrome.action.onClicked.addListener(async (tab) => {
    if (tab.url === RSU_URL) {
        const families = await chrome.tabs.sendMessage(
            tabID = tab.id,
            message = {
                type: "get-rsu-data",
                data: {}
            }
        )

        let amoTabsIds = []
        for (let [index, family] of families.entries()) {
            const amoTab = await chrome.tabs.create({
                active: index == 0 ? true : false,
                url: AMO_URL
            })
            amoTabsIds.push(amoTab.id)
            
            if (index == 0) {
                await chrome.windows.create({
                    focused: true,
                    tabId: amoTab.id
                })
            }

            await chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
                if (amoTab.id == tabId && changeInfo.status === 'complete') {
                    chrome.tabs.sendMessage(
                        tabID = tabId,
                        message = {
                            type: "set-amo-data",
                            data: family,
                        }
                    )
                }
            })
        }

        const amoGroup = await chrome.tabs.group({
            tabIds: amoTabsIds
        })
        await chrome.tabGroups.update(amoGroup, {
            title: "AMO",
            color: "orange"
        })

        // await chrome.tabs.update(
        //     tabId = amoTabsIds[index].id,
        //     { active: true }
        // )
        // })
    }
})