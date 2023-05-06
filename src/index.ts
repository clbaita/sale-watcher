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
    console.log("Crawling data...")
    // make http call to url
    const response = await axios(url).catch((err) => console.log(err));

    if(response?.status !== 200){
        console.log("Error occurred while fetching data");
        return;
    }
    return response;
}

const urls = getUrls()

fetchData(urls[0].link).then((res) => {
    
    if (!res) { return }

    const html = res.data
    const $ = cheerio.load(html)
    const price = $(urls[0].cssClass).text()
        .trim()
        .split("$")
        .filter(Boolean)[0]
    console.log(price)
})