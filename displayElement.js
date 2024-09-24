const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");
const {
  getOffers: getDummyOffers,
  getDetail: getDummyDetail,
} = require("./utils");

const displayData = async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(
    "https://developer.mozilla.org/en-US/docs/Web/Performance/Critical_rendering_path",
    { waitUntil: "networkidle2" }
  );

  await page.waitForSelector("#content");
  const data = await getDummyDetail();

  await page.evaluate((inputData) => {
    const content = document.querySelector("#content");
    const contentElement = document.createElement("div");
    contentElement.innerHTML = inputData.html;
    const styleObject = JSON.parse(inputData.styles);
    Object.entries(styleObject).forEach(([key, value]) => {
      contentElement.style[key] = value;
    });

    // Append the style element to the head of the document
    content.appendChild(contentElement);
    contentElement.scrollIntoView();
  }, data);
};

displayData();
