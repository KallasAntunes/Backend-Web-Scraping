//Imports needed dependencies
const express = require('express');
const joi = require('joi');

//Express code
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}...`));

//Connects to a mongodb database
const MongoClient = require('mongodb').MongoClient;
const url = "mongodb://localhost/";

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
            if (result.length > 0) return res.status(303).send("Email taken, please choose a different email or sing in instead.")
            db.close();
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
            if(result) return res.status(201).send(result)
            return res.status(400).send("Invalid information, please try again or sign up.")
        });
    });
});