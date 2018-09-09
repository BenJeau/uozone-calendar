const puppeteer = require('puppeteer');
const fs = require('fs');
const esformatter = require('esformatter');

const filename = "data.json";
const USERNAME = "";
const PASSWORD = "";
const LINKS = {
    home: "https://uozone2.uottawa.ca/",
    beforeExtraction: "https://www.uocampus.uottawa.ca/psp/csprpr9www/EMPLOYEE/HRMS/c/SA_LEARNER_SERVICES.SSR_SSENRL_LIST.GBL?languageCd=ENG",
    extraction: "https://www.uocampus.uottawa.ca/psc/csprpr9www/EMPLOYEE/HRMS/c/SA_LEARNER_SERVICES.SSR_SSENRL_LIST.GBL?languageCd=ENG"
}

let page;
let browser;

async function asyncMain() {
    browser = await puppeteer.launch({ headless: true });
    page = await browser.newPage();

    // Does not load images on the webpage (speeds up load times)
    await page.setRequestInterception(true);
    await page.on('request', request => {
        if (request.resourceType() === 'image')
            request.abort();
        else
            request.continue();
    });

    // Prints everything from the broswer console in the terminal and removes the errors from not loading images
    await page.on('console', msg => {
        if (msg.text().trim() !== "Failed to load resource: net::ERR_FAILED") {
            console.log('PAGE LOG:', msg.text())
        }
    });

    // Goes to uoZone's website
    console.log("----- LOADING HOME")
    await page.goto(LINKS.home);

    // Logs in to uoZone --- Potential issue: to go to the next step, its time based
    console.log("----- LOGING IN");
    await uozoneLogIn();
    await sleep(2000);

    // Goes to the website with the course information
    console.log("----- LOADING MAIN WEBSITE - TO HAVE ACCESS")
    await page.goto(LINKS.beforeExtraction);

    // Extracts information
    console.log("----- EXTRACTING INFORMATION")
    await page.goto(LINKS.extraction);
    await preliminarySteps(); 
    await navigateUozone();   
}

async function preliminarySteps() {
    await page.exposeFunction("navigateUozone", navigateUozone);
    await page.exposeFunction("writeToConsole", message => {
        console.log(message);
    });
    await page.exposeFunction("finished", async data => {
        console.log("----- COURSE INFO");
        console.log("----- SAVING THE DATA IN THE FILE NAMED: " + __dirname + "\\" + filename);
        fs.writeFile(filename, esformatter.format(data) , (err) => {
            if (err) throw err;
        });
        console.log("----- LOGING OUT");
        await page.goto(LINKS.home + "/user/logout");
        browser.close();
    });
    await page.evaluate(() => {
        let id = 0;
        let numRadio = document.getElementsByClassName("PSRADIOBUTTON").length;
        let element = document.getElementById('WAIT_win0');

        function loading() {
            var array = document.getElementById("WAIT_win0").getAttribute("style").split(/(:)*(;)|(;)*(:)/).filter(s => s !== undefined && s.trim() !== ":" && s.trim() !== ";" && s !== "").map(s => s.trim());
            for (var i = 0; i < array.length - 1; i++) {
                if (array[i] === "display" && array[i + 1] === "block" || array[i] === "visibility" && array[i + 1] === "visible") {
                    return true;
                }
            }
            return false;
        }

        var observer = new MutationObserver(async (mutations) => {
            await (async (mutation) => {
                if (mutation.type == "attributes" && loading() === false) {
                    id++;
                    writeToConsole("----- EXTRACTING INFORMATION - STEP " + id + "/" + numRadio * 2);

                    if (id <= numRadio * 2) {
                        if (numRadio * 2 !== id) {
                            await navigateUozone();
                        }

                        if (id === numRadio * 2) {
                            finished(localStorage.getItem("currentInfo"));
                        }
                    }
                }
            })(mutations[0]);
        });

        observer.observe(element, {
            attributes: true
        });
    });
}

