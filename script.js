(() => {
    function getRSUData() {
        const rows = document.querySelectorAll("table tbody > tr")
        
        const families = []
        const family = {
            head: "",
            spouse: "",
            childs: []
        }

        for (var [index, row] of rows.entries()) {
            row = row.querySelectorAll("td")
            
            const person = {
                idcs: row[0].innerText,
                lastname: row[1].innerText,
                firstname: row[2].innerText,
                kinship: row[3].innerText,
                birthdate: row[4].innerText
            }

            let _birthdate = person.birthdate.split('/')

            person.birthdate = {
                year: _birthdate[_birthdate.length - 1],
                month: _birthdate[_birthdate.length - 2] || "9999",
                day: _birthdate[_birthdate.length - 3] || "9999"
            }

            _birthdate = {
                year: _birthdate[_birthdate.length - 1],
                month: _birthdate[_birthdate.length - 2] || 1,
                day: _birthdate[_birthdate.length - 3] || 1
            }
            
            // head of family
            if (index == 0) {
                family.head = person
            }
            // spouse
            else if (person.kinship.includes('زوج')) {
                family.spouse = person
            }
            // child
            else {
                // calculate age
                const age = (() => {
                    _birthdate = new Date(
                        _birthdate.year,
                        _birthdate.month - 1,
                        _birthdate.day
                    )

                    let ageDifMs = Date.now() - _birthdate
                    let ageDate = new Date(ageDifMs)
                    return Math.abs(ageDate.getUTCFullYear() - 1970)
                })()
                
                if (age >= 18) {
                    families.push({...family})
                    
                    family.head = person
                    family.spouse = ""
                    family.childs = ""
                }
                else {
                    if (families.length) {
                        families[0].childs.push(person)
                    }
                    else {
                        family.childs.push(person)
                    }
                }
            }

            if (index >= (rows.length - 1)) {
                families.push({...family})
            }
        }

        return families
    }

    function waitForElement(selector) {
        return new Promise(resolve => {
            if (document.querySelector(selector)) {
                return resolve(document.querySelector(selector))
            }

            const observer = new MutationObserver(mutations => {
                if (document.querySelector(selector)) {
                    resolve(document.querySelector(selector))
                    observer.disconnect()
                }
            })

            observer.observe(document.body, {
                childList: true,
                subtree: true
            })
        })
    }

    function setAMOData(family) {
        // get family head fields
        const head = {
            idcs: document.getElementById("ctl00_ContentPlaceHolder1_Txt_IDCS"),
            birthdate: {
                year: document.getElementById("Cbo_Annees_Naiss"),
                month: document.getElementById("Cbo_Mois_Naiss"),
                day: document.getElementById("Cbo_Jours_Naiss")
            },
            sex: document.getElementById("ctl00_ContentPlaceHolder1_Est_Sexe"),
            isMarried: document.getElementById("ctl00_ContentPlaceHolder1_Est_Existe_Conjoint")
        }

        // set family head fields
        // idcs
        head.idcs.value = family.head.idcs.toString()
        // brithdate
        head.birthdate.year.value = family.head.birthdate.year
        head.birthdate.month.value = Number(family.head.birthdate.month).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false})
        head.birthdate.day.value = Number(family.head.birthdate.day).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false})
        // sex (default to male)
        head.sex.querySelector(`input[value="M"]`).click()
        // is married?
        head.isMarried.querySelector(`input[value="${family.spouse === "" ? 0 : 1}"]`).click()

        // spouse
        if (family.spouse) {
            // wait until spouse fileds are loaded
            waitForElement("#ctl00_ContentPlaceHolder1_Txt_IDCS_Conjoint").then((element) => {
                // get spouse fields
                const spouse = {
                    idcs: document.getElementById("ctl00_ContentPlaceHolder1_Txt_IDCS_Conjoint"),
                    birthdate: {
                        year: document.getElementById("Cbo_Annees_Naiss_Conjoint"),
                        month: document.getElementById("Cbo_Mois_Naiss_Conjoint"),
                        day: document.getElementById("Cbo_Jours_Naiss_Conjoint")
                    },
                    sex: document.getElementById("ctl00_ContentPlaceHolder1_Est_Sexe_Conjoint"),
                }
    
                // set spouse fields
                // idcs
                spouse.idcs.value = family.spouse.idcs.toString()
                // brithdate
                spouse.birthdate.year.value = family.spouse.birthdate.year
                spouse.birthdate.month.value = Number(family.spouse.birthdate.month).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false})
                spouse.birthdate.day.value = Number(family.spouse.birthdate.day).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false})
                // sex (default to female)
                spouse.sex.querySelector(`input[value="F"]`).click()
                // is married?
                spouse.isMarried.querySelector(`input[value="${family.spouse === "" ? 0 : 1}"]`).click()
            })
        }

        return family.childs
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'get-rsu-data') {
            sendResponse(getRSUData())
        }
        
        if (message.type === 'set-amo-data') {
            sendResponse(setAMOData(message.data))
        }
    });
})()