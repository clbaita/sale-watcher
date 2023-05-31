import { parentPort } from "node:worker_threads";
import process from "node:process";
import axios from "axios";
import cheerio from "cheerio";
import * as fs from "fs";
import path from "node:path";
import { Url } from "../types";
import { MailDataRequired } from "@sendgrid/mail";
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY ?? "");

const getUrls = () => {
  try {
    const jsonString = fs.readFileSync(
      path.join(process.cwd(), "src/data/data.json"),
      "utf-8"
    );
    const jsonData: Url[] = JSON.parse(jsonString);
    return jsonData;
  } catch (err) {
    console.error(err);
  }
};

const getDiscountPercent = (originalPrice: number, newPrice: number) => {
  return ((originalPrice - newPrice) / originalPrice) * 100;
};

const fetchData = async (url: string) => {
  // Make http call to url
  const response = await axios(url);

  if (response?.status !== 200) {
    console.log("Error occurred while fetching data");
    return;
  }
  return response.data;
};

const scrape = async () => {
  const urls = getUrls();

  if (!urls) {
    return;
  }

  const updatedPrices = await Promise.all(
    urls.map(async (url): Promise<Url> => {
      const data = await fetchData(url.link);

      if (!data) {
        return url;
      }

      const html = data;
      const $ = cheerio.load(html);
      const priceString = $(url.cssClass)
        .text()
        .trim()
        .split("$")
        .filter(Boolean)[0];

      const price = parseFloat(priceString); // TODO handle if this is NaN

      if (url.price && price < url.price) {
        const msg: MailDataRequired = {
          to: process.env.EMAIL_TO as string, // TODO: as string here is no good, build in multiple email support later.
          from: process.env.EMAIL_FROM as string, // TODO: as string here is no good, need to figure out what to put here.
          subject: "Price Drop Alert",
          text: `The price of ${url.link} has dropped below $${
            url.price
          }!\n\nIt is now $${price} which is a %${getDiscountPercent(
            url.price,
            price
          ).toFixed(2)} discount!`,
          html: `<strong>The price of ${url.link} has dropped below $${
            url.price
          }!</strong>\n\n<p>It is now $${price} which is a <i>%${getDiscountPercent(
            url.price,
            price
          ).toFixed(2)}<i> discount!<p>`,
        };
        await sgMail.send(msg);
      }

      return {
        ...url,
        price: price,
      };
    })
  );

  try {
    // Write updatedPrices back to data.json
    fs.writeFileSync(
      path.join(process.cwd(), "src/data/data.json"),
      JSON.stringify(updatedPrices, null, 2)
    );
  } catch (err) {
    console.error(err);
  }

  // Signal to parent that the job is done
  if (parentPort) {
    parentPort.postMessage("Done!");
  } else {
    process.exit(0);
  }
};

scrape();
