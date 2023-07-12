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

    const htmlToggleSwitch = `
        <label class="switch">
            <input type="checkbox" name="checkbox" id="toggle">
            <span class="slider round"></span>
        </label>
    `
    const table = document.querySelector("rsu-members-detail table")
    const headers = table.querySelectorAll("thead tr th")
    
    const makeHeader = (index, title, position) => {
        const tempHeader = headers[index]
        const header = tempHeader.cloneNode(false)
        header.innerText = title
        const insertposition = position + (position == "after" ? "end" : position == "before" ? "begin" : "")
        
        // invalid position
        if (insertposition == position) return

        tempHeader.insertAdjacentElement(insertposition, header)
    }

    // Make Toggle Switch header
    // makeHeader(0, "تفعيل AMO", "before")
    
    // Make gender header
    makeHeader(2, "النوع", "after")
    
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

    // insert columns when atleast one row is loaded in the table
    const tempInterval =  setInterval(() => {
        const rows = table.querySelectorAll("tbody tr")

        if (rows.length <= 0) return

        const isActiveLookUp = new Array(rows.length).fill(true)
        const isGenderCheckedLookUp = new Array(rows.length).fill(false)

        rows.forEach((row, index) => {
            const cells = row.querySelectorAll("td")

            // const firstCol = cells[0]
            // const toggleSwitch = firstCol.cloneNode(false)
            // toggleSwitch.innerHTML = htmlToggleSwitch

            // Cell in the third column (not whole column)
            const thirdCol = cells[2]
            const genderOptions = thirdCol.cloneNode(false)
            genderOptions.innerHTML = htmlGenderOptions

            // edit radio IDs
            genderOptions.querySelectorAll("input").forEach((input) => {
                input.id += index

                const nameAttr = input.getAttribute("name") + index
                input.setAttribute("name", nameAttr)

                // TODO: add listener to global table only
                input.addEventListener('change', (event) => {
                    const index = Number(event.target.id.split("_")[1])
                    isGenderCheckedLookUp[index] = true
                    
                    const countChecked = isGenderCheckedLookUp.filter((check) => (check === true)).length
                    // Enable AMO submit button if all fields input answered
                    if (countChecked === isGenderCheckedLookUp.length) {
                        submitBtn.style.opacity = 1
                        submitBtn.disabled = false
                    }

                    event.preventDefault()
                    event.stopPropagation()
                })
            })

            // edit label's' attribute
            genderOptions.querySelectorAll("label").forEach((label) => {
                const forAttr = label.getAttribute("for") + index
                label.setAttribute("for", forAttr)
            })

            // firstCol.insertAdjacentElement('beforebegin', toggleSwitch)
            thirdCol.insertAdjacentElement('afterend', genderOptions)
        })

        clearInterval(tempInterval)
    }, 500)
    
})()