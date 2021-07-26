//Imports needed dependencies
const puppeteer = require('puppeteer');
const express = require('express');

const app = express();
app.use(express.json());
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}...`));

//Connects to a mongodb database
const MongoClient = require('mongodb').MongoClient;
const url = `mongodb://localhost/`;


//List of all Lenovo laptops
app.get('/api/laptops', (req, res) => {
    getLaptopsList().then(laptopsList => {
        MongoClient.connect(url, (err, db) => {
            if (err) throw err;
            const dbo = db.db("mydb");
            //Inserts the data in this database
            dbo.collection("lenovoLaptops").insertMany(laptopsList, (err, res) => {
                if (err) throw err;
                console.log("Data succesfully saved!");
                db.close();
            });
        });
        res.send(laptopsList);
    });
});

//Detailed data from a specific laptop
app.get('/api/laptops/:id', (req, res) => {
    MongoClient.connect(url, (err, db) => {
        if (err) throw err;
        const dbo = db.db("mydb");
        //Select the data from the database
        dbo.collection("lenovoLaptops").find({ id: + req.params.id }).toArray((err, selectedLaptop) => {
            if (err) throw err;
            db.close();
            //Sends the selected laptop to getLaptopDetails and sends the result
            getLaptopDetails(selectedLaptop).then(laptopDetails => { res.send(laptopDetails) });
        });
    });
});

const getLaptopsList = async () => {
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

        //Array with all the previously gathered information
        const laptopList = [];
        let j = 0;
        modelList.forEach(({ model }, i) => {
            //Checks if first word of model is Lenovo
            if (model.substr(0, model.indexOf(" ")) === "Lenovo")
                laptopList.push({
                    id: ++j,
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

const getLaptopDetails = async (selectedLaptop) => {

    //Puppeteer code
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://webscraper.io/test-sites/e-commerce/allinone/computers/laptops');
    await page.addScriptTag({ url: 'https://code.jquery.com/jquery-3.2.1.min.js' }); //Adding jquery for easier DOM manipulation

    //Opens the browser and extracts data about all the Lenovo laptops
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

        return laptopList;
    });

    //Closes browser
    await browser.close();
    return laptopList.filter(({ model, price }) => {
        return model === selectedLaptop[0].model && price === selectedLaptop[0].price;
    })[0];
};
