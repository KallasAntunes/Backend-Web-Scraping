//Imports needed dependencies
const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    //Puppeteer code
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://webscraper.io/test-sites/e-commerce/allinone/computers/laptops');
    await page.addScriptTag({ url: 'https://code.jquery.com/jquery-3.2.1.min.js' }); //Adding jquery for easier DOM manipulation

    //Opens the browser, extracts the data and stores it as 'laptopList'
    const laptopList = await page.evaluate(() => {

        //Laptop model
        const modelList = [...$('.title')].map(({ title }) => ({ model: title }));
        //Laptop price
        const priceList = [...$('.price')].map(({ innerText }) => ({ price: innerText }));
        //Laptop description
        const descriptionList = [...$('.description')].map(({ innerText }) => ({ description: innerText }));
        //Laptop rating
        const ratingList = [...$('.ratings p:odd')].map(({ dataset }) => ({ rating: dataset.rating }))
        //Laptop reviews
        const reviewsList = [...$('.ratings p:even')].map(({ innerText }) => ({ reviews: innerText.substr(0, innerText.indexOf(" ")) }))

        //Array with all the previously gathered information
        const laptopList = [];
        modelList.forEach(({ model }, i) => {
            //Checks if first word of model is Lenovo
            if (model.substr(0, model.indexOf(" ")) === "Lenovo")
                laptopList.push({
                    model,
                    price: priceList[i].price,
                    description: descriptionList[i].description,
                    rating: ratingList[i].rating,
                    reviews: reviewsList[i].reviews,
                });
        });
        console.log(laptopList);

        //Sorting array by ascending order of price
        laptopList.sort((a, b) => (+ a.price.substring(1) > + b.price.substring(1)) ? 1 : -1);

        return laptopList
    });

    //Connects to a mongodb database
    const MongoClient = require('mongodb').MongoClient;
    const url = "mongodb://localhost:27017/";

    MongoClient.connect(url, function (err, db) {

        if (err) throw err;
        const dbo = db.db("mydb");

        //Inserts the data in this database
        dbo.collection("lenovoLaptops").insertMany(laptopList, function (err, res) {
            if (err) throw err;
            console.log("Data succesfully saved!");
            db.close();
        });

    });

    //Closes browser
    await browser.close();

})();
