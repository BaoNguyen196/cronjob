const fs = require("fs").promises;
const path = require("path");

export const getOffers = async () => {
  try {
    const filePath = path.join(__dirname, "offers.json");
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to load or parse offer data:", error);
  }
};

export const getDetail = async () => {
  try {
    const filePath = path.join(__dirname, "detail.json");
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to load or parse offer data:", error);
  }
};
