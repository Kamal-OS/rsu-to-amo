"use strict";

(() => {

    const rows = document.querySelectorAll("table tbody > tr")

    const person = {
        idcs: null,
        lastname: null,
        firstname: null,
        gender: null,
        relation: null,
        birthdate: null
    }
    Object.seal(person)

    const family = {
        master: null,
        spouse: null,
        children: []
    }
    Object.seal(family)

    const families = []
    
    for (const [index, row] of rows.entries()) {
        const columns = row.querySelectorAll("td")

        Object.keys(person).forEach((key, index) => {
            let value = columns[index].innerText
            // gender column
            if (key === "gender") {
                value = columns[index].querySelector("input:checked").value
            }
            person[key] = value.trim()
        });

        // set birthdate as object of {year,month,day}
        (() => {
            const _birthdate = person.birthdate.split('/')
            person.birthdate = {
                year: _birthdate[_birthdate.length - 1],
                month: _birthdate[_birthdate.length - 2] || "9999",
                day: _birthdate[_birthdate.length - 3] || "9999"
            }
        })()

        /*
            This code assume the following:
                - spouse of the master is always the second entry if exist
                - children are sorted from youngest to oldest
                - adult children are always single
        */
        switch (person.relation) {
            case "رب الأسرة": {
                family.master = {...person}
                break
            }
            case "زوج (ة) رب الأسرة": {
                family.spouse = {...person}
                break
            }
            case "ابن أو ابنة رب الأسرة": {
                const age = (() => {
                    const dateOfBirth = new Date(
                        person.birthdate.year,
                        (person.birthdate.month === "9999" ? 1 : person.birthdate.month) - 1,
                        person.birthdate.day === "9999" ? 1 : person.birthdate.day
                    )

                    const ageDifMs = Date.now() - dateOfBirth
                    const ageDate = new Date(ageDifMs)
                    return Math.abs(ageDate.getUTCFullYear() - 1970)
                })()

                // add child to the master of family
                if (age < 18) {
                    if (families.length) {
                        families[0].children.push({...person}) // for safety even useless
                    }
                    else {
                        family.children.push({...person})
                    }
                    break
                }
                
                families.push({...family})
            
                family.master = {...person},
                family.spouse = null,
                family.children = []

                break
            }
        }
        
        if (index >= (rows.length - 1)) {
            families.push({...family})
        }
    }
    
    chrome.runtime.sendMessage(
        {
            type: "rsu-data-ready",
            data: families
        }
    )
})()
