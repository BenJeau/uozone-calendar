# uozoneCalendar
This project uses [Google's Puppeteer](https://github.com/GoogleChrome/puppeteer) headless chrome browser to extract the information about the course schedule on University of Ottawa uoZone's website. 

## Initial setup
You need [node.js](https://nodejs.org/en/download/) installed on your computer and you need to clone this repository 
```
git clone https://github.com/BenJeau/uozoneCalendar
```
Then install the node.js dependencies before being able to run the node.js code
```
cd uozoneCalendar
npm install
```
Once its done downloading/installing, for now, you'll need to write your uoZone username (without the @uottawa.ca) and your password in constants in _index.js_ named USERNAME and PASSWORD respectfully. Then to run the code type
```
node .
```
Once the code is finished, the data will be located at the root of the folder in the file named _data.json_. The data's JSON schema file in the file named [jsonSchema.json](https://github.com/BenJeau/uozoneCalendar/blob/master/jsonSchema.json) and you can visualise the file with [_docson_](https://www.npmjs.com/package/docson) on the webpage [here](http://lbovet.github.io/docson/index.html#https://raw.githubusercontent.com/BenJeau/uozoneCalendar/master/jsonSchema.json).

## Steps the program takes
1. Logs in to [uoZone's website](https://uozone2.uottawa.ca/)
2. Goes to a [link](https://www.uocampus.uottawa.ca/psc/csprpr9www/EMPLOYEE/HRMS/c/SA_LEARNER_SERVICES.SSR_SSENRL_LIST.GBL?languageCd=ENG), to get access to that portion of the web application
3. Then it goes to inner frame of the last webpage to be able to easily control the DOM of the webpage and starts the extraction process by injecting some javascript code in the webpage to manipulate the DOM

#### Note: not affiliate with the University of Ottawa
