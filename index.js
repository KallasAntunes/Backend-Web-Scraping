"use strict";
//Imports needed dependencies
const puppeteer = require('puppeteer');
const express = require('express');
const joi = require('joi');
var ObjectId = require('mongodb').ObjectId;

//Express code
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Listening on port ${port}...`));

//Connects to a mongodb database
const MongoClient = require('mongodb').MongoClient;
const url = `mongodb://localhost/`;

/*****************************************laptop.js*******************************************/
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
        res.status(200).send(laptopsList);
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
                getLaptopDetails(selectedLaptop).then(laptopDetails => { res.status(200).send(laptopDetails) });
            else res.status(400).send("Incorrect ID. Check the possible IDs at api/laptops");
        });
    });
});

app.delete('/api/laptops/:_id', (req, res) => {
    MongoClient.connect(url, (err, db) => {
        if (err) {
            res.status(500).send("Sorry, something is wrong internally.")
            throw err;
        }
        const dbo = db.db("webCrawling");
        //Delete the laptop from the database
        dbo.collection("lenovoLaptops").deleteOne({ _id: req.params._id }, (err, result) => {
            if (err) {
                res.status(500).send("Sorry, something is wrong internally.")
                throw err;
            }
            db.close();
            //Sends the selected laptop to getLaptopDetails and sends the result
            if (res)
                res.status(200).send(result);
            else res.status(400).send("Incorrect ID. Check the possible IDs at api/laptops");
        });
    });
})

app.put('/api/laptops/', (req, res) => {
    //Validates if input is compliant with minimum requirements
    const laptop = joi.validate(req.body, {
        _id: joi.string().length(3).regex(/^[0-9]+$/).required(),
        model: joi.string().required(),
        storage: joi.object().keys({
            basePrice: joi.string(),
            _128GB: joi.object().keys({
                available: joi.boolean(),
                price: joi.string()
            }),
            _256GB: joi.object().keys({
                available: joi.boolean(),
                price: joi.string()
            }),
            _512GB: joi.object().keys({
                available: joi.boolean(),
                price: joi.string()
            }),
            _1024GB: joi.object().keys({
                available: joi.boolean(),
                price: joi.string()
            }),
        }),
        description: joi.string().required(),
        rating: joi.number().positive().min(1).max(5).required(),
        reviews: joi.string().regex(/^[0-9]+$/).required(),
        photo: joi.string().uri(),
    });
    if (laptop.error) return res.status(400).send(laptop.error.details)
    res.status(200).send(laptop.value);
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
            basePrice: price128,
            "_128GB": {
                available: !$("button[value='128']").hasClass("disabled"),
                price: price128,
            },
            "_256GB": {
                available: !$("button[value='256']").hasClass("disabled"),
                price: price256,
            },
            "_512GB": {
                available: !$("button[value='512']").hasClass("disabled"),
                price: price512,
            },
            "_1024GB": {
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
/*****************************************user.js*******************************************/
//User sign up
app.post('/api/user/signup', (req, res) => {

    //Validates if input is compliant with minimum requirements
    const user = joi.validate({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
    }, {
        name: joi.string().min(3).required(),
        password: joi.string().min(8).required(),
        email: joi.string().email().required()
    });
    if (user.error) return res.status(400).send(user.error.details[0].message)

    //Database operations
    MongoClient.connect(url, (err, db) => {

        if (err) {
            res.status(500).send("Sorry, something is wrong internally.")
            throw err;
        }
        const dbo = db.db("webCrawling");

        //Checks if email already exists in database
        dbo.collection("users").find({ email: req.body.email }).toArray((err, result) => {

            if (err) {
                res.status(500).send("Sorry, something is wrong internally.")
                throw err;
            }
            db.close();

            if (result.length > 0) return res.status(303).send("Email taken, please choose a different email or sing in instead.")

            //If email is available, creates new user
            MongoClient.connect(url, (err, db) => {

                if (err) {
                    res.status(500).send("Sorry, something is wrong internally.")
                    throw err;
                }
                const dbo = db.db("webCrawling");

                dbo.collection("users").insertOne(user.value, (err) => {

                    if (err) {
                        res.status(500).send("Sorry, something is wrong internally.")
                        throw err;
                    }
                    db.close();

                    //Sends back user information with its new generated ID
                    res.status(201).send(user.value)
                });
            });
        });
    });
});

//User sign in
app.post('/api/user/signin', (req, res) => {

    //Validates if input is compliant with minimum requirements
    const user = joi.validate({
        email: req.body.email,
        password: req.body.password,
    }, {
        password: joi.string().min(8).required(),
        email: joi.string().email().required()
    });
    if (user.error) return res.status(400).send(user.error.details[0].message)

    //Checks if user email and password are correct
    MongoClient.connect(url, (err, db) => {

        if (err) {
            res.status(500).send("Sorry, something is wrong internally.")
            throw err;
        }
        const dbo = db.db("webCrawling");

        dbo.collection("users").findOne(user.value, (err, result) => {

            if (err) {
                res.status(500).send("Sorry, something is wrong internally.")
                throw err;
            }
            db.close();

            //If email and password were correct, send user information back
            if (result) return res.status(201).send(result)
            return res.status(400).send("Invalid information, please try again.")

        });
    });
});

//Checkout
app.post('/api/user/checkout', (req, res) => {

    //Validates if input is compliant with minimum requirements
    const checkout = joi.validate(req.body, {
        userId: joi.string().alphanum().length(24).required(),
        products: joi.array().items({
            id: joi.number().positive().required(),
            amount: joi.number().positive().max(1000)
        })
    });
    if (checkout.error) return res.status(400).send(checkout.error.details[0].message)

    //Checks if user Id exists
    MongoClient.connect(url, (err, db) => {

        if (err) {
            res.status(500).send("Sorry, something is wrong internally.")
            throw err;
        }
        const dbo = db.db("webCrawling");
        dbo.collection("users").findOne({ _id: ObjectId(checkout.value.userId) }, (err, result) => {

            if (err) {
                res.status(500).send("Sorry, something is wrong internally.")
                throw err;
            }
            db.close();

            //Stops code if user ID is incorrect
            if (!result) return res.status(400).send("Invalid user ID.")

            //Checks if product IDs exist
            const productIds = checkout.value.products.map(({ id }) => ({ _id: id.toString() }));
            MongoClient.connect(url, (err, db) => {

                if (err) {
                    res.status(500).send("Sorry, something is wrong internally.")
                    throw err;
                }
                const dbo = db.db("webCrawling");
                dbo.collection("lenovoLaptops").find({ $or: productIds }).toArray((err, data) => {
                    if (err) {
                        res.status(500).send("Sorry, something is wrong internally.")
                        throw err;
                    }
                    db.close();

                    //Checks if all the laptop ids received were found in the database
                    if (data.length !== productIds.length) return res.status(400).send("One or more Laptop IDs were incorrect.")
                    res.status(201).send("Information is valid.");
                });
            });
        });
    });
});
