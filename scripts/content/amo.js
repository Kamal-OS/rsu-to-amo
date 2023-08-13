"use strict";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type !== "amo-form-insert") return

    const family = message.data

    // move spouse to master if master is null
    if (!family.master) {
        family.master = family.spouse
        family.spouse = null
    }
    
    //// master
    /// get html fields of family master
    const masterFields = {
        idcs: document.querySelector("#ctl00_ContentPlaceHolder1_Txt_IDCS"),
        birthdate: {
            year: document.querySelector("#Cbo_Annees_Naiss"),
            month: document.querySelector("#Cbo_Mois_Naiss"),
            day: document.querySelector("#Cbo_Jours_Naiss")
        },
        gender: document.querySelector("#ctl00_ContentPlaceHolder1_Est_Sexe"),
        isMarried: document.querySelector("#ctl00_ContentPlaceHolder1_Est_Existe_Conjoint")
    }

    /// set html fields of family master
    // idcs
    masterFields.idcs.value = family.master.idcs.toString()
    // brithdate
    masterFields.birthdate.year.value = family.master.birthdate.year.toString()
    masterFields.birthdate.month.value = Number(family.master.birthdate.month).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false})
    masterFields.birthdate.day.value = Number(family.master.birthdate.day).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false})
    // gender (default to male)
    masterFields.gender.querySelector(`input[value=${family.master.gender}]`).click()
    // is married?
    masterFields.isMarried.querySelector(`input[value="${family.spouse ? 1 : 0}"]`).click()

    //// spouse
    if (family.spouse) {
        // wait until spouse fileds are loaded then set them
        const tempInterval = setInterval(() => {
            /// get spouse fields
            const spouseFields = {
                idcs: document.querySelector("#ctl00_ContentPlaceHolder1_Txt_IDCS_Conjoint"),
                birthdate: {
                    year: document.querySelector("#Cbo_Annees_Naiss_Conjoint"),
                    month: document.querySelector("#Cbo_Mois_Naiss_Conjoint"),
                    day: document.querySelector("#Cbo_Jours_Naiss_Conjoint")
                },
                gender: document.querySelector("#ctl00_ContentPlaceHolder1_Est_Sexe_Conjoint"),
            }

            // check
            if (!spouseFields.idcs || spouseFields.idcs.value) return

            /// set spouse fields
            // idcs
            spouseFields.idcs.value = family.spouse.idcs.toString()
            // brithdate
            spouseFields.birthdate.year.value = family.spouse.birthdate.year
            spouseFields.birthdate.month.value = Number(family.spouse.birthdate.month).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false})
            spouseFields.birthdate.day.value = Number(family.spouse.birthdate.day).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false})
            // gender (default to female)
            spouseFields.gender.querySelector(`input[value="${family.spouse.gender}"]`).click()

            // stop
            clearInterval(tempInterval)
        }, 500)
    }

    //// children
    new Promise(resolve => {
        family.children.forEach((child, index, array) => {
            // wait until child fileds are loaded (after add btn click) then set them
            const tempInterval = setInterval(() => {
                /// get child fields
                const childFields = {
                    idcs: document.querySelector('[id*="Txt_IDCS_Enfant_Ajt"]'),
                    birthdate: {
                        year: document.querySelector("#Cbo_Annees_Naiss_Enfant_Ajt"),
                        month: document.querySelector("#Cbo_Mois_Naiss_Enfant_Ajt"),
                        day: document.querySelector("#Cbo_Jours_Naiss_Enfant_Ajt")
                    },
                    gender: document.querySelector('[id*="C_Sexe_Enfant_Ajt"'),
                }

                // check
                if (!childFields.idcs || childFields.idcs.value) return

                /// set child fields
                // idcs
                childFields.idcs.value = child.idcs.toString()
                // brithdate
                childFields.birthdate.year.value = child.birthdate.year
                childFields.birthdate.month.value = Number(child.birthdate.month).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false})
                childFields.birthdate.day.value = Number(child.birthdate.day).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false})
                // gender (default to male)
                childFields.gender.querySelector(`input[value="${child.gender}"]`).click()

                /// fields are ready just click the add button
                chrome.runtime.sendMessage(sender.id, {
                    type: "click-add-child"
                })

                // stop
                clearInterval(tempInterval)
            }, 500)
        })
        resolve()
    })
    .then(() => {
        chrome.runtime.sendMessage(sender.id,
            {
                type: "amo-form-done"
            }
        )
    })
})
