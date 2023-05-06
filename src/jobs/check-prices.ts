import { parentPort } from "node:worker_threads";
import process from "node:process";
import axios from "axios";
import cheerio from "cheerio";

const getUrls = () => {
    return [
        { 
          link: "https://www.amazon.com.au/Gigabyte-GeForce-Gaming-V2-Graphics/dp/B096Y2TYKV/",
          cssClass: ".a-box-group span.a-price span.a-offscreen"
        }
    ]
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
    
    const data = await fetchData(urls[0].link)
    
    if (!data) { return }

    const html = data
    const $ = cheerio.load(html)
    const price = $(urls[0].cssClass).text()
        .trim()
        .split("$")
        .filter(Boolean)[0]
    
    // Signal to parent that the job is done
    if (parentPort) {
        parentPort.postMessage(price)
    }
    else {
        process.exit(0)
    }
}

scrape()