const puppeteer = require("puppeteer");
const fs = require("fs").promises;

(async () => {
  // Launch a new browser session
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Navigate to the page
  await page.goto(
    "https://www.visa.com.vn/vi_vn/visa-offers-and-perks/?cardProduct=15&paymentType=9&redemptionCountry=240",
    {
      waitUntil: "networkidle0",
    }
  );

  await page.waitForSelector('[data-area="offer_list_container"]');
  await page
    .locator("#CookieReportsBanner .wscrBannerContentInner a:first-child")
    .click();

  const offers = await page.evaluate(async () => {
    const scrapedData = [];
    // Query the document for the specific elements containing the offers
    const offerElement = document.querySelector(
      '[data-area="offer_list_container"]'
    );
    if (!offerElement) return scrapedData;

    const waitFor = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // Function to detect changes in the number of items
    const waitForListUpdate = async (previousLength) => {
      for (let i = 0; i < 10; i++) {
        // Try up to 10 times
        await waitFor(500); // Wait for 500 ms
        const currentItems = offerElement.querySelectorAll("ul > li");
        if (currentItems.length > previousLength) return; // If new items are added, exit the loop
      }
      throw new Error("Timeout waiting for more items to load");
    };

    let offersEle = offerElement.querySelectorAll("ul > li");

    while (true) {
      offersEle[offersEle.length - 1].scrollIntoView();
      const currentLength = offersEle.length;
      try {
        await waitForListUpdate(currentLength);
        offersEle = offerElement.querySelectorAll("ul > li"); // Refresh the list of offers
      } catch (error) {
        console.error(error.message);
        break; // Exit the loop if no new items are loaded
      }
    }

    offersEle.forEach((item) => {
      const imgSrc = item.querySelector("img").src;
      const title = item.querySelector("h2").innerText;
      const description = item.querySelector("a>p.vs-description").innerText;
      const link = item.querySelector("a").href;
      scrapedData.push({ title, description, imgSrc, link });
    });
    return scrapedData;
  });

  console.log("offers: ", offers);
  console.log("offers.length: ", offers.length);

  // Save to Strapi or handle data as needed here
  await writeDataToFile({
    data: offers,
    path: "src/data/vi",
    fileName: "offers",
  });
  await browser.close();
})();

async function writeDataToFile({ data, fileName, path }) {
  try {
    await fs.writeFile(
      `${path}/${fileName}.json`,
      JSON.stringify(data, null, 2),
      "utf-8"
    );
    console.log("Data successfully written to file");
  } catch (error) {
    console.error("Failed to write data to file:", error);
  }
}
