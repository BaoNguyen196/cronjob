const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");
const {
  getOffers: getDummyOffers,
  getDetail: getDummyDetail,
} = require("./utils");

const acceptCookies = async (page) => {
  const cookieSelector =
    "#CookieReportsBanner .wscrBannerContentInner a:first-child";
  await page
    .waitForSelector(cookieSelector, { timeout: 5000 })
    .catch((e) => console.log("Cookie banner not found."));
  await page
    .click(cookieSelector)
    .catch((e) => console.log("Failed to click cookie accept button."));
};

const getOffers = async () => {
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
  acceptCookies(page);

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
      const data = {
        title: item.querySelector("h2").innerText.trim(),
        description: item.querySelector("a>p.vs-description").innerText,
        imgSrc: item.querySelector("img").src,
        detailUrl: item.querySelector("a").href,
        id: item
          .querySelector("h2")
          .innerText.toLocaleLowerCase()
          .trim()
          .replace(/ /g, "-"),
      };
      scrapedData.push(data);
    });
    return scrapedData;
  });
  await browser.close();

  return offers;
};

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

const getDetailOffer = async (offer) => {
  const page = await global.browser.newPage();
  try {
    await page.goto(offer.detailUrl, { waitUntil: "networkidle2" });
    acceptCookies(page);
    await page.waitForSelector("h2.vs-h3");
    const validityContent = await page.evaluate(() => {
      const perkElement = document.querySelector("vs-perk-validity");
      return perkElement ? perkElement.textContent : null;
    });

    const detailContent = await page.evaluate(() => {
      const element = document.querySelector("vs-perk-details");
      const computedStyle = window.getComputedStyle(element);
      let styles = {};
      // Iterate over all the properties in the computed style
      for (let i = 0; i < computedStyle.length; i++) {
        const prop = computedStyle[i];
        styles[prop] = computedStyle.getPropertyValue(prop);
      }
      const styleContent = JSON.stringify(styles);
      if (element && styles) {
        return { html: element.outerHTML, styles: styleContent };
      }
      return null;
    });
    return {
      [offer.id]: {
        detail: detailContent,
        validity: validityContent,
        id: offer.id,
      },
    };
  } catch (error) {
    console.error(`Failed to get detail for ${url}:`, error);
  } finally {
    await page.close();
  }
};

const getFullData = async () => {
  global.browser = await puppeteer.launch();
  try {
    const offers = await getOffers();
    const detailPromises = offers.map((offer) => getDetailOffer(offer));
    const results = await Promise.all(detailPromises);
    await writeDataToFile({
      data: results.reduce((acc, item) => ({ ...acc, ...item }), {}),
      fileName: "detail",
      path: path.join(__dirname, "src", "data"),
    });
  } catch (error) {
    console.error("Failed to fetch:", error);
  } finally {
    await global.browser.close();
  }
};

getFullData();

const displayData = async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(
    "https://developer.mozilla.org/en-US/docs/Web/Performance/Critical_rendering_path",
    { waitUntil: "networkidle2" }
  );

  await page.waitForSelector("#content");
  await page.evaluate(() => {
    const data = getDummyDetail();
    const content = document.querySelector("#content");
    const contentElement = document.createElement("div");
    contentElement.innerHTML = data.content;
    content.appendChild(contentElement);
  });
};
