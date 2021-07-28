"use strict";
//Imports needed dependencies
const puppeteer = require('puppeteer');
const express = require('express');

//Express code
const app = express();
//app.use(express.json());
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}...`));

//Connects to a mongodb database
const MongoClient = require('mongodb').MongoClient;
const url = `mongodb://localhost/`;

//List of all Lenovo laptops
app.get('/api/laptops', (req, res) => {
    getLaptopsList().then(laptopsList => {
        MongoClient.connect(url, (err, db) => {
            if (err) {
                res.status(500).send("Sorry, something is wrong internally.")
                throw err;
            }
            const dbo = db.db("webCrawling");
            //Drops the database before inserting the data to avoid duplicates
            dbo.collection("lenovoLaptops").drop(laptopsList, (err, res) => {
                console.log("Data succesfully saved!");
                db.close();
            });
            //Inserts the data in this database
            dbo.collection("lenovoLaptops").insertMany(laptopsList, (err, res) => {
                if (err) {
                    res.status(500).send("Sorry, something is wrong internally.")
                    throw err;
                }
                console.log("Data succesfully saved!");
                db.close();
            });
        });
        res.status(200).send("<pre>" + JSON.stringify(laptopsList, null, 2) + "</pre>");
    });
});

//Detailed data from a specific laptop
app.get('/api/laptops/:_id', (req, res) => {
    MongoClient.connect(url, (err, db) => {
        if (err) {
            res.status(500).send("Sorry, something is wrong internally.")
            throw err;
        }
        const dbo = db.db("webCrawling");
        //Select the data from the database
        dbo.collection("lenovoLaptops").find({ _id: req.params._id }).toArray((err, [selectedLaptop]) => {
            if (err) {
                res.status(500).send("Sorry, something is wrong internally.")
                throw err;
            }
            db.close();
            //Sends the selected laptop to getLaptopDetails and sends the result
            if (selectedLaptop)
                getLaptopDetails(selectedLaptop).then(laptopDetails => { res.status(200).send("<pre>" + JSON.stringify(laptopDetails, null, 2) + "</pre>") });
            else res.status(401).send("Incorrect ID. Check the possible IDs at api/laptops");
        });
    });
});

//List crawling method
const getLaptopsList = async () => {
    //Puppeteer code
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://webscraper.io/test-sites/e-commerce/allinone/computers/laptops');
    await page.addScriptTag({ url: 'https://code.jquery.com/jquery-3.2.1.min.js' }); //Adding jquery for easier DOM manipulation

    //Opens the browser, extracts the data and stores it as 'laptopList'
    const laptopList = await page.evaluate(() => {

        //Laptop model
        const modelList = [...$('.title')].map(({ title, href }) => ({ _id: href.slice(href.lastIndexOf("/") + 1), model: title }));
        //Laptop price
        const priceList = [...$('.price')].map(({ innerText }) => ({ price: innerText }));

        //Array with all the previously gathered information
        const laptopList = [];
        modelList.forEach(({ model, _id }, i) => {
            //Checks if first word of model is Lenovo
            if (model.substr(0, model.indexOf(" ")) === "Lenovo")
                laptopList.push({
                    _id,
                    model,
                    price: priceList[i].price,
                });
        });

        //Sorting array by ascending order of price
        return laptopList.sort((a, b) => (+ a.price.substring(1) > + b.price.substring(1)) ? 1 : -1);
    });

    //Closes browser
    await browser.close();
    return laptopList;
};

//Details crawling method
const getLaptopDetails = async (selectedLaptop) => {

    //Puppeteer code
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(`https://webscraper.io/test-sites/e-commerce/allinone/product/${selectedLaptop._id}`);

    await page.addScriptTag({ url: 'https://code.jquery.com/jquery-3.2.1.min.js' }); //Adding jquery for easier DOM manipulation

    //Opens the browser and extracts data about all the Lenovo laptops
    const laptopDetails = await page.evaluate(() => {

        //The price of each storage option
        const price128 = $(".price").text();
        $("button[value='256']").trigger("click");
        const price256 = $(".price").text();
        $("button[value='512']").trigger("click");
        const price512 = $(".price").text();
        $("button[value='1024']").trigger("click");
        const price1024 = $(".price").text();

        const storage = {
            "128GB": {
                available: !$("button[value='128']").hasClass("disabled"),
                price: price128,
            },
            "256GB": {
                available: !$("button[value='256']").hasClass("disabled"),
                price: price256,
            },
            "512GB": {
                available: !$("button[value='512']").hasClass("disabled"),
                price: price512,
            },
            "1024GB": {
                available: !$("button[value='1024']").hasClass("disabled"),
                price: price1024,
            },
        }

        return [
            $("h4").not(".price").text(),
            storage,
            $(".description").text(),
            $(".glyphicon-star").length,
            $('.ratings p').text().charAt(10),
            "https://webscraper.io/" + $("img.img-responsive").attr("src"),
        ];
    });
    //Closes browser
    await browser.close();
    return {
        _id: selectedLaptop._id,
        model: laptopDetails[0],
        storage: laptopDetails[1],
        description: laptopDetails[2],
        rating: laptopDetails[3],
        reviews: laptopDetails[4],
        photo: laptopDetails[5],
    };
};
