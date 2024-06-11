const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { exec } = require("child_process");
const cron = require("node-cron");
require("dotenv").config();
const fs = require("fs")
const app = express();

const AWS = require("aws-sdk")

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const s3 = new AWS.S3({
    accessKeyId: process.env.I_AM_ACCESS_KEY,
    secretAccessKey: process.env.I_AM_SECRET_KEY,
    region: process.env.REGION,
  });

let fileName;
const runAt12amEveryNight = async () => {
   fileName = `$database${Math.random()}`
    const host = process.env.DB_ENDPOINT;
    const username = process.env.DB_USERNAME;
    const port  = process.env.DB_PORT;
    const databasename = process.env.DB_NAME;
    const password = process.env.DB_PASSWORD

    exec(`mysqldump -h ${host} -P${port} -u ${username} -p${password} ${databasename}> ${fileName}.sql`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing command: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Error: ${stderr}`);
            return;
        }
        console.log(`Database backup successful: ${stdout}`);
    });
};

// Schedule the task to run every night at 12 AM

cron.schedule("0 0 * * *", runAt12amEveryNight);
runAt12amEveryNight();

setTimeout(()=>{
    fs.readFile(`${fileName}.sql`, (err, data) => {
        if (err) {
            console.error(`Error reading file: ${err.message}`);
            return;
        }
        
        const imageParams = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `backups/database${Math.random()}`,
            Body: data,
        };
        
        s3.upload(imageParams, (err, data) => {
            if (err) {
                console.error(`Error uploading file to S3: ${err.message}`);
                return;
            }
            console.log(`File uploaded successfully. ${data.Location}`);
        });
    });
},6000)

app.listen(4000, () => {
    console.log("Listening to port 4000");
});
