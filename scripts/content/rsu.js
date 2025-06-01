"use strict"

// normalize arabic text for easy comparison
const normName = (name) => {
  let norm = name.trim()

  // delete "ال التعريف"
  norm = norm.replace(/^ال/g, "")

  // replace alhamza with normal one
  norm = norm.replaceAll(/[أإآ]/g, "ا")

  // replace ث with ت
  norm = norm.replaceAll("ث", "ت")

  // delete diacritics
  norm = norm.replaceAll(/َ|ً|ُ|ٌ|ّ|ٍ|ِ|ْ|ٰ|ٓ|ـ/g, "")

  return norm
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Hi")
  if (message.type !== "rsu-set-gender") return

  const table = document.querySelector("rsu-members-detail table")
  const rows = table.querySelectorAll("tbody tr")
  const countRows = rows.length
  if (countRows < 1) return

  rows.forEach((row) => {
    const cells = row.querySelectorAll("td")
    const personalName = normName(cells[3].innerText)
    const genderOptions = cells[4]

    let isFound = message.data.female_names.some(
      (name) => normName(name) === personalName
    )

    if (isFound) {
      const input = genderOptions.querySelector('input[value="F"]')
      input.checked = true
      input.dispatchEvent(new Event("change"))
    }

    isFound = message.data.male_names.some(
      (name) => normName(name) === personalName
    )

    if (isFound) {
      const input = genderOptions.querySelector('input[value="M"]')
      input.checked = true
      input.dispatchEvent(new Event("change"))
    }
  })
})
