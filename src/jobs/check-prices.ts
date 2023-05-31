import { parentPort } from "node:worker_threads";
import process from "node:process";
import axios from "axios";
import cheerio from "cheerio";
import * as fs from 'fs';
import path from "node:path";
import { Url } from "../types";

const getUrls = () => {
    try {
        const jsonString = fs.readFileSync(path.join(process.cwd(), "src/data/data.json"), "utf-8");
        const jsonData: Url[] = JSON.parse(jsonString);
        
        return jsonData;
    } catch (err) {
        console.error(err);
    }
}

const fetchData = async (url: string) => {
    // make http call to url
    const response = await axios(url)

    if(response?.status !== 200){
        console.log("Error occurred while fetching data");
        return;
    }
    return response.data;
}

const scrape = async () => {
    const urls = getUrls()
    
    if (!urls) { return }

    const updatedPrices = await Promise.all(urls.map(async (url): Promise<Url> => {
        const data = await fetchData(url.link)

        if (!data) { return { ...url }}

        const html = data
        const $ = cheerio.load(html)
        const price = $(urls[0].cssClass).text()
            .trim()
            .split("$")
            .filter(Boolean)[0]
        
        return {
            ...url,
            price: parseFloat(price)
        }
    }))

    try {
        // Write updatedPrices back to data.json
        fs.writeFileSync(path.join(process.cwd(), "src/data/data.json"), JSON.stringify(updatedPrices, null, 2))
    } catch (err) {
        console.error(err);
    }
    
    // Signal to parent that the job is done
    if (parentPort) {
        parentPort.postMessage("Done!")
    }
    else {
        process.exit(0)
    }
}

scrape()