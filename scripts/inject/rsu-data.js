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

    const families = {
        // رب الاسرة، زوج (ة) رب الأسرة، ابن أو ابنة رب الأسرة القاصرين
        head: null,
        // ابن أو ابنة رب الأسرة البالغين
        adults: [],
        // أب أو أم رب الأسرة
        parents_head: null,
        // أب أو أم زوج(ة) رب الأسرة
        parents_spouse: null,
        // أخ أو أخت رب الأسرة
        siblings: []

        // TODO: حفيد(ة)، آخر
    }

    // TODO: index not used
    for (const [index, row] of rows.entries()) {
        // all cells in row
        const cells = row.querySelectorAll("td")
        
        // skip, if row is disabled
        if (!cells[0].querySelector("input").checked) {
            continue
        }

        Object.keys(person).forEach((key, index) => {
            // skip first cell (used for just active state)
            let value = cells[index + 1].innerText

            if (key === "gender") {
                value = cells[index + 1].querySelector("input:checked").value
            }

            person[key] = value.trim()
        }); // ; is OBLIGATORY

        // set birthdate as object of {year,month,day}
        (() => {
            const _birthdate = person.birthdate.split('/')
            person.birthdate = {
                year: _birthdate[_birthdate.length - 1],
                month: _birthdate[_birthdate.length - 2] || "9999",
                day: _birthdate[_birthdate.length - 3] || "9999"
            }
        })()

        const ageFromBirthdate = (birthdate) => {
            const dateOfBirth = new Date(
                birthdate.year,
                (birthdate.month === "9999" ? 1 : birthdate.month) - 1,
                birthdate.day === "9999" ? 1 : birthdate.day
            )

            const ageDifMs = Date.now() - dateOfBirth
            const ageDate = new Date(ageDifMs)
            return Math.abs(ageDate.getUTCFullYear() - 1970)
        }

        const family = {
            master: null,
            spouse: null,
            children: []
        }
        Object.seal(family)

        switch (person.relation) {
            case "رب الأسرة": {
                family.master = { ...person }
                families.head = { ...family }

                break
            }

            case "زوج (ة) رب الأسرة": {
                families.head.spouse = { ...person }

                break
            }

            case "ابن أو ابنة رب الأسرة": {
                const age = ageFromBirthdate(person.birthdate)

                if (age < 18) {
                    families.head.children.push({ ...person })
                }
                else {
                    // TODO: adult with own family
                    // spouse: اخر
                    // children: حفيد
                    family.master = { ...person }
                    families.adults.push({ ...family })
                }

                break
            }

            case "أب أو أم رب الأسرة": {
                if (person.gender === "M") {
                    if (families.parents_head) {
                        families.parents_head.master = { ...person }
                    }
                    else {
                        family.master = { ...person }
                        families.parents_head = { ...family }
                    }
                }
                else {
                    if (families.parents_head) {
                        families.parents_head.spouse = { ...person }
                    }
                    else {
                        family.spouse = { ...person }
                        families.parents_head = { ...family }
                    }
                }

                break
            }

            case "أب أو أم زوج(ة) رب الأسرة": {
                if (person.gender === "M") {
                    if (families.parents_spouse) {
                        families.parents_spouse.master = { ...person }
                    }
                    else {
                        family.master = { ...person }
                        families.parents_spouse = { ...family }
                    }
                }
                else {
                    if (families.parents_spouse) {
                        families.parents_spouse.spouse = { ...person }
                    }
                    else {
                        family.spouse = { ...person }
                        families.parents_spouse = { ...family }
                    }
                }

                break
            }

            // TODO: only single adults
            case "أخ أو أخت رب الأسرة": {
                const age = ageFromBirthdate(person.birthdate)

                if (age >= 18) {
                    family.master = { ...person }
                    families.siblings.push({ ...family })
                }

                break
            }
        }
    }
    
    console.log(families)

    chrome.runtime.sendMessage(
        {
            type: "rsu-data-ready",
            data: families
        }
    )
})()
