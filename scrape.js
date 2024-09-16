const puppeteer = require('puppeteer');
const fs = require('fs').promises;

(async () => {
  // Launch a new browser session
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Navigate to the page
  await page.goto('https://www.visa.com.vn/vi_vn/visa-offers-and-perks/', {
    waitUntil: 'networkidle0',
  });

  // Wait for the specific element that indicates the page has loaded
  await page.waitForSelector('.vs-background-default');

  // Extract the content
  const offers = await page.evaluate(async () => {
    const scrapedData = [];
    // Query the document for the specific elements containing the offers
    document
      .querySelectorAll('[data-area="offer_list_container"]')
      .forEach((offerElement) => {
        offerElement
          .querySelector('ul')
          .querySelectorAll('li')
          .forEach((item) => {
            const imgSrc = item.querySelector('img').src;
            const title = item.querySelector('h2').innerText;
            const description =
              item.querySelector('a>p.vs-description').innerText;
            const link = item.querySelector('a').href;
            scrapedData.push({ title, description, imgSrc, link });
          });
      });
    console.log('scrapedData: ', scrapedData);
    return scrapedData;
  });

  // fs.writeFile('src/data/vi/html-raw.txt', offers, (err) => {
  //   if (err) {
  //     console.error(err);
  //   } else {
  //     // file written successfully
  //   }
  // });

  console.log('offers: ', offers);

  // Save to Strapi or handle data as needed here
  await writeDataToFile({
    data: offers,
    path: 'src/data/vi',
    fileName: 'offers',
  });
  await browser.close();
})();

async function writeDataToFile({ data, fileName, path }) {
  try {
    await fs.writeFile(
      `${path}/${fileName}.json`,
      JSON.stringify(data, null, 2),
      'utf-8'
    );
    console.log('Data successfully written to file');
  } catch (error) {
    console.error('Failed to write data to file:', error);
  }
}