async function navigateUozone() {
    await page.evaluate(() => {
        const LOCAL_TERM = "currentTerm";
        const LOCAL_INFO = "currentInfo";
        const LOCAL_NUM_BUTTON = "numRadioButton";
        const weekdayConcordance = {
            Mo: "Monday",
            Tu: "Tuesday",
            We: "Wednesday",
            Th: "Thursday",
            Fr: "Friday",
            Sa: "Sathurday",
            Su: "Sunday"
        };

        function extractCourseSchedule() {
            let basicInfo = document.getElementById("DERIVED_REGFRM1_SSR_STDNTKEY_DESCR$11$").innerHTML.split(" | ");

            let termInfo = basicInfo[0].split(" ");
            let year = termInfo[0];
            let trimester = termInfo[1];

            let term = {
                year,
                trimester,
                level: basicInfo[1],
                courses: []
            };

            let tables = Array.from(document.getElementsByClassName("PSGROUPBOXWBO"));
            tables = tables.filter(table => table.getElementsByTagName("input").length === 0);

            for (var i = 0; i < tables.length; i++) {
                let basicInfo = tables[i].getElementsByClassName("PAGROUPDIVIDER")[0].innerHTML.split("-");

                let contentTable = tables[i].getElementsByClassName("PSLEVEL3GRIDNBO");
                let firstRow = contentTable[0].getElementsByClassName("PSLEVEL3GRIDROW");
                let secondRow = contentTable[1].getElementsByClassName("PSLEVEL3GRIDROW");

                let classes = [];
                for (var j = 0; j < secondRow.length / 7; j++) {

                    let date = getHTMLContent(secondRow[j * 7 + 6]);

                    if (date.split(" - ").length === 2) {
                        date = date.split(" - ").sort((a, b) => {
                            return new Date(a) - new Date(b);
                        });
                    }

                    let startDate = date[0];
                    let endDate = date[1];

                    let time = getHTMLContent(secondRow[j * 7 + 3]);
                    let weekday = weekdayConcordance[time.substr(0, 2)];
                    time = time.substr(3).split(" - ").sort((a, b) => {
                        return new Date('1970/01/01 ' + a) - new Date('1970/01/01 ' + b);
                    });

                    let startTime = time[0];
                    let endTime = time[1];

                    let place = getHTMLContent(secondRow[j * 7 + 4]).split(/[\(*\)]/).map(s => s.trim());
                    let address = place[0];
                    let building = place[1];
                    let room = place[2];

                    classes.push({
                        classNumber: getHTMLContent(secondRow[j * 7]),
                        section: getHTMLContent(secondRow[j * 7 + 1]),
                        type: getHTMLContent(secondRow[j * 7 + 2]),
                        instructor: getHTMLContent(secondRow[j * 7 + 5]),
                        startTime,
                        endTime,
                        startDate,
                        endDate,
                        weekday,
                        address,
                        building,
                        room
                    });
                }

                term.courses.push({
                    code: basicInfo[0].trim(),
                    name: basicInfo[1].trim(),
                    status: firstRow[0].textContent.trim(),
                    units: firstRow[1].textContent.trim(),
                    grading: firstRow[2].textContent.trim(),
                    grade: firstRow[3].textContent.trim(),
                    classes
                });
            }

            return term;
        }

        function getHTMLContent(content) {
            return content.textContent.trim();
        }

        function extractInfo() {
            let term = extractCourseSchedule();
            let data = [];

            if (localStorage.getItem(LOCAL_INFO) === null) {
                data = [term];
            } else {
                data = [...JSON.parse(localStorage.getItem(LOCAL_INFO)), term];
            }

            localStorage.setItem(LOCAL_INFO, JSON.stringify(data));
        }

        function navigateUozonePage() {
            if (localStorage.getItem(LOCAL_NUM_BUTTON) === null) {
                localStorage.setItem(LOCAL_NUM_BUTTON, document.getElementsByClassName("PSRADIOBUTTON").length);
            }

            if (document.getElementsByClassName("PSRADIOBUTTON").length === parseInt(localStorage.getItem(LOCAL_NUM_BUTTON))) {
                if (localStorage.getItem(LOCAL_TERM) === null) {
                    localStorage.setItem(LOCAL_TERM, 0);
                } else {
                    localStorage.setItem(LOCAL_TERM, parseInt(localStorage.getItem(LOCAL_TERM)) + 1);
                }

                document.getElementsByClassName("PSRADIOBUTTON")[localStorage.getItem(LOCAL_TERM)].checked = true;
                document.getElementById("DERIVED_SSS_SCT_SSR_PB_GO").click();
            } else {
                extractInfo();
                document.getElementById("DERIVED_SSS_SCT_SSS_TERM_LINK").click();
            }
        }

        if (localStorage.getItem(LOCAL_NUM_BUTTON) === null || localStorage.getItem(LOCAL_TERM) === null || parseInt(localStorage.getItem(LOCAL_TERM)) !== parseInt(localStorage.getItem(LOCAL_NUM_BUTTON))) {
            window.onload = navigateUozonePage();
        }
    });
}

async function uozoneLogIn() {
    await page.evaluate((username, password) => {
        document.getElementById('userNameInput').value = username;
        document.getElementById('passwordInput').value = password;
        document.forms['loginForm'].submit();
    }, USERNAME, PASSWORD);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

asyncMain();