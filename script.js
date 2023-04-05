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

            const _birthdate = person.birthdate.split('/')
            person.birthdate = new Date(
                _birthdate[_birthdate.length - 1],
                _birthdate[_birthdate.length - 2] - 1 || 0,
                _birthdate[_birthdate.length - 3] || 0
            )
            
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
                    let ageDifMs = Date.now() - person.birthdate
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
                    families[0].childs.push(person)
                }
            }

            if (index >= rows.length - 1) {
                families.push({...family})
            }
        }
        
        return families
    }

    function setAMOData(family) {
        // family head
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

        // head.idcs.value = family.head.idcs.toString()
        // head.birthdate.year.value = family.head.birthdate.getFullYear().toString()
        // head.birthdate.month.value = ((family.head.birthdate.getMonth() || 9998) + 1).toString()
        // head.birthdate.day.value = (family.head.birthdate.getDate() || 9999).toString()
        document.getElementById("ctl00_ContentPlaceHolder1_Est_Sexe").querySelector(`input[value="M"]`).click()
        // head.isMarried.querySelector(`input[value="${family.spouse !== ""}"]`).click()

    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'get-rsu-data') {
            sendResponse(getRSUData())
        }
        
        if (message.type === 'set-amo-data') {
            setAMOData(message.data)
        }
    });
})()