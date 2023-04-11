"use strict";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type !== "amo-form-insert") return

    const family = message.data
    console.log(family)
    
    //// master
    /// get html fields of family master
    const master = {
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
    master.idcs.value = family.master.idcs.toString()
    // brithdate
    master.birthdate.year.value = family.master.birthdate.year.toString()
    master.birthdate.month.value = Number(family.master.birthdate.month).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false})
    master.birthdate.day.value = Number(family.master.birthdate.day).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false})
    // gender (default to male)
    master.gender.querySelector(`input[value=${family.master.gender}]`).click()
    // is married?
    master.isMarried.querySelector(`input[value="${family.spouse ? 1 : 0}"]`).click()

    //// spouse
    if (family.spouse) {
        // wait until spouse fileds are loaded then set them
        const tempInterval = setInterval(() => {
            /// get spouse fields
            const spouse = {
                idcs: document.querySelector("#ctl00_ContentPlaceHolder1_Txt_IDCS_Conjoint"),
                birthdate: {
                    year: document.querySelector("#Cbo_Annees_Naiss_Conjoint"),
                    month: document.querySelector("#Cbo_Mois_Naiss_Conjoint"),
                    day: document.querySelector("#Cbo_Jours_Naiss_Conjoint")
                },
                gender: document.querySelector("#ctl00_ContentPlaceHolder1_Est_Sexe_Conjoint"),
            }

            // check
            if (!spouse.idcs || spouse.idcs.value) return

            /// set spouse fields
            // idcs
            spouse.idcs.value = family.spouse.idcs.toString()
            // brithdate
            spouse.birthdate.year.value = family.spouse.birthdate.year
            spouse.birthdate.month.value = Number(family.spouse.birthdate.month).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false})
            spouse.birthdate.day.value = Number(family.spouse.birthdate.day).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false})
            // gender (default to female)
            spouse.gender.querySelector(`input[value="${family.spouse.gender}"]`).click()

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
                const childField = {
                    idcs: document.querySelector('[id*="Txt_IDCS_Enfant_Ajt"]'),
                    birthdate: {
                        year: document.querySelector("#Cbo_Annees_Naiss_Enfant_Ajt"),
                        month: document.querySelector("#Cbo_Mois_Naiss_Enfant_Ajt"),
                        day: document.querySelector("#Cbo_Jours_Naiss_Enfant_Ajt")
                    },
                    gender: document.querySelector('[id*="C_Sexe_Enfant_Ajt"'),
                }

                // check
                if (!childField.idcs || childField.idcs.value) return

                /// set child fields
                // idcs
                childField.idcs.value = child.idcs.toString()
                // brithdate
                childField.birthdate.year.value = child.birthdate.year
                childField.birthdate.month.value = Number(child.birthdate.month).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false})
                childField.birthdate.day.value = Number(child.birthdate.day).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false})
                // gender (default to male)
                childField.gender.querySelector(`input[value="${child.gender}"]`).click()

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
        console.log("message sent: amo-form-done")
        chrome.runtime.sendMessage(sender.id,
            {
                type: "amo-form-done"
            }
        )
    })
})
