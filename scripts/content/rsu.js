"use strict";

const normName = (name) => {
    let norm = name.trim()
    if (name.substring(0, 2) === "ال") {
        norm = name.substring(2)
    }
    norm = norm.replaceAll('أ', 'ا')
    norm = norm.replaceAll('إ', 'ا')
    norm = norm.replaceAll('آ', 'ا')
    norm = norm.replaceAll('ث', 'ت')
    norm = norm.replaceAll(/َ|ً|ُ|ٌ|ّ|ٍ|ِ|ْ|ٰ|ٓ|ـ/g, "")
    return norm
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type !== "rsu-set-gender") return

    const table = document.querySelector("rsu-members-detail table")
    const rows = table.querySelectorAll("tbody tr")
    const countRows = rows.length
    if (countRows < 1) return

    rows.forEach((row) => {
        const cells = row.querySelectorAll("td")
        const personalName = normName(cells[3].innerText)
        const genderOptions = cells[4]

        let isFound = message.data.female_names.some(name => normName(name) === personalName)

        if (isFound) {
            const input = genderOptions.querySelector('input[value="F"]')
            input.checked = true
            input.dispatchEvent(new Event("change"))
        }

        isFound = message.data.male_names.some(name => normName(name) === personalName)

        if (isFound) {
            const input = genderOptions.querySelector('input[value="M"]')
            input.checked = true
            input.dispatchEvent(new Event("change"))
        }
    })
})