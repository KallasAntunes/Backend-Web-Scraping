//Imports needed dependencies
const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    //Puppeteer code
    const browser = await puppeteer.launch({ devtools: true });
    const page = await browser.newPage();
    await page.goto('https://webscraper.io/test-sites/e-commerce/allinone/computers/laptops');

    //Opens the browser, extracts the data and stores it as 'laptopList'
    const laptopList = await page.evaluate(() => {

        const laptopList = [];

        const modelList = [...document.querySelectorAll('.title')].map( ({title}) => ({ model: title }));

        const priceList = [...document.querySelectorAll('.price')].map( ({innerText}) => ({ price: innerText }));

        modelList.forEach( ({model}, i) => {
            laptopList.push({
                model,
                price: priceList[i].price,
            });
        });
        console.log(laptopList);

        return laptopList
    });
    /*
    //Creates a JSON file with the extracted data
    fs.writeFile('lenovoLaptops.json', JSON.stringify(laptopList, null, 1), err => {
        if(err) throw new Error("Sorry, something doesn't seem to be working :/");
        console.log("JSON file succesfully created!");
    });
    
    //Closes browser
    await browser.close();
    */
})();