"use strict";

(() => {

    const htmlGenderOptions = `
        <div class="gender-input-wrap">
            <div class="gender-input">
                <input id="gender-male_" type="radio" name="gender_" value="M">
                <label for="gender-male_" class="form-check-label"> ذكر </label>
            </div>
            <div class="gender-input">
                <input id="gender-female_" type="radio" name="gender_" value="F">
                <label for="gender-female_" class="form-check-label"> أنثى </label>
            </div>
        </div>
    `

    const htmlSubmitBtn = `
        <div style="display: flex; justify-content: center;">
            <button id="amo-btn" type="button" class="ajMemMng" style="background: linear-gradient(90deg,#0062cb 0%,#0479f7 35%,#75b7ff 100%);" disabled>
                <span>طلب "AMO تضامن"</span>
            </button>
        </div>
    `

    const table = document.querySelector("rsu-members-detail table")

    const thirdHeader = table.querySelectorAll("thead tr th")[2]
    const genderHeader = thirdHeader.cloneNode(false)
    genderHeader.innerText = "النوع"
    thirdHeader.insertAdjacentElement('afterend', genderHeader)
    
    // insert submit button after the table
    table.insertAdjacentHTML('afterend', htmlSubmitBtn)
    const submitBtn = document.querySelector("#amo-btn")

    submitBtn.addEventListener("click", () => {
        if (submitBtn.disabled) return
        
        // only background script can get tabId
        // so we can't run execute scripts from here
        chrome.runtime.sendMessage(
            {
                type: "rsu-ui-ready"
            }
        )
    })

    // insert gender column when atleast one row is loaded in the table
    const tempInterval =  setInterval(() => {
        const rows = table.querySelectorAll("tbody tr")

        if (rows.length <= 0) return

        const isCheckedLookUp = new Array(rows.length).fill(false)

        rows.forEach((row, index) => {
            const thirdCol = row.querySelectorAll("td")[2]
            const genderOptions = thirdCol.cloneNode(false)
            genderOptions.innerHTML = htmlGenderOptions

            // edit radio IDs
            genderOptions.querySelectorAll("input").forEach((input) => {
                input.id += index

                const nameAttr = input.getAttribute("name") + index
                input.setAttribute("name", nameAttr)

                // TODO: add listener to global table only
                input.addEventListener('change', (event) => {
                // input.addEventListener('click', (event) => {
                    const index = Number(event.target.id.split("_")[1])
                    isCheckedLookUp[index] = true
                    
                    const countChecked = isCheckedLookUp.filter((check) => (check === true)).length
                    // Enable AMO submit button if all fields input answered
                    if (countChecked === isCheckedLookUp.length) {
                        submitBtn.style.opacity = 1
                        submitBtn.disabled = false
                    }

                    event.preventDefault()
                    event.stopPropagation()
                })
            })
            // genderOptions.querySelector("input[value='F']").click()

            // edit label IDs
            genderOptions.querySelectorAll("label").forEach((label) => {
                const forAttr = label.getAttribute("for") + index
                label.setAttribute("for", forAttr)
            })

            thirdCol.insertAdjacentElement('afterend', genderOptions)
        })

        clearInterval(tempInterval)
    }, 500)
    
})()